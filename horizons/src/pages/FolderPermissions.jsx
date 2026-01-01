import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { 
  FolderLock, Loader2, User, Folder, 
  Palette, FileText, FileSignature, Landmark, Image, Receipt, Package,
  CheckCircle, XCircle, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import PageTitle from '@/components/PageTitle';

const ROLES = [
  { key: 'employee', label: 'موظف' },
  { key: 'manager', label: 'مدير قسم' },
  { key: 'financial_manager', label: 'مدير مالي' },
  { key: 'project_manager', label: 'مدير مشاريع' },
  { key: 'operations_manager', label: 'مدير عمليات' },
  { key: 'public_relations_manager', label: 'مدير علاقات عامة' },
  { key: 'general_manager', label: 'مدير عام' },
];

const PUBLIC_FOLDERS = [
  { key: 'design', name: 'تصاميم', icon: Palette, color: 'text-purple-600' },
  { key: 'report', name: 'تقارير', icon: FileText, color: 'text-blue-600' },
  { key: 'policy', name: 'سياسات', icon: FileSignature, color: 'text-green-600' },
  { key: 'contract', name: 'عقود', icon: Landmark, color: 'text-orange-600' },
  { key: 'photo', name: 'صور', icon: Image, color: 'text-pink-600' },
  { key: 'custody_receipts', name: 'فواتير العهد والتسويات', icon: Receipt, color: 'text-amber-600' },
  { key: 'other', name: 'ملفات أخرى', icon: Package, color: 'text-gray-600' },
];

const FolderPermissions = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [activeTab, setActiveTab] = useState('public');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: empData } = await supabase
        .from('profiles')
        .select('id, name_ar, role, employee_photo_url')
        .eq('is_active', true)
        .not('role', 'in', '("general_manager","ai_manager","super_admin")')
        .order('name_ar');
      setEmployees(empData || []);

      const { data: permData } = await supabase.from('folder_permissions').select('*');
      const permObj = {};
      (permData || []).forEach(p => { permObj[`${p.folder_key}:${p.role}`] = p.can_view; });
      setPermissions(permObj);
    } catch (error) {
      console.error('Error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل جلب البيانات' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (folderKey, folderType, folderName, role, currentValue) => {
    const newValue = !currentValue;
    const permKey = `${folderKey}:${role}`;
    setPermissions(prev => ({ ...prev, [permKey]: newValue }));

    try {
      setSaving(true);
      const { data: existing } = await supabase
        .from('folder_permissions')
        .select('id')
        .eq('folder_key', folderKey)
        .eq('role', role)
        .single();

      if (existing) {
        await supabase.from('folder_permissions').update({ can_view: newValue, updated_at: new Date().toISOString() }).eq('id', existing.id);
      } else {
        await supabase.from('folder_permissions').insert({ folder_key: folderKey, folder_type: folderType, folder_name: folderName, role: role, can_view: newValue });
      }
    } catch (error) {
      setPermissions(prev => ({ ...prev, [permKey]: currentValue }));
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل حفظ الصلاحية' });
    } finally {
      setSaving(false);
    }
  };

  const toggleAllForFolder = async (folderKey, folderType, folderName, enable) => {
    setSaving(true);
    try {
      for (const role of ROLES) {
        const permKey = `${folderKey}:${role.key}`;
        setPermissions(prev => ({ ...prev, [permKey]: enable }));
        const { data: existing } = await supabase.from('folder_permissions').select('id').eq('folder_key', folderKey).eq('role', role.key).single();
        if (existing) {
          await supabase.from('folder_permissions').update({ can_view: enable }).eq('id', existing.id);
        } else {
          await supabase.from('folder_permissions').insert({ folder_key: folderKey, folder_type: folderType, folder_name: folderName, role: role.key, can_view: enable });
        }
      }
      toast({ title: enable ? 'تم تفعيل الكل' : 'تم إلغاء الكل' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'خطأ' });
    } finally {
      setSaving(false);
    }
  };

  const formatName = (name) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length > 2) return `${parts[0]} ${parts[parts.length - 1]}`;
    return name;
  };

  const PermissionTable = ({ folders, folderType }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="px-4 py-3 text-right font-bold text-gray-700 sticky right-0 bg-gray-50 z-10 min-w-[200px]">المجلد</th>
            {ROLES.map(role => (
              <th key={role.key} className="px-3 py-3 text-center min-w-[90px]">
                <span className="font-semibold text-gray-800 text-xs whitespace-nowrap">{role.label}</span>
              </th>
            ))}
            <th className="px-3 py-3 text-center min-w-[100px]">إجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {folders.map((folder) => {
            const FolderIcon = folder.icon || Folder;
            return (
              <tr key={folder.key} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 sticky right-0 bg-white z-10 border-l">
                  <div className="flex items-center gap-3">
                    {folder.photo ? (
                      <img src={folder.photo} alt={folder.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className={`p-2 rounded-lg bg-gray-100 ${folder.color || 'text-gray-600'}`}>
                        <FolderIcon className="w-4 h-4" />
                      </div>
                    )}
                    <span className="font-medium text-gray-900">{folder.name}</span>
                  </div>
                </td>
                {ROLES.map(role => {
                  const permKey = `${folder.key}:${role.key}`;
                  const isChecked = !!permissions[permKey];
                  return (
                    <td key={role.key} className="px-3 py-3 text-center border-l">
                      <div className="flex justify-center">
                        <Switch
                          checked={isChecked}
                          disabled={saving}
                          onCheckedChange={() => handleToggle(folder.key, folderType, folder.name, role.key, isChecked)}
                          className="data-[state=checked]:bg-green-600"
                        />
                      </div>
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-center border-l">
                  <div className="flex justify-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600 hover:bg-green-50" onClick={() => toggleAllForFolder(folder.key, folderType, folder.name, true)} disabled={saving}>
                      <CheckCircle className="w-3 h-3 ml-1" />الكل
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600 hover:bg-red-50" onClick={() => toggleAllForFolder(folder.key, folderType, folder.name, false)} disabled={saving}>
                      <XCircle className="w-3 h-3 ml-1" />إلغاء
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

  const employeeFolders = useMemo(() => employees.map(emp => ({ key: emp.id, name: formatName(emp.name_ar), photo: emp.employee_photo_url, icon: User })), [employees]);

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

  return (
    <>
      <Helmet><title>صلاحيات المجلدات | MTS</title></Helmet>
      <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <PageTitle title="صلاحيات المجلدات" icon={FolderLock} />
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />تحديث
          </Button>
        </div>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800"><strong>💡 ملاحظة:</strong> يمكنك التحكم في من يستطيع رؤية كل مجلد. المدير العام يرى جميع المجلدات تلقائياً.</p>
          </CardContent>
        </Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="public" className="gap-2"><Folder className="w-4 h-4" />المجلدات العامة</TabsTrigger>
            <TabsTrigger value="employees" className="gap-2"><User className="w-4 h-4" />مجلدات الموظفين</TabsTrigger>
          </TabsList>
          <TabsContent value="public" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Folder className="w-5 h-5 text-blue-600" />المجلدات العامة</CardTitle>
                <CardDescription>تحكم في صلاحيات الوصول للمجلدات العامة (تصاميم، تقارير، عقود، إلخ)</CardDescription>
              </CardHeader>
              <CardContent><PermissionTable folders={PUBLIC_FOLDERS} folderType="public_folder" /></CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="employees" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-teal-600" />مجلدات الموظفين</CardTitle>
                <CardDescription>تحكم في من يستطيع رؤية مجلد كل موظف</CardDescription>
              </CardHeader>
              <CardContent>
                {employeeFolders.length > 0 ? <PermissionTable folders={employeeFolders} folderType="employee_folder" /> : <div className="text-center py-8 text-gray-500">لا يوجد موظفين</div>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default FolderPermissions;