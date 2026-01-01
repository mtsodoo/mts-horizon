import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { ShieldCheck, Save, CheckCircle2, LayoutGrid, AlertCircle, Folder, User, Palette, FileText, FileSignature, Landmark, Image, Receipt, Package, CheckCircle, XCircle, FolderLock } from 'lucide-react';
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
import { supabase } from '@/lib/supabaseClient';

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

// ✅ المجلدات العامة الثابتة
const PUBLIC_FOLDERS = [
  { key: 'government-docs', name: 'مستندات حكومية', icon: Landmark, color: 'text-red-600' },
  { key: 'design', name: 'تصاميم', icon: Palette, color: 'text-purple-600' },
  { key: 'report', name: 'تقارير', icon: FileText, color: 'text-blue-600' },
  { key: 'policy', name: 'سياسات', icon: FileSignature, color: 'text-green-600' },
  { key: 'contract', name: 'عقود', icon: Landmark, color: 'text-orange-600' },
  { key: 'photo', name: 'صور', icon: Image, color: 'text-pink-600' },
  { key: 'custody_receipts', name: 'فواتير العهد والتسويات', icon: Receipt, color: 'text-amber-600' },
  { key: 'projects', name: 'ملفات المشاريع', icon: Folder, color: 'text-indigo-600' },
  { key: 'other', name: 'ملفات أخرى', icon: Package, color: 'text-gray-600' },
];

const PermissionManagement = () => {
    const { toast } = useToast();
    const { profile } = useAuth();
    const { permissions, refreshPermissions, checkPermission, loading } = usePermission();
    const [localPermissions, setLocalPermissions] = useState({});
    const [isUpdating, setIsUpdating] = useState(false);
    
    // ✅ حالة صلاحيات المجلدات
    const [folderPermissions, setFolderPermissions] = useState({});
    const [employees, setEmployees] = useState([]);
    const [folderLoading, setFolderLoading] = useState(false);
    const [activeMainTab, setActiveMainTab] = useState('pages');

    // Sync context permissions to local state
    useEffect(() => {
        setLocalPermissions(permissions);
    }, [permissions]);

    // ✅ جلب بيانات المجلدات
    useEffect(() => {
        if (activeMainTab === 'folders') {
            fetchFolderData();
        }
    }, [activeMainTab]);

    const fetchFolderData = async () => {
        setFolderLoading(true);
        try {
            // جلب الموظفين
            const { data: empData } = await supabase
                .from('profiles')
                .select('id, name_ar, employee_photo_url, role')
                .eq('is_active', true)
                .not('role', 'in', '("general_manager","ai_manager","super_admin")')
                .order('name_ar');
            setEmployees(empData || []);

            // جلب صلاحيات المجلدات
            const { data: permData } = await supabase
                .from('folder_permissions')
                .select('*');
            
            const permObj = {};
            (permData || []).forEach(p => {
                permObj[`${p.folder_key}:${p.role}`] = p.can_view;
            });
            setFolderPermissions(permObj);
        } catch (error) {
            console.error('Error fetching folder data:', error);
        } finally {
            setFolderLoading(false);
        }
    };

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

    // ✅ تغيير صلاحية المجلد
    const handleFolderToggle = async (folderKey, folderType, folderName, role, currentValue) => {
        const newValue = !currentValue;
        const permKey = `${folderKey}:${role}`;

        // تحديث محلي سريع
        setFolderPermissions(prev => ({ ...prev, [permKey]: newValue }));

        try {
            setIsUpdating(true);

            // تحقق إذا موجود
            const { data: existing } = await supabase
                .from('folder_permissions')
                .select('id')
                .eq('folder_key', folderKey)
                .eq('role', role)
                .maybeSingle();

            if (existing) {
                await supabase
                    .from('folder_permissions')
                    .update({ can_view: newValue, updated_at: new Date().toISOString() })
                    .eq('id', existing.id);
            } else {
                await supabase
                    .from('folder_permissions')
                    .insert({
                        folder_key: folderKey,
                        folder_type: folderType,
                        folder_name: folderName,
                        role: role,
                        can_view: newValue
                    });
            }
        } catch (error) {
            // إرجاع القيمة القديمة
            setFolderPermissions(prev => ({ ...prev, [permKey]: currentValue }));
            toast({ variant: 'destructive', title: 'خطأ', description: 'فشل حفظ الصلاحية' });
        } finally {
            setIsUpdating(false);
        }
    };

    // ✅ تفعيل/إلغاء الكل لمجلد
    const toggleAllForFolder = async (folderKey, folderType, folderName, enable) => {
        const roleColumns = Object.values(ROLES).filter(r => r !== 'super_admin');
        setIsUpdating(true);
        
        try {
            for (const role of roleColumns) {
                const permKey = `${folderKey}:${role}`;
                setFolderPermissions(prev => ({ ...prev, [permKey]: enable }));

                const { data: existing } = await supabase
                    .from('folder_permissions')
                    .select('id')
                    .eq('folder_key', folderKey)
                    .eq('role', role)
                    .maybeSingle();

                if (existing) {
                    await supabase
                        .from('folder_permissions')
                        .update({ can_view: enable })
                        .eq('id', existing.id);
                } else {
                    await supabase
                        .from('folder_permissions')
                        .insert({
                            folder_key: folderKey,
                            folder_type: folderType,
                            folder_name: folderName,
                            role: role,
                            can_view: enable
                        });
                }
            }
            toast({ title: enable ? 'تم تفعيل الكل' : 'تم إلغاء الكل' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'خطأ' });
            fetchFolderData(); // إعادة تحميل البيانات
        } finally {
            setIsUpdating(false);
        }
    };

    // تنسيق اسم الموظف
    const formatName = (name) => {
        if (!name) return '';
        const parts = name.trim().split(/\s+/);
        if (parts.length > 2) return `${parts[0]} ${parts[parts.length - 1]}`;
        return name;
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

    const roleColumns = Object.values(ROLES).filter(r => r !== 'super_admin');

    // ✅ جدول صلاحيات المجلدات
    const FolderPermissionTable = ({ folders, folderType }) => (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-right border-collapse">
                <thead>
                    <tr className="bg-gray-50 border-b">
                        <th className="px-4 py-4 font-bold text-gray-700 w-1/4 sticky right-0 bg-gray-50 z-10">المجلد</th>
                        {roleColumns.map(role => (
                            <th key={role} className="px-4 py-4 text-center min-w-[100px]">
                                <div className="flex flex-col items-center gap-1">
                                    <span className="font-semibold text-gray-800 whitespace-nowrap">{ROLE_LABELS[role]}</span>
                                </div>
                            </th>
                        ))}
                        <th className="px-3 py-3 text-center min-w-[120px]">إجراءات سريعة</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {folders.map((folder) => {
                        const FolderIcon = folder.icon || Folder;
                        return (
                            <tr key={folder.key} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-900 border-l sticky right-0 bg-white z-10">
                                    <div className="flex items-center gap-3">
                                        {folder.photo ? (
                                            <img src={folder.photo} alt={folder.name} className="w-8 h-8 rounded-full object-cover" />
                                        ) : (
                                            <div className={`p-2 rounded-lg bg-gray-100 ${folder.color || 'text-gray-600'}`}>
                                                <FolderIcon className="w-4 h-4" />
                                            </div>
                                        )}
                                        <span>{folder.name}</span>
                                    </div>
                                </td>
                                {roleColumns.map(role => {
                                    const permKey = `${folder.key}:${role}`;
                                    const isChecked = !!folderPermissions[permKey];
                                    return (
                                        <td key={role} className="px-4 py-3 text-center border-l">
                                            <div className="flex justify-center">
                                                <Switch
                                                    checked={isChecked}
                                                    disabled={isUpdating}
                                                    onCheckedChange={() => handleFolderToggle(folder.key, folderType, folder.name, role, isChecked)}
                                                    className="data-[state=checked]:bg-green-600"
                                                />
                                            </div>
                                        </td>
                                    );
                                })}
                                <td className="px-3 py-3 text-center border-l">
                                    <div className="flex justify-center gap-1">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 px-2 text-green-600 hover:bg-green-50"
                                            onClick={() => toggleAllForFolder(folder.key, folderType, folder.name, true)}
                                            disabled={isUpdating}
                                        >
                                            <CheckCircle className="w-3 h-3 ml-1" />
                                            الكل
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 px-2 text-red-600 hover:bg-red-50"
                                            onClick={() => toggleAllForFolder(folder.key, folderType, folder.name, false)}
                                            disabled={isUpdating}
                                        >
                                            <XCircle className="w-3 h-3 ml-1" />
                                            إلغاء
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    // تحويل الموظفين لمجلدات
    const employeeFolders = employees.map(emp => ({
        key: emp.id,
        name: formatName(emp.name_ar),
        photo: emp.employee_photo_url,
        icon: User
    }));

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
                </AlertDescription>
            </Alert>

            {/* ✅ تابات رئيسية: صلاحيات الصفحات / صلاحيات المجلدات */}
            <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
                    <TabsTrigger value="pages" className="gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        صلاحيات الصفحات
                    </TabsTrigger>
                    <TabsTrigger value="folders" className="gap-2">
                        <FolderLock className="w-4 h-4" />
                        صلاحيات المجلدات
                    </TabsTrigger>
                </TabsList>

                {/* ✅ تاب صلاحيات الصفحات */}
                <TabsContent value="pages">
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
                </TabsContent>

                {/* ✅ تاب صلاحيات المجلدات */}
                <TabsContent value="folders">
                    {folderLoading ? (
                        <div className="p-8 text-center">جاري تحميل صلاحيات المجلدات...</div>
                    ) : (
                        <Tabs defaultValue="public" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
                                <TabsTrigger value="public" className="gap-2">
                                    <Folder className="w-4 h-4" />
                                    المجلدات العامة
                                </TabsTrigger>
                                <TabsTrigger value="employees" className="gap-2">
                                    <User className="w-4 h-4" />
                                    مجلدات الموظفين
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="public">
                                <Card className="border-t-4 border-t-purple-500 shadow-md">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Folder className="w-5 h-5 text-purple-600" />
                                            المجلدات العامة
                                        </CardTitle>
                                        <CardDescription>تحكم في صلاحيات الوصول للمجلدات العامة (تصاميم، تقارير، عقود، إلخ)</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <FolderPermissionTable folders={PUBLIC_FOLDERS} folderType="public_folder" />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="employees">
                                <Card className="border-t-4 border-t-teal-500 shadow-md">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <User className="w-5 h-5 text-teal-600" />
                                            مجلدات الموظفين
                                        </CardTitle>
                                        <CardDescription>تحكم في من يستطيع رؤية مجلد كل موظف</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {employeeFolders.length > 0 ? (
                                            <FolderPermissionTable folders={employeeFolders} folderType="employee_folder" />
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">لا يوجد موظفين</div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default PermissionManagement;