
import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, Search, LogOut, User, ChevronDown, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import NotificationsMenu from '@/components/NotificationsMenu';
import UserPermissionsWidget from '@/components/UserPermissionsWidget';
import Sidebar from './Sidebar';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS } from '@/utils/permissions';
import useNotificationSound from '@/hooks/useNotificationSound';
import { supabase } from '@/lib/customSupabaseClient';

const Header = () => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();
    const { playSound, playDoubleBeep } = useNotificationSound();
    const [unreadCount, setUnreadCount] = useState(0);
    const prevCountRef = useRef(0);

    // Fetch initial unread count and set up subscription
    useEffect(() => {
        if (!profile?.id) return;

        const fetchUnreadCount = async () => {
            try {
                const { count, error } = await supabase
                    .from('notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', profile.id)
                    .eq('read', false);
                
                if (!error) {
                    setUnreadCount(count || 0);
                    prevCountRef.current = count || 0;
                }
            } catch (error) {
                console.error('Error fetching notifications:', error);
            }
        };

        fetchUnreadCount();

        // Subscribe to new notifications
        const subscription = supabase
            .channel('header-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${profile.id}`,
                },
                (payload) => {
                    setUnreadCount((prev) => {
                        const newCount = prev + 1;
                        playDoubleBeep(); // Play sound on new notification
                        return newCount;
                    });
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [profile?.id, playDoubleBeep]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const handleNotificationClick = () => {
        playSound('default');
    };

    // Generate initials
    const getInitials = (name) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white dark:bg-gray-800 px-6 shadow-sm">
            {/* Mobile Menu */}
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0 md:hidden" onClick={() => playSound('default')}>
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="right" className="p-0 w-72">
                    <Sidebar className="w-full h-full border-none" />
                </SheetContent>
            </Sheet>

            <div className="w-full flex-1 md:w-auto md:flex-none">
                <div className="relative hidden md:block">
                    <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="بحث..."
                        className="w-full rounded-lg bg-background pl-8 pr-9 md:w-[200px] lg:w-[300px]"
                    />
                </div>
            </div>

            <div className="flex flex-1 items-center justify-end gap-2 md:gap-4">
                
                {/* Permission Widget Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="relative h-9 w-9 rounded-full md:w-auto md:h-9 md:px-3 md:rounded-md border border-dashed border-slate-200 hover:border-primary/50 hover:bg-primary/5"
                            onClick={() => playSound('default')}
                        >
                            <Shield className="h-4 w-4 text-muted-foreground md:ml-2" />
                            <span className="hidden md:inline text-xs font-medium text-muted-foreground">
                                {ROLE_LABELS[profile?.role] || 'الصلاحيات'}
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80 p-0 border-0 shadow-xl">
                        <UserPermissionsWidget />
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Notifications */}
                <div onClick={handleNotificationClick}>
                    <NotificationsMenu />
                </div>

                {/* User Profile */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            variant="ghost" 
                            className="relative h-10 w-10 rounded-full md:h-auto md:w-auto md:rounded-md md:px-2 md:py-1 hover:bg-accent"
                            onClick={() => playSound('default')}
                        >
                            <div className="flex items-center gap-2">
                                <Avatar className="h-9 w-9 border">
                                    <AvatarImage src={profile?.employee_photo_url} alt={profile?.name_ar} />
                                    <AvatarFallback className="bg-primary/10 text-primary">
                                        {getInitials(profile?.name_en || profile?.name_ar)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="hidden md:flex flex-col items-start text-sm rtl:mr-2 ltr:ml-2">
                                    <span className="font-semibold">{profile?.name_ar || 'المستخدم'}</span>
                                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                                        {ROLE_LABELS[profile?.role] || profile?.role || 'موظف'}
                                    </span>
                                </div>
                                <ChevronDown className="hidden md:block h-4 w-4 text-muted-foreground opacity-50" />
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{profile?.name_ar}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {profile?.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link to="/profile" className="cursor-pointer flex items-center w-full">
                                <User className="ml-2 h-4 w-4" />
                                <span>الملف الشخصي</span>
                            </Link>
                        </DropdownMenuItem>
                        
                        {/* Direct Link to Permissions for Admins inside User Menu too */}
                        {(profile?.role === 'general_manager' || profile?.role === 'admin' || profile?.role === 'super_admin') && (
                             <DropdownMenuItem asChild>
                                <Link to="/permission-management" className="cursor-pointer flex items-center text-blue-600 focus:text-blue-700 w-full">
                                    <Shield className="ml-2 h-4 w-4" />
                                    <span>إدارة الصلاحيات</span>
                                </Link>
                            </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                            onClick={handleSignOut}
                        >
                            <LogOut className="ml-2 h-4 w-4" />
                            <span>تسجيل الخروج</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
};

export default Header;
