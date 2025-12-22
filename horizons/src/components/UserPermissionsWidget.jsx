import React from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePermission } from '@/contexts/PermissionContext';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, UserCheck } from 'lucide-react';
import { ROLE_LABELS } from '@/utils/permissions';

const UserPermissionsWidget = () => {
  const { profile } = useAuth();
  const { rolePermissions } = usePermission();
  
  // Safe calculation in case rolePermissions is undefined
  const permissions = rolePermissions || [];
  const totalPermissions = permissions.length;
  const myPermissions = permissions.filter(p => 
    p.role === profile?.role && p.can_access
  ).length;

  const progressPercentage = totalPermissions > 0 
    ? (myPermissions / totalPermissions) * 100 
    : 0;

  return (
    <div className="w-full bg-card rounded-lg overflow-hidden">
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-full">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold text-sm">حالة الصلاحيات</h3>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">الدور الحالي</span>
          <Badge variant="secondary" className="font-bold text-xs">
            {ROLE_LABELS[profile?.role] || profile?.role || 'غير محدد'}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">مستوى الوصول</span>
            <span className="font-medium">{myPermissions} / {totalPermissions}</span>
          </div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-in-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <div className="bg-accent/30 rounded p-2 text-xs text-muted-foreground flex items-start gap-2">
          <Lock className="h-3 w-3 mt-0.5 shrink-0" />
          <span>
            الصلاحيات تدار مركزياً. تواصل مع المشرف للوصول الإضافي.
          </span>
        </div>

        {profile?.role === 'admin' || profile?.role === 'general_manager' ? (
             <div className="pt-1 text-center">
                <p className="text-xs text-green-600 font-medium flex items-center justify-center gap-1">
                    <UserCheck className="h-3 w-3" />
                    لديك صلاحيات إدارية
                </p>
             </div>
        ) : null}
      </div>
    </div>
  );
};

export default UserPermissionsWidget;