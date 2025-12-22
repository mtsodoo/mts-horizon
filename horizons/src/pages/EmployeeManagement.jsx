import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Helmet } from 'react-helmet';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Empty, Spin, message } from 'antd';
import { UserCog, Search, Edit, Trash2, Shield, Eye, UserPlus, FileSpreadsheet } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
import ImportEmployeesDialog from '@/components/ImportEmployeesDialog';
// 🔥 استيراد أداة التسجيل
import { logSystemActivity } from '@/utils/omarTools';

// 🔥 تحديث roleTranslation ليطابق permissions.js تماماً
const roleTranslation = {
  'employee': 'موظف',
  'manager': 'مدير قسم',
  'financial_manager': 'مدير مالي',
  'project_manager': 'مدير مشاريع',
  'operations_manager': 'مدير عمليات',
  'public_relations_manager': 'مدير علاقات عامة',  // 🔥 جديد
  'general_manager': 'مدير عام',
  'admin': 'مدير نظام',
  'super_admin': 'مشرف النظام',
};

const formatDateForInput = (date) => {
    if (!date) return '';
    try {
        return format(typeof date === 'string' ? parseISO(date) : date, 'yyyy-MM-dd');
    } catch (error) {
        return '';
    }
};

const EmployeeForm = ({ employee, onSave, onCancel, isNew = false }) => {
    const [formData, setFormData] = useState({
        name_ar: employee?.name_ar || '',
        name_en: employee?.name_en || '',
        email: employee?.email || '',
        phone_number: employee?.phone_number || '',
        national_id: employee?.national_id || '',
        birth_date: formatDateForInput(employee?.birth_date),
        nationality: employee?.nationality || '',
        gender: employee?.gender || '',
        marital_status: employee?.marital_status || '',
        address: employee?.address || '',
        city: employee?.city || '',
        national_address_short: employee?.national_address_short || '',
        
        job_title: employee?.job_title || '',
        department: employee?.department || '',
        role: employee?.role || 'employee',
        hire_date: formatDateForInput(employee?.hire_date),
        contract_type: employee?.contract_type || '',
        contract_start: formatDateForInput(employee?.contract_start),
        contract_end: formatDateForInput(employee?.contract_end),
        probation_end: formatDateForInput(employee?.probation_end),
        is_active: employee?.is_active ?? true,

        base_salary: employee?.base_salary || 0,
        housing_allowance: employee?.housing_allowance || 0,
        transportation_allowance: employee?.transportation_allowance || 0,
        other_allowances: employee?.other_allowances || 0,
        bank_name: employee?.bank_name || '',
        iban: employee?.iban || '',
        annual_leave_balance: employee?.annual_leave_balance || 0,
        sick_leave_balance: employee?.sick_leave_balance || 0,

        social_insurance_number: employee?.social_insurance_number || '',
        medical_insurance_number: employee?.medical_insurance_number || '',
        medical_insurance_category: employee?.medical_insurance_category || '',
        iqama_number: employee?.iqama_number || '',
        iqama_expiry: formatDateForInput(employee?.iqama_expiry),
        passport_number: employee?.passport_number || '',
        passport_expiry: formatDateForInput(employee?.passport_expiry),

        emergency_contact_name: employee?.emergency_contact_name || '',
        emergency_contact_phone: employee?.emergency_contact_phone || '',
        notes: employee?.notes || '',
        
        // حقل كلمة المرور
        new_password: '',
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // التحقق من الحقول المطلوبة
        if (isNew) {
            if (!formData.name_ar || !formData.email || !formData.new_password) {
                message.error('الرجاء ملء الحقول المطلوبة: الاسم، البريد الإلكتروني، وكلمة المرور');
                return;
            }
            if (formData.new_password.length < 8) {
                message.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
                return;
            }
        }
        
        const dataToSave = { ...formData };
        // Convert empty strings for numeric fields to null
        ['base_salary', 'housing_allowance', 'transportation_allowance', 'other_allowances', 'annual_leave_balance', 'sick_leave_balance'].forEach(field => {
            if (dataToSave[field] === '') dataToSave[field] = null;
        });
        onSave(dataToSave);
    };

    return (
        <form onSubmit={handleSubmit}>
            <Tabs defaultValue="personal">
                <TabsList className="grid w-full grid-cols-5 mb-4">
                    <TabsTrigger value="personal">المعلومات الشخصية</TabsTrigger>
                    <TabsTrigger value="job">المعلومات الوظيفية</TabsTrigger>
                    <TabsTrigger value="financial">المعلومات المالية</TabsTrigger>
                    <TabsTrigger value="docs">الهويات والوثائق</TabsTrigger>
                    <TabsTrigger value="emergency">الاتصال في الطوارئ</TabsTrigger>
                </TabsList>
                <div className="max-h-[60vh] overflow-y-auto p-1">
                    <TabsContent value="personal" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>الاسم (عربي) <span className="text-red-500">*</span></Label>
                                <Input name="name_ar" value={formData.name_ar} onChange={handleChange} required />
                            </div>
                            <div><Label>الاسم (إنجليزي)</Label><Input name="name_en" value={formData.name_en} onChange={handleChange} /></div>
                            <div>
                                <Label>البريد الإلكتروني <span className="text-red-500">*</span></Label>
                                <Input name="email" type="email" value={formData.email} onChange={handleChange} required disabled={!isNew} />
                                {!isNew && <small className="text-muted-foreground">لا يمكن تعديل البريد الإلكتروني</small>}
                            </div>
                            <div><Label>رقم الجوال</Label><Input name="phone_number" value={formData.phone_number} onChange={handleChange} /></div>
                            <div><Label>رقم الهوية الوطنية</Label><Input name="national_id" value={formData.national_id} onChange={handleChange} /></div>
                            <div><Label>تاريخ الميلاد</Label><Input name="birth_date" type="date" value={formData.birth_date} onChange={handleChange} /></div>
                            <div><Label>الجنسية</Label><Input name="nationality" value={formData.nationality} onChange={handleChange} /></div>
                            <div><Label>الجنس</Label><Select name="gender" value={formData.gender} onValueChange={(v) => handleSelectChange('gender', v)}><SelectTrigger><SelectValue placeholder="اختر الجنس" /></SelectTrigger><SelectContent><SelectItem value="male">ذكر</SelectItem><SelectItem value="female">أنثى</SelectItem></SelectContent></Select></div>
                            <div><Label>الحالة الاجتماعية</Label><Select name="marital_status" value={formData.marital_status} onValueChange={(v) => handleSelectChange('marital_status', v)}><SelectTrigger><SelectValue placeholder="اختر الحالة" /></SelectTrigger><SelectContent><SelectItem value="single">أعزب</SelectItem><SelectItem value="married">متزوج</SelectItem><SelectItem value="divorced">مطلق</SelectItem><SelectItem value="widowed">أرمل</SelectItem></SelectContent></Select></div>
                            <div className="md:col-span-2"><Label>العنوان</Label><Textarea name="address" value={formData.address} onChange={handleChange} /></div>
                            <div><Label>المدينة</Label><Input name="city" value={formData.city} onChange={handleChange} /></div>
                            <div><Label>العنوان الوطني المختصر</Label><Input name="national_address_short" value={formData.national_address_short} onChange={handleChange} /></div>
                        </div>
                    </TabsContent>
                    <TabsContent value="job" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label>المسمى الوظيفي</Label><Input name="job_title" value={formData.job_title} onChange={handleChange} /></div>
                            <div><Label>القسم</Label><Input name="department" value={formData.department} onChange={handleChange} /></div>
                            <div><Label>الدور بالنظام</Label><Select name="role" value={formData.role} onValueChange={(v) => handleSelectChange('role', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(roleTranslation).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label>تاريخ التعيين</Label><Input name="hire_date" type="date" value={formData.hire_date} onChange={handleChange} /></div>
                            <div><Label>نوع العقد</Label><Select name="contract_type" value={formData.contract_type} onValueChange={(v) => handleSelectChange('contract_type', v)}><SelectTrigger><SelectValue placeholder="اختر نوع العقد" /></SelectTrigger><SelectContent><SelectItem value="full_time">دوام كامل</SelectItem><SelectItem value="part_time">دوام جزئي</SelectItem><SelectItem value="contractor">متعاقد</SelectItem></SelectContent></Select></div>
                            <div><Label>تاريخ بداية العقد</Label><Input name="contract_start" type="date" value={formData.contract_start} onChange={handleChange} /></div>
                            <div><Label>تاريخ نهاية العقد</Label><Input name="contract_end" type="date" value={formData.contract_end} onChange={handleChange} /></div>
                            <div><Label>نهاية فترة التجربة</Label><Input name="probation_end" type="date" value={formData.probation_end} onChange={handleChange} /></div>
                            <div className="flex items-center space-x-2 rtl:space-x-reverse"><input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleChange} className="h-4 w-4" /><Label htmlFor="is_active">موظف نشط</Label></div>
                            <div className="md:col-span-2 border-t pt-4 mt-4">
                                <Label>
                                    {isNew ? 'كلمة المرور' : 'تعديل كلمة المرور (اختياري)'}
                                    {isNew && <span className="text-red-500"> *</span>}
                                </Label>
                                <Input 
                                    name="new_password" 
                                    type="password" 
                                    value={formData.new_password} 
                                    onChange={handleChange} 
                                    placeholder={isNew ? "كلمة المرور (8 أحرف على الأقل)" : "اتركه فارغاً إذا لم ترد تغيير كلمة المرور"}
                                    required={isNew}
                                />
                                <small className="text-muted-foreground">كلمة المرور يجب أن تكون 8 أحرف على الأقل</small>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="financial" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label>الراتب الأساسي</Label><Input name="base_salary" type="number" value={formData.base_salary} onChange={handleChange} /></div>
                            <div><Label>بدل السكن</Label><Input name="housing_allowance" type="number" value={formData.housing_allowance} onChange={handleChange} /></div>
                            <div><Label>بدل النقل</Label><Input name="transportation_allowance" type="number" value={formData.transportation_allowance} onChange={handleChange} /></div>
                            <div><Label>بدلات أخرى</Label><Input name="other_allowances" type="number" value={formData.other_allowances} onChange={handleChange} /></div>
                            <div><Label>اسم البنك</Label><Input name="bank_name" value={formData.bank_name} onChange={handleChange} /></div>
                            <div><Label>IBAN</Label><Input name="iban" value={formData.iban} onChange={handleChange} /></div>
                            <div><Label>رصيد الإجازة السنوية</Label><Input name="annual_leave_balance" type="number" value={formData.annual_leave_balance} onChange={handleChange} /></div>
                            <div><Label>رصيد الإجازة المرضية</Label><Input name="sick_leave_balance" type="number" value={formData.sick_leave_balance} onChange={handleChange} /></div>
                        </div>
                    </TabsContent>
                    <TabsContent value="docs" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label>رقم الإقامة</Label><Input name="iqama_number" value={formData.iqama_number} onChange={handleChange} /></div>
                            <div><Label>تاريخ انتهاء الإقامة</Label><Input name="iqama_expiry" type="date" value={formData.iqama_expiry} onChange={handleChange} /></div>
                            <div><Label>رقم جواز السفر</Label><Input name="passport_number" value={formData.passport_number} onChange={handleChange} /></div>
                            <div><Label>تاريخ انتهاء الجواز</Label><Input name="passport_expiry" type="date" value={formData.passport_expiry} onChange={handleChange} /></div>
                            <div><Label>رقم التأمينات الاجتماعية</Label><Input name="social_insurance_number" value={formData.social_insurance_number} onChange={handleChange} /></div>
                            <div><Label>رقم التأمين الطبي</Label><Input name="medical_insurance_number" value={formData.medical_insurance_number} onChange={handleChange} /></div>
                            <div><Label>فئة التأمين الطبي</Label><Input name="medical_insurance_category" value={formData.medical_insurance_category} onChange={handleChange} /></div>
                        </div>
                    </TabsContent>
                    <TabsContent value="emergency" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label>اسم جهة الاتصال</Label><Input name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} /></div>
                            <div><Label>رقم جوال جهة الاتصال</Label><Input name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleChange} /></div>
                            <div className="md:col-span-2"><Label>ملاحظات</Label><Textarea name="notes" value={formData.notes} onChange={handleChange} /></div>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
            <DialogFooter className="mt-4">
                <Button type="button" variant="ghost" onClick={onCancel}>إلغاء</Button>
                <Button type="submit">{isNew ? 'إضافة الموظف' : 'حفظ التغييرات'}</Button>
            </DialogFooter>
        </form>
    );
};

const EmployeeManagement = () => {
    const { profile, user } = useAuth(); // Added user for logging ID
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isNewEmployee, setIsNewEmployee] = useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

    const fetchEmployees = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('profiles').select('*').order('name_ar', { ascending: true });
            if (error) throw error;
            setEmployees(data || []);
        } catch (error) {
            handleSupabaseError(error, 'فشل في جلب الموظفين');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!profile) return;
        if (!['general_manager', 'admin', 'super_admin'].includes(profile.role)) {
            message.error('ليس لديك صلاحية للوصول لهذه الصفحة');
            navigate('/dashboard');
            return;
        }
        fetchEmployees();
    }, [fetchEmployees, profile, navigate]);

    useEffect(() => {
        const result = employees.filter(emp =>
            (emp.name_ar?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (emp.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (emp.phone_number || '').includes(searchTerm)
        );
        setFilteredEmployees(result);
    }, [searchTerm, employees]);

    const handleOpenModal = (employee = null) => {
        if (employee) {
            setSelectedEmployee(employee);
            setIsNewEmployee(false);
        } else {
            setSelectedEmployee(null);
            setIsNewEmployee(true);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedEmployee(null);
        setIsModalOpen(false);
        setIsNewEmployee(false);
    };

    const handleSaveEmployee = async (formData) => {
        const dataToSave = { ...formData };
        const dateFields = ['birth_date', 'hire_date', 'contract_start', 'contract_end', 'probation_end', 'iqama_expiry', 'passport_expiry'];
        dateFields.forEach(field => {
            if (dataToSave[field] === '') {
                dataToSave[field] = null;
            }
        });

        const newPassword = dataToSave.new_password;
        delete dataToSave.new_password;

        try {
            if (isNewEmployee) {
                // إنشاء موظف جديد
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: dataToSave.email,
                    password: newPassword,
                    options: {
                        data: {
                            name_ar: dataToSave.name_ar,
                        }
                    }
                });

                if (authError) throw authError;

                const { error: profileError } = await supabase
                    .from('profiles')
                    .update(dataToSave)
                    .eq('id', authData.user.id);

                if (profileError) throw profileError;

                // 🔥 تسجيل العملية (إضافة موظف)
                logSystemActivity(
                    user?.id, 
                    'ADD_EMPLOYEE', 
                    'USER', 
                    { name: dataToSave.name_ar, email: dataToSave.email },
                    authData.user.id
                );

                message.success('تم إضافة الموظف بنجاح');
            } else {
                // تحديث موظف موجود
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update(dataToSave)
                    .eq('id', selectedEmployee.id);
                
                if (profileError) throw profileError;

                if (newPassword && newPassword.length >= 8) {
                    const { data: passwordResult, error: passwordError } = await supabase.rpc(
                        'admin_update_user_password',
                        {
                            p_user_id: selectedEmployee.id,
                            p_new_password: newPassword
                        }
                    );
                    if (passwordError || !passwordResult?.success) {
                        message.warning('تم التحديث، ولكن فشل تغيير كلمة المرور');
                    } else {
                        message.success('تم تحديث البيانات وكلمة المرور');
                    }
                } else {
                    message.success('تم تحديث بيانات الموظف بنجاح');
                }

                // 🔥 تسجيل العملية (تحديث موظف)
                logSystemActivity(
                    user?.id, 
                    'UPDATE_EMPLOYEE', 
                    'USER', 
                    { name: dataToSave.name_ar },
                    selectedEmployee.id
                );
            }
            
            fetchEmployees();
            handleCloseModal();
        } catch (error) {
            handleSupabaseError(error, isNewEmployee ? 'فشل إضافة الموظف' : 'فشل تحديث الموظف');
        }
    };

    const handleDeleteEmployee = async (employeeId) => {
        try {
            // 🔥 تسجيل العملية قبل الحذف (لأن الاسم قد يختفي)
            const empName = employees.find(e => e.id === employeeId)?.name_ar || 'موظف';
            
            const { error } = await supabase.from('profiles').delete().eq('id', employeeId);
            if (error) throw error;

            // تسجيل الحذف
            logSystemActivity(
                user?.id, 
                'DELETE_EMPLOYEE', 
                'USER', 
                { name: empName, deleted_id: employeeId }
            );

            message.success('تم حذف الموظف بنجاح');
            fetchEmployees();
        } catch (error) {
            handleSupabaseError(error, 'فشل حذف الموظف');
        }
    };

    const handleImportEmployee = async (employeeData) => {
        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: employeeData.email,
                password: employeeData.password,
                options: {
                    data: {
                        name_ar: employeeData.name_ar,
                    }
                }
            });

            if (authError) throw authError;
            const { password, ...profileData } = employeeData;
            const { error: profileError } = await supabase
                .from('profiles')
                .update(profileData)
                .eq('id', authData.user.id);

            if (profileError) throw profileError;
            
            // 🔥 تسجيل الاستيراد
            logSystemActivity(
                user?.id, 
                'IMPORT_EMPLOYEE', 
                'USER', 
                { name: employeeData.name_ar, email: employeeData.email }
            );

            return { success: true };
        } catch (error) {
            console.error('خطأ في استيراد الموظف:', error);
            throw error;
        }
    };

    if (!profile || !['general_manager', 'admin', 'super_admin'].includes(profile.role)) {
        return null;
    }

    return (
        <>
            <Helmet><title>إدارة الموظفين (المدير)</title></Helmet>
            <div className="space-y-6">
                <PageTitle title="إدارة الموظفين المتقدمة" icon={UserCog} />
                <Badge variant="destructive" className="flex items-center gap-2 w-fit"><Shield size={16} /> وضع المدير المتقدم - تعديل كامل</Badge>
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>قائمة الموظفين</CardTitle>
                                <CardDescription>عرض وتعديل وحذف بيانات جميع الموظفين في النظام.</CardDescription>
                            </div>
                            <div className="flex gap-3 items-center">
                                <div className="relative w-64">
                                    <Input
                                        placeholder="بحث بالاسم, الايميل, أو الجوال..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-8 rtl:pr-8"
                                    />
                                    <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                                <Button onClick={() => setIsImportDialogOpen(true)} variant="outline">
                                    <FileSpreadsheet className="ml-2 h-4 w-4" />
                                    استيراد من Excel
                                </Button>
                                <Button onClick={() => handleOpenModal()} className="bg-green-600 hover:bg-green-700">
                                    <UserPlus className="ml-2 h-4 w-4" />
                                    إضافة موظف جديد
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? <div className="flex justify-center py-8"><Spin size="large"/></div> :
                        filteredEmployees.length === 0 ? <div className="text-center py-10"><Empty description="لم يتم العثور على موظفين." /></div> :
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader><TableRow><TableHead>الاسم</TableHead><TableHead>الدور</TableHead><TableHead>الجوال</TableHead><TableHead>المسمى الوظيفي</TableHead><TableHead>الراتب الأساسي</TableHead><TableHead>الحالة</TableHead><TableHead>الإجراءات</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {filteredEmployees.map((emp) => (
                                        <TableRow key={emp.id}>
                                            <TableCell className="font-medium">{emp.name_ar}</TableCell>
                                            <TableCell>{roleTranslation[emp.role] || emp.role}</TableCell>
                                            <TableCell>{emp.phone_number || '---'}</TableCell>
                                            <TableCell>{emp.job_title || '---'}</TableCell>
                                            <TableCell>{emp.base_salary ? `${emp.base_salary} ريال` : '---'}</TableCell>
                                            <TableCell><Badge variant={emp.is_active ? 'success' : 'destructive'}>{emp.is_active ? 'نشط' : 'معطل'}</Badge></TableCell>
                                            <TableCell className="flex gap-2">
                                                <Button variant="outline" size="icon" onClick={() => navigate(`/profile/${emp.id}`)} title="عرض الملف الشخصي"><Eye size={16} /></Button>
                                                <Button variant="outline" size="icon" onClick={() => handleOpenModal(emp)} title="تعديل"><Edit size={16} /></Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild><Button variant="destructive" size="icon" disabled={emp.id === profile.id} title="حذف"><Trash2 size={16} /></Button></AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>تأكيد الحذف</AlertDialogTitle><AlertDialogDescription>هل أنت متأكد من حذف الموظف "{emp.name_ar}"? سيتم حذف ملفه الشخصي من النظام بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه.</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteEmployee(emp.id)} className="bg-red-600 hover:bg-red-700">تأكيد الحذف</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>
                            {isNewEmployee ? 'إضافة موظف جديد' : `تعديل بيانات الموظف: ${selectedEmployee?.name_ar}`}
                        </DialogTitle>
                        <DialogDescription>
                            {isNewEmployee 
                                ? 'أدخل بيانات الموظف الجديد. الحقول المطلوبة محددة بـ *'
                                : 'يمكنك تعديل جميع تفاصيل الموظف من هنا (بما في ذلك الراتب والصلاحيات).'}
                        </DialogDescription>
                    </DialogHeader>
                    <EmployeeForm 
                        employee={selectedEmployee} 
                        onSave={handleSaveEmployee} 
                        onCancel={handleCloseModal}
                        isNew={isNewEmployee}
                    />
                </DialogContent>
            </Dialog>

            <ImportEmployeesDialog
                open={isImportDialogOpen}
                onClose={() => {
                    setIsImportDialogOpen(false);
                    fetchEmployees();
                }}
                onImport={handleImportEmployee}
            />
        </>
    );
};

export default EmployeeManagement;