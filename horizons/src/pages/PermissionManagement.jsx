
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { ShieldCheck, Save, CheckCircle2, LayoutGrid, AlertCircle } from 'lucide-react';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { usePermission } from '@/contexts/PermissionContext';
import { updatePermission } from '@/integrations/permissions/client';
import { ROLES, ROLE_LABELS, PAGE_CONFIG, PERMISSION_CATEGORIES } from '@/utils/permissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/SupabaseAuthContext';

// Extend PAGE_CONFIG to include new self-service permissions
const EXTENDED_PAGE_CONFIG = {
    ...PAGE_CONFIG,
    can_clock_in_out: { key: 'can_clock_in_out', label: 'تسجيل الحضور والانصراف', category: 'PERSONAL' },
    can_view_salary: { key: 'can_view_salary', label: 'الراتب والأداء', category: 'PERSONAL' },
    can_view_attendance_calendar: { key: 'can_view_attendance_calendar', label: 'سجل الحضور', category: 'PERSONAL' },
    supply_orders: { key: 'supply_orders', label: 'طلبات التوريد', category: 'DELIVERY_SUPPLY' },
    delivery_reports: { key: 'delivery_reports', label: 'تقارير التوصيل', category: 'DELIVERY_SUPPLY' },
    system_reports: { key: 'system_reports', label: 'تقارير النظام', category: 'SYSTEM' },
    omar_conversations: { key: 'omar_conversations', label: 'محادثات عمر', category: 'MANAGEMENT' },
    customer_portal: { key: 'customer_portal', label: 'بوابة العملاء', category: 'EXTERNAL_PORTALS' },
    delivery_portal: { key: 'delivery_portal', label: 'بوابة المندوبين', category: 'EXTERNAL_PORTALS' },
};


const PermissionManagement = () => {
    const { toast } = useToast();
    const { profile } = useAuth();
    const { permissions, refreshPermissions, checkPermission, loading } = usePermission();
    const [localPermissions, setLocalPermissions] = useState({});
    const [isUpdating, setIsUpdating] = useState(false);

    // Sync context permissions to local state
    useEffect(() => {
        setLocalPermissions(permissions);
    }, [permissions]);

    const handleToggle = async (role, pageKey, currentValue) => {
        const newValue = !currentValue;
        const key = `${role}:${pageKey}`;

        // Optimistic Update
        setLocalPermissions(prev => ({ ...prev, [key]: newValue }));

        try {
            setIsUpdating(true);
            const { error } = await updatePermission(role, pageKey, newValue);
            if (error) throw error;
            
            // Background refresh to ensure consistency
            refreshPermissions();
        } catch (error) {
            // Revert on error
            setLocalPermissions(prev => ({ ...prev, [key]: currentValue }));
            toast({
                variant: "destructive",
                title: "خطأ في التحديث",
                description: "لم نتمكن من حفظ تغيير الصلاحية.",
            });
        } finally {
            setIsUpdating(false);
        }
    };

    if (loading) return <div className="p-8 text-center">جاري تحميل الصلاحيات...</div>;
    
    if (!checkPermission('permission_management')) {
        return (
             <div className="p-8 flex justify-center items-center h-[60vh]">
                <Alert variant="destructive" className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>وصول مرفوض</AlertTitle>
                    <AlertDescription>ليس لديك صلاحية للوصول إلى هذه الصفحة.</AlertDescription>
                </Alert>
             </div>
        );
    }

    // Group pages by category for the matrix using the extended config
    const pagesByCategory = Object.entries(EXTENDED_PAGE_CONFIG).reduce((acc, [key, config]) => {
        if (!acc[config.category]) acc[config.category] = [];
        acc[config.category].push({ key, ...config });
        return acc;
    }, {});

    const roleColumns = Object.values(ROLES).filter(r => r !== 'super_admin'); // Hide super_admin as they usually have full access by default/policy

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1920px] mx-auto">
            <Helmet>
                <title>إدارة الصلاحيات | نظام ERP</title>
            </Helmet>

            <PageTitle title="مصفوفة الصلاحيات" icon={ShieldCheck} />

            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                <LayoutGrid className="h-4 w-4 text-blue-600" />
                <AlertTitle>تكوين ديناميكي</AlertTitle>
                <AlertDescription>
                    يتحكم هذا الجدول بجميع عناصر لوحة التحكم والقوائم الجانبية. التغييرات تنعكس فوراً على المستخدمين.
                    (صلاحيات المشرف العام ثابتة ولا تظهر هنا).
                </AlertDescription>
            </Alert>

            <Tabs defaultValue="PERSONAL" className="w-full">
                <TabsList className="w-full flex flex-wrap h-auto gap-2 bg-transparent p-0 mb-6 justify-start">
                    {Object.entries(PERMISSION_CATEGORIES).map(([catKey, catConfig]) => (
                        <TabsTrigger 
                            key={catKey} 
                            value={catKey}
                            className="data-[state=active]:bg-primary data-[state=active]:text-white bg-white border shadow-sm px-4 py-2 rounded-lg flex gap-2 items-center"
                        >
                            <span>{catConfig.label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>

                {Object.entries(PERMISSION_CATEGORIES).map(([catKey, catConfig]) => (
                    <TabsContent key={catKey} value={catKey}>
                        <Card className="border-t-4 border-t-primary shadow-md">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    {catConfig.label}
                                </CardTitle>
                                <CardDescription>التحكم في صلاحيات قسم {catConfig.label}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-right border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 border-b">
                                                <th className="px-4 py-4 font-bold text-gray-700 w-1/4 sticky right-0 bg-gray-50 z-10">الصلاحية / الصفحة</th>
                                                {roleColumns.map(role => (
                                                    <th key={role} className="px-4 py-4 text-center min-w-[100px]">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="font-semibold text-gray-800 whitespace-nowrap">{ROLE_LABELS[role]}</span>
                                                            <Badge variant="secondary" className="text-[10px] font-mono hidden md:inline-flex">{role}</Badge>
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {(pagesByCategory[catKey] || []).map((page) => (
                                                <tr key={page.key} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-gray-900 border-l sticky right-0 bg-white z-10">
                                                        <div className="flex flex-col">
                                                            <span>{page.label}</span>
                                                            <span className="text-[10px] text-gray-400 font-mono">{page.key}</span>
                                                        </div>
                                                    </td>
                                                    {roleColumns.map(role => {
                                                        const key = `${role}:${page.key}`;
                                                        const isChecked = !!localPermissions[key];
                                                        // Prevent locking yourself out of permission management if you are admin
                                                        const isSelfLockout = role === profile?.role && page.key === 'permission_management';

                                                        return (
                                                            <td key={role} className="px-4 py-3 text-center border-l">
                                                                <div className="flex justify-center">
                                                                    <Switch
                                                                        checked={isChecked}
                                                                        disabled={isUpdating || isSelfLockout}
                                                                        onCheckedChange={() => handleToggle(role, page.key, isChecked)}
                                                                        className="data-[state=checked]:bg-green-600"
                                                                    />
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
};

export default PermissionManagement;
