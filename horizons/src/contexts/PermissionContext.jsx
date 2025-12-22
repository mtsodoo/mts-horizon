import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fetchRolePermissions } from '@/integrations/permissions/client';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { PERMISSIONS as FALLBACK_PERMISSIONS } from '@/utils/permissions';

const PermissionContext = createContext(undefined);

// صلاحيات أساسية لا يمكن إيقافها عن المدير العام (لمنع قفل النظام)
const PROTECTED_PERMISSIONS = ['dashboard', 'permission_management', 'settings'];

// صلاحيات يتحكم فيها المدير العام لنفسه (تتبع قاعدة البيانات)
const SELF_MANAGEABLE_PERMISSIONS = [
    'can_clock_in_out',
    'can_view_salary', 
    'can_view_attendance_calendar',
    'attendance'
];

export const PermissionProvider = ({ children }) => {
    const { user, profile } = useAuth();
    const [permissions, setPermissions] = useState({});
    const [loading, setLoading] = useState(true);
    const [dbLoaded, setDbLoaded] = useState(false);
    const [error, setError] = useState(null);

    const refreshPermissions = useCallback(async () => {
        try {
            const { data, error: fetchError } = await fetchRolePermissions();

            if (fetchError) {
                console.error("Failed to sync permissions from DB:", fetchError.message);
                setError(fetchError);
                setDbLoaded(false);
                return;
            }

            const permMap = {};
            if (data && Array.isArray(data)) {
                if (data.length === 0) {
                    console.warn("Warning: Permission table is empty.");
                    setDbLoaded(false);
                } else {
                    data.forEach(p => {
                        permMap[`${p.role}:${p.page_key}`] = p.can_access;
                    });
                    setDbLoaded(true);
                }
            } else {
                console.warn("Warning: Invalid permission data structure received", data);
                setDbLoaded(false);
            }
            
            setPermissions(permMap);
            setError(null);
        } catch (err) {
            console.error("Critical error in permission sync:", err);
            setError(err);
            setDbLoaded(false);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshPermissions();

        const intervalId = setInterval(() => {
            refreshPermissions();
        }, 5 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, [refreshPermissions]);

    const checkPermission = useCallback((requiredPermission) => {
        if (!user || !profile) return false;

        const isSuperUser = user.email === 'info@mtse.sa' || 
                           profile.role === 'general_manager' || 
                           profile.role === 'super_admin';

        // الصلاحيات المحمية - دائماً مفعلة للمدير العام
        if (isSuperUser && PROTECTED_PERMISSIONS.includes(requiredPermission)) {
            return true;
        }

        // الصلاحيات القابلة للتحكم الذاتي - تتبع قاعدة البيانات حتى للمدير العام
        if (isSuperUser && SELF_MANAGEABLE_PERMISSIONS.includes(requiredPermission)) {
            if (dbLoaded) {
                const key = `${profile.role}:${requiredPermission}`;
                if (permissions[key] !== undefined) {
                    return !!permissions[key];
                }
            }
            // إذا مش موجودة في DB، ارجع true كافتراضي
            return true;
        }

        // باقي الصلاحيات للمدير العام - دائماً مفعلة
        if (isSuperUser) {
            return true;
        }

        // للموظفين العاديين - تحقق من قاعدة البيانات
        if (dbLoaded) {
            const key = `${profile.role}:${requiredPermission}`;
            if (permissions[key] !== undefined) {
                return !!permissions[key];
            }
            return false;
        }

        // Fallback إذا قاعدة البيانات ما اشتغلت
        const allowedRoles = FALLBACK_PERMISSIONS[requiredPermission];
        if (!allowedRoles) return false;
        return allowedRoles.includes(profile.role);

    }, [user, profile, permissions, dbLoaded]);

    return (
        <PermissionContext.Provider value={{ 
            permissions, 
            loading, 
            error,
            checkPermission,
            refreshPermissions 
        }}>
            {children}
        </PermissionContext.Provider>
    );
};

export const usePermission = () => {
    const context = useContext(PermissionContext);
    if (context === undefined) {
        throw new Error('usePermission must be used within a PermissionProvider');
    }
    return context;
};