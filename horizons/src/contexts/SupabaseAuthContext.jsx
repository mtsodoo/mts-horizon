import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Track current session to avoid unnecessary re-renders
  const sessionRef = useRef(null);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return null;
    try {
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        console.error("Error fetching profile:", error);
        const isAuthError = error.status === 401 || error.status === 403;
        if (!isAuthError) {
             toast({
              variant: "destructive",
              title: "Profile Error",
              description: "Could not fetch user profile.",
            });
        }
        return null;
      }
      return userProfile || null;
    } catch (e) {
      console.error("Catastrophic error fetching profile:", e);
      return null;
    }
  }, [toast]);

  // Removed visibility change handler - Supabase handles this with autoRefreshToken
  
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
        try {
            const { data: { session: initialSession }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.error("Error getting session:", error);
            }

            if (mounted) {
                sessionRef.current = initialSession?.access_token;
                setSession(initialSession);
                setUser(initialSession?.user ?? null);
                
                if (initialSession?.user) {
                    const userProfile = await fetchProfile(initialSession.user.id);
                    if (mounted) setProfile(userProfile);
                }
                setLoading(false);
            }
        } catch (err) {
            console.error("Auth initialization error:", err);
            if (mounted) setLoading(false);
        }
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        // Only update state if session actually changed
        const newToken = currentSession?.access_token;
        if (newToken === sessionRef.current && event !== 'SIGNED_OUT') {
          return; // Session didn't change, skip update
        }
        
        sessionRef.current = newToken;
        setSession(currentSession);
        const currentUser = currentSession?.user;
        setUser(currentUser ?? null);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            if (currentUser) {
                if (event === 'SIGNED_IN') setLoading(true);
                
                const userProfile = await fetchProfile(currentUser.id);
                if (mounted) {
                    setProfile(userProfile);
                    if (event === 'SIGNED_IN') setLoading(false);
                }
            }
        } else if (event === 'SIGNED_OUT') {
            setProfile(null);
            setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile]);
  
  const signIn = useCallback(async (email, password) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("Sign in error:", error);
          toast({
            variant: "destructive",
            title: "Sign in Failed",
            description: error.message || "Invalid credentials. Please try again.",
          });
          return { error };
        } 
        
        toast({
            title: "Signed In!",
            description: "Welcome back!",
        });
        return { data, error: null };

    } catch (e) {
        console.error("Sign in exception:", e);
        return { error: e };
    }
  }, [toast]);

  const signOut = useCallback(async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          const isIgnorableError = 
            error.status === 403 || 
            error.code === 403 ||
            error.code === 'session_not_found' || 
            error.error_code === 'session_not_found' ||
            (error.message && error.message.includes('session_not_found')) ||
            (error.msg && error.msg.includes('Session from session_id claim'));
          
          if (!isIgnorableError) {
              console.error("Sign out error:", error);
          }
        }
    } catch (e) {
        console.warn("Sign out exception suppressed:", e);
    } finally {
        sessionRef.current = null;
        setSession(null);
        setUser(null);
        setProfile(null);
        localStorage.removeItem('supabase.auth.token');
    }
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    signIn,
    signOut,
  }), [user, session, profile, loading, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};