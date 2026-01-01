
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  FileText, 
  Edit, 
  Trash2, 
  Upload, 
  CreditCard,
  Briefcase,
  User,
  Image as ImageIcon,
  Check
} from 'lucide-react';
import { message, Spin, Popconfirm } from 'antd';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { differenceInDays, parseISO, format } from 'date-fns';

const ExternalStaff = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [staffList, setStaffList] = useState([]);
    const [filteredStaff, setFilteredStaff] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [formData, setFormData] = useState({
        staff_code: '',
        staff_name: '',
        staff_type: 'driver',
        phone: '',
        iqama_number: '',
        iqama_expiry: '',
        nationality: '',
        birth_date: '',
        job_title: '',
        sponsor_name: '',
        sponsor_id: '',
        photo_url: null,
        iqama_image: null,
        is_active: true
    });
    
    // File Inputs State
    const [photoFile, setPhotoFile] = useState(null);
    const [iqamaImageFile, setIqamaImageFile] = useState(null);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    useEffect(() => {
        filterStaff();
    }, [staffList, searchTerm, typeFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('external_staff')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setStaffList(data || []);
        } catch (error) {
            console.error('Error fetching staff:', error);
            message.error('فشل تحميل بيانات الموظفين');
        } finally {
            setLoading(false);
        }
    };

    const filterStaff = () => {
        let result = [...staffList];

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(s => 
                s.staff_name?.toLowerCase().includes(lowerSearch) ||
                s.staff_code?.toLowerCase().includes(lowerSearch) ||
                s.phone?.includes(lowerSearch) ||
                s.iqama_number?.includes(lowerSearch)
            );
        }

        if (typeFilter !== 'all') {
            result = result.filter(s => s.staff_type === typeFilter);
        }

        setFilteredStaff(result);
    };

    const getExpiryStatus = (dateString) => {
        if (!dateString) return { color: 'gray', text: 'غير محدد', days: null };
        
        const date = parseISO(dateString);
        const daysLeft = differenceInDays(date, new Date());
        
        if (daysLeft < 0) return { color: 'red', text: 'منتهي', days: daysLeft };
        if (daysLeft <= 30) return { color: 'red', text: `ينتهي خلال ${daysLeft} يوم`, days: daysLeft };
        if (daysLeft <= 90) return { color: 'yellow', text: `ينتهي خلال ${daysLeft} يوم`, days: daysLeft };
        
        return { color: 'green', text: 'ساري', days: daysLeft };
    };

    const handleOpenModal = (staff = null) => {
        setEditingStaff(staff);
        setPhotoFile(null);
        setIqamaImageFile(null);

        if (staff) {
            setFormData({
                staff_code: staff.staff_code || '',
                staff_name: staff.staff_name || '',
                staff_type: staff.staff_type || 'driver',
                phone: staff.phone || '',
                iqama_number: staff.iqama_number || '',
                iqama_expiry: staff.iqama_expiry || '',
                nationality: staff.nationality || '',
                birth_date: staff.birth_date || '',
                job_title: staff.job_title || '',
                sponsor_name: staff.sponsor_name || '',
                sponsor_id: staff.sponsor_id || '',
                photo_url: staff.photo_url,
                iqama_image: staff.iqama_image,
                is_active: staff.is_active !== false
            });
        } else {
            setFormData({
                staff_code: '',
                staff_name: '',
                staff_type: 'driver',
                phone: '',
                iqama_number: '',
                iqama_expiry: '',
                nationality: '',
                birth_date: '',
                job_title: '',
                sponsor_name: '',
                sponsor_id: '',
                photo_url: null,
                iqama_image: null,
                is_active: true
            });
        }
        setIsModalOpen(true);
    };

    const handleUpload = async (file, staffCode, type) => {
        if (!file) return null;
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${type}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `staff/${staffCode || 'temp'}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('staff-images')
            .upload(filePath, file);

        if (uploadError) {
            console.error(`Upload error for ${type}:`, uploadError);
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('staff-images')
            .getPublicUrl(filePath);

        return data.publicUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.staff_code || !formData.staff_name) {
            message.error('الكود والاسم مطلوبين');
            return;
        }

        setIsSubmitting(true);
        try {
            // Check for duplicate code if new staff
            if (!editingStaff) {
                const { data: existing } = await supabase
                    .from('external_staff')
                    .select('id')
                    .eq('staff_code', formData.staff_code)
                    .single();
                
                if (existing) {
                    message.error('كود الموظف مستخدم بالفعل');
                    setIsSubmitting(false);
                    return;
                }
            }

            let photoUrl = formData.photo_url;
            let iqamaUrl = formData.iqama_image;

            // Upload files if selected
            if (photoFile) {
                photoUrl = await handleUpload(photoFile, formData.staff_code, 'photo');
            }
            if (iqamaImageFile) {
                iqamaUrl = await handleUpload(iqamaImageFile, formData.staff_code, 'iqama');
            }

            const payload = {
                staff_code: formData.staff_code,
                staff_name: formData.staff_name,
                staff_type: formData.staff_type,
                phone: formData.phone,
                iqama_number: formData.iqama_number,
                iqama_expiry: formData.iqama_expiry || null,
                nationality: formData.nationality,
                birth_date: formData.birth_date || null,
                job_title: formData.job_title,
                sponsor_name: formData.sponsor_name,
                sponsor_id: formData.sponsor_id,
                photo_url: photoUrl,
                iqama_image: iqamaUrl,
                is_active: formData.is_active,
                updated_at: new Date().toISOString()
            };

            let error;
            if (editingStaff) {
                const { error: updateError } = await supabase
                    .from('external_staff')
                    .update(payload)
                    .eq('id', editingStaff.id);
                error = updateError;
            } else {
                payload.created_at = new Date().toISOString();
                const { error: insertError } = await supabase
                    .from('external_staff')
                    .insert([payload]);
                error = insertError;
            }

            if (error) throw error;

            message.success(editingStaff ? 'تم تحديث البيانات' : 'تم إضافة الموظف');
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Submission error:', error);
            message.error('حدث خطأ أثناء الحفظ');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            const { error } = await supabase
                .from('external_staff')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            message.success('تم حذف الموظف');
            fetchData();
        } catch (error) {
            console.error('Delete error:', error);
            message.error('فشل الحذف - قد يكون الموظف مرتبط ببيانات أخرى');
        }
    };

    const getTypeBadge = (type) => {
        const badges = {
            warehouse: { label: 'أمين مستودع', class: 'bg-blue-100 text-blue-800 border-blue-200' },
            driver: { label: 'سائق', class: 'bg-amber-100 text-amber-800 border-amber-200' },
            delivery: { label: 'مندوب توصيل', class: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
            warehouse_driver: { label: 'مستودع + سائق', class: 'bg-purple-100 text-purple-800 border-purple-200' }
        };
        const badge = badges[type] || { label: type, class: 'bg-gray-100 text-gray-800' };
        
        return (
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${badge.class}`}>
                {badge.label}
            </span>
        );
    };

    return (
        <>
            <Helmet>
                <title>الموظفين الخارجيين | MTS</title>
            </Helmet>
            
            <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto" dir="rtl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <PageTitle title="الموظفين الخارجيين" icon={Users} />
                    <Button onClick={() => handleOpenModal()} className="gap-2">
                        <UserPlus className="w-4 h-4" />
                        إضافة موظف
                    </Button>
                </div>

                {/* Filters */}
                <Card>
                    <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-1/3">
                            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="بحث بالاسم، الكود، الهاتف..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pr-9"
                            />
                        </div>
                        <Tabs value={typeFilter} onValueChange={setTypeFilter} className="w-full md:w-auto">
                            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
                                <TabsTrigger value="all">الكل</TabsTrigger>
                                <TabsTrigger value="warehouse">مستودع</TabsTrigger>
                                <TabsTrigger value="driver">سائقين</TabsTrigger>
                                <TabsTrigger value="delivery">مناديب</TabsTrigger>
                                <TabsTrigger value="warehouse_driver">مشترك</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </Card>

                {/* Staff Grid */}
                {loading ? (
                    <div className="flex justify-center py-12"><Spin size="large" /></div>
                ) : filteredStaff.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">لا يوجد موظفين</h3>
                        <p className="text-gray-500">قم بإضافة موظفين جدد للقائمة</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredStaff.map(staff => {
                            const iqamaStatus = getExpiryStatus(staff.iqama_expiry);
                            
                            return (
                                <Card key={staff.id} className={`overflow-hidden transition-all hover:shadow-md ${!staff.is_active ? 'opacity-75 bg-gray-50' : ''}`}>
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex gap-3">
                                                <div className="h-14 w-14 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                                                    {staff.photo_url ? (
                                                        <img src={staff.photo_url} alt={staff.staff_name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center text-gray-400">
                                                            <User className="w-8 h-8" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900 line-clamp-1">{staff.staff_name}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded border text-gray-600 font-mono">
                                                            {staff.staff_code}
                                                        </span>
                                                        {getTypeBadge(staff.staff_type)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`w-2.5 h-2.5 rounded-full ${staff.is_active ? 'bg-green-500' : 'bg-gray-300'}`} title={staff.is_active ? 'نشط' : 'غير نشط'} />
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center justify-between text-gray-600 bg-gray-50 p-2 rounded">
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-3.5 h-3.5" />
                                                    <span className="dir-ltr">{staff.phone || '-'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Briefcase className="w-3.5 h-3.5" />
                                                    <span className="truncate max-w-[100px]">{staff.job_title || '-'}</span>
                                                </div>
                                            </div>

                                            <div className={`flex items-center justify-between p-2 rounded border ${
                                                iqamaStatus.color === 'green' ? 'bg-green-50 border-green-200 text-green-700' :
                                                iqamaStatus.color === 'yellow' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                                                'bg-red-50 border-red-200 text-red-700'
                                            }`}>
                                                <div className="flex items-center gap-2">
                                                    <CreditCard className="w-3.5 h-3.5" />
                                                    <span className="font-medium">الإقامة:</span>
                                                    <span className="text-xs font-mono">{staff.iqama_number}</span>
                                                </div>
                                                <span className="text-xs font-bold">{iqamaStatus.text}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <CardFooter className="bg-gray-50/50 p-3 border-t flex justify-between">
                                        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(staff)} className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                            <Edit className="w-3.5 h-3.5 ml-1.5" />
                                            تعديل
                                        </Button>
                                        <Popconfirm
                                            title="حذف الموظف"
                                            description="هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء."
                                            onConfirm={() => handleDelete(staff.id)}
                                            okText="نعم، حذف"
                                            cancelText="إلغاء"
                                            okButtonProps={{ danger: true }}
                                        >
                                            <Button variant="ghost" size="sm" className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                                                <Trash2 className="w-3.5 h-3.5 ml-1.5" />
                                                حذف
                                            </Button>
                                        </Popconfirm>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingStaff ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}</DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>كود الموظف <span className="text-red-500">*</span></Label>
                                <Input 
                                    value={formData.staff_code} 
                                    onChange={(e) => setFormData({...formData, staff_code: e.target.value})}
                                    placeholder="مثال: DR001"
                                    className="font-mono uppercase"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>نوع الموظف</Label>
                                <Select 
                                    value={formData.staff_type} 
                                    onValueChange={(val) => setFormData({...formData, staff_type: val})}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="driver">سائق</SelectItem>
                                        <SelectItem value="warehouse">أمين مستودع</SelectItem>
                                        <SelectItem value="delivery">مندوب توصيل</SelectItem>
                                        <SelectItem value="warehouse_driver">أمين مستودع + سائق</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>الاسم الكامل <span className="text-red-500">*</span></Label>
                                <Input 
                                    value={formData.staff_name} 
                                    onChange={(e) => setFormData({...formData, staff_name: e.target.value})}
                                    placeholder="الاسم الثلاثي"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>رقم الجوال</Label>
                                <Input 
                                    value={formData.phone} 
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    placeholder="05xxxxxxxx"
                                    dir="ltr"
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border space-y-4">
                            <h4 className="font-semibold text-sm flex items-center gap-2 text-slate-700">
                                <CreditCard className="w-4 h-4" />
                                بيانات الهوية والإقامة
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>رقم الإقامة/الهوية</Label>
                                    <Input 
                                        value={formData.iqama_number} 
                                        onChange={(e) => setFormData({...formData, iqama_number: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>تاريخ الانتهاء</Label>
                                    <Input 
                                        type="date"
                                        value={formData.iqama_expiry} 
                                        onChange={(e) => setFormData({...formData, iqama_expiry: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>الجنسية</Label>
                                    <Input 
                                        value={formData.nationality} 
                                        onChange={(e) => setFormData({...formData, nationality: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>تاريخ الميلاد</Label>
                                    <Input 
                                        type="date"
                                        value={formData.birth_date} 
                                        onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>المسمى الوظيفي</Label>
                                <Input 
                                    value={formData.job_title} 
                                    onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>اسم الكفيل</Label>
                                <Input 
                                    value={formData.sponsor_name} 
                                    onChange={(e) => setFormData({...formData, sponsor_name: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                            <div className="space-y-0.5">
                                <Label>حالة الموظف</Label>
                                <p className="text-xs text-muted-foreground">تفعيل أو تعطيل حساب الموظف في النظام</p>
                            </div>
                            <Switch
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                            />
                        </div>

                        <div className="border-t pt-4">
                            <Label className="mb-3 block">المرفقات والصور</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-slate-50 transition-colors relative">
                                    <Input 
                                        type="file" 
                                        accept="image/*" 
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        onChange={(e) => setPhotoFile(e.target.files[0])}
                                    />
                                    <div className="flex flex-col items-center gap-2">
                                        {formData.photo_url && !photoFile ? (
                                            <img src={formData.photo_url} alt="Profile" className="h-16 w-16 object-cover rounded-full" />
                                        ) : photoFile ? (
                                            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                                <Check className="w-8 h-8" />
                                            </div>
                                        ) : (
                                            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                                <User className="w-8 h-8" />
                                            </div>
                                        )}
                                        <span className="text-xs font-medium text-slate-600">
                                            {photoFile ? photoFile.name : 'الصورة الشخصية'}
                                        </span>
                                    </div>
                                </div>

                                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-slate-50 transition-colors relative">
                                    <Input 
                                        type="file" 
                                        accept="image/*" 
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        onChange={(e) => setIqamaImageFile(e.target.files[0])}
                                    />
                                    <div className="flex flex-col items-center gap-2">
                                        {formData.iqama_image && !iqamaImageFile ? (
                                            <div className="relative h-16 w-full max-w-[120px]">
                                                <img src={formData.iqama_image} alt="Iqama" className="h-full w-full object-contain" />
                                            </div>
                                        ) : iqamaImageFile ? (
                                            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                                <Check className="w-8 h-8" />
                                            </div>
                                        ) : (
                                            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                                <ImageIcon className="w-8 h-8" />
                                            </div>
                                        )}
                                        <span className="text-xs font-medium text-slate-600">
                                            {iqamaImageFile ? iqamaImageFile.name : 'صورة الإقامة'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="mt-4 gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                إلغاء
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Spin size="small" className="ml-2" />}
                                {editingStaff ? 'حفظ التعديلات' : 'إضافة الموظف'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ExternalStaff;
