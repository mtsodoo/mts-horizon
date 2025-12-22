import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO } from 'date-fns';
import { Helmet } from 'react-helmet';

const roleTranslation = {
  'super_admin': 'Super Admin',
  'general_manager': 'مدير عام',
  'admin': 'أدمن',
  'department_head': 'مدير قسم',
  'project_manager': 'مدير مشروع',
  'finance': 'مالي',
  'employee': 'موظف',
};

const formatDateForDisplay = (date) => {
    if (!date) return '---';
    try {
        return format(typeof date === 'string' ? parseISO(date) : date, 'dd/MM/yyyy');
    } catch (error) {
        return '---';
    }
};

// مكون عرض تفاصيل الموظف فقط (بدون تعديل)
const EmployeeViewDialog = ({ employee, onClose }) => {
    if (!employee) return null;

    return (
        <Dialog open={!!employee} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>تفاصيل الموظف: {employee.name_ar}</DialogTitle>
                </DialogHeader>
                
                <Tabs defaultValue="personal">
                    <TabsList className="grid w-full grid-cols-5 mb-4">
                        <TabsTrigger value="personal">المعلومات الشخصية</TabsTrigger>
                        <TabsTrigger value="job">المعلومات الوظيفية</TabsTrigger>
                        <TabsTrigger value="financial">المعلومات المالية</TabsTrigger>
                        <TabsTrigger value="docs">الهويات والوثائق</TabsTrigger>
                        <TabsTrigger value="emergency">الاتصال في الطوارئ</TabsTrigger>
                    </TabsList>

                    <TabsContent value="personal" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label className="text-muted-foreground">الاسم (عربي)</Label><p className="font-medium">{employee.name_ar || '---'}</p></div>
                            <div><Label className="text-muted-foreground">الاسم (إنجليزي)</Label><p className="font-medium">{employee.name_en || '---'}</p></div>
                            <div><Label className="text-muted-foreground">البريد الإلكتروني</Label><p className="font-medium">{employee.email || '---'}</p></div>
                            <div><Label className="text-muted-foreground">رقم الجوال</Label><p className="font-medium">{employee.phone_number || '---'}</p></div>
                            <div><Label className="text-muted-foreground">تاريخ الميلاد</Label><p className="font-medium">{formatDateForDisplay(employee.birth_date)}</p></div>
                            <div><Label className="text-muted-foreground">الجنسية</Label><p className="font-medium">{employee.nationality || '---'}</p></div>
                            <div><Label className="text-muted-foreground">الجنس</Label><p className="font-medium">{employee.gender === 'male' ? 'ذكر' : employee.gender === 'female' ? 'أنثى' : '---'}</p></div>
                            <div><Label className="text-muted-foreground">الحالة الاجتماعية</Label><p className="font-medium">{employee.marital_status || '---'}</p></div>
                            <div className="md:col-span-2"><Label className="text-muted-foreground">العنوان</Label><p className="font-medium">{employee.address || '---'}</p></div>
                            <div><Label className="text-muted-foreground">المدينة</Label><p className="font-medium">{employee.city || '---'}</p></div>
                            <div><Label className="text-muted-foreground">العنوان الوطني المختصر</Label><p className="font-medium">{employee.national_address_short || '---'}</p></div>
                        </div>
                    </TabsContent>

                    <TabsContent value="job" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label className="text-muted-foreground">المسمى الوظيفي</Label><p className="font-medium">{employee.job_title || '---'}</p></div>
                            <div><Label className="text-muted-foreground">القسم</Label><p className="font-medium">{employee.department || '---'}</p></div>
                            <div><Label className="text-muted-foreground">الدور بالنظام</Label><p className="font-medium">{roleTranslation[employee.role] || employee.role}</p></div>
                            <div><Label className="text-muted-foreground">تاريخ التعيين</Label><p className="font-medium">{formatDateForDisplay(employee.hire_date)}</p></div>
                            <div><Label className="text-muted-foreground">نوع العقد</Label><p className="font-medium">{employee.contract_type || '---'}</p></div>
                            <div><Label className="text-muted-foreground">تاريخ بداية العقد</Label><p className="font-medium">{formatDateForDisplay(employee.contract_start)}</p></div>
                            <div><Label className="text-muted-foreground">تاريخ نهاية العقد</Label><p className="font-medium">{formatDateForDisplay(employee.contract_end)}</p></div>
                            <div><Label className="text-muted-foreground">نهاية فترة التجربة</Label><p className="font-medium">{formatDateForDisplay(employee.probation_end)}</p></div>
                            <div><Label className="text-muted-foreground">الحالة</Label><p className="font-medium">{employee.is_active ? '✅ نشط' : '❌ معطل'}</p></div>
                        </div>
                    </TabsContent>

                    <TabsContent value="financial" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label className="text-muted-foreground">الراتب الأساسي</Label><p className="font-medium">{employee.base_salary ? `${employee.base_salary} ريال` : '---'}</p></div>
                            <div><Label className="text-muted-foreground">بدل السكن</Label><p className="font-medium">{employee.housing_allowance ? `${employee.housing_allowance} ريال` : '---'}</p></div>
                            <div><Label className="text-muted-foreground">بدل النقل</Label><p className="font-medium">{employee.transportation_allowance ? `${employee.transportation_allowance} ريال` : '---'}</p></div>
                            <div><Label className="text-muted-foreground">بدلات أخرى</Label><p className="font-medium">{employee.other_allowances ? `${employee.other_allowances} ريال` : '---'}</p></div>
                            <div><Label className="text-muted-foreground">اسم البنك</Label><p className="font-medium">{employee.bank_name || '---'}</p></div>
                            <div><Label className="text-muted-foreground">IBAN</Label><p className="font-medium">{employee.iban || '---'}</p></div>
                            <div><Label className="text-muted-foreground">رصيد الإجازة السنوية</Label><p className="font-medium">{employee.annual_leave_balance ?? '---'}</p></div>
                            <div><Label className="text-muted-foreground">رصيد الإجازة المرضية</Label><p className="font-medium">{employee.sick_leave_balance ?? '---'}</p></div>
                        </div>
                    </TabsContent>

                    <TabsContent value="docs" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label className="text-muted-foreground">رقم الهوية الوطنية</Label><p className="font-medium">{employee.national_id || '---'}</p></div>
                            <div><Label className="text-muted-foreground">رقم الإقامة</Label><p className="font-medium">{employee.iqama_number || '---'}</p></div>
                            <div><Label className="text-muted-foreground">تاريخ انتهاء الإقامة</Label><p className="font-medium">{formatDateForDisplay(employee.iqama_expiry)}</p></div>
                            <div><Label className="text-muted-foreground">رقم جواز السفر</Label><p className="font-medium">{employee.passport_number || '---'}</p></div>
                            <div><Label className="text-muted-foreground">تاريخ انتهاء الجواز</Label><p className="font-medium">{formatDateForDisplay(employee.passport_expiry)}</p></div>
                            <div><Label className="text-muted-foreground">رقم التأمينات الاجتماعية</Label><p className="font-medium">{employee.social_insurance_number || '---'}</p></div>
                            <div><Label className="text-muted-foreground">رقم التأمين الطبي</Label><p className="font-medium">{employee.medical_insurance_number || '---'}</p></div>
                            <div><Label className="text-muted-foreground">فئة التأمين الطبي</Label><p className="font-medium">{employee.medical_insurance_category || '---'}</p></div>
                        </div>
                    </TabsContent>

                    <TabsContent value="emergency" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label className="text-muted-foreground">اسم جهة الاتصال</Label><p className="font-medium">{employee.emergency_contact_name || '---'}</p></div>
                            <div><Label className="text-muted-foreground">رقم جوال جهة الاتصال</Label><p className="font-medium">{employee.emergency_contact_phone || '---'}</p></div>
                            <div className="md:col-span-2"><Label className="text-muted-foreground">ملاحظات</Label><p className="font-medium">{employee.notes || '---'}</p></div>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end pt-4 border-t">
                    <Button onClick={onClose}>إغلاق</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const EmployeesPage = () => {
    const { profile } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchEmployees = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('name_ar', { ascending: true });
        
        if (error) {
            toast({ variant: 'destructive', title: 'خطأ', description: `لا يمكن جلب الموظفين: ${error.message}` });
            setEmployees([]);
        } else {
            setEmployees(data || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);
    
    useEffect(() => {
        let result = employees;
        if (searchTerm) {
            result = result.filter(emp => 
                emp.name_ar?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                emp.phone_number?.includes(searchTerm) ||
                emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (roleFilter !== 'all') {
            result = result.filter(emp => emp.role === roleFilter);
        }
        if (statusFilter !== 'all') {
            result = result.filter(emp => (statusFilter === 'active' ? emp.is_active : !emp.is_active));
        }
        setFilteredEmployees(result);
    }, [employees, searchTerm, roleFilter, statusFilter]);

    const handleViewEmployee = (employee) => {
        setSelectedEmployee(employee);
    };

    const handleCloseView = () => {
        setSelectedEmployee(null);
    };

    if (loading) {
        return <div className="text-center p-8">جاري التحميل...</div>
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Helmet><title>شؤون الموظفين</title></Helmet>
            <PageTitle title="شؤون الموظفين" icon={Users} />
            
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <CardTitle>قائمة الموظفين</CardTitle>
                            <CardDescription>عرض بيانات جميع الموظفين في النظام (عرض فقط)</CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                            <div className="relative w-full md:w-auto">
                                <Search className="absolute left-2.5 rtl:right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    type="search" 
                                    placeholder="بحث بالاسم أو الجوال..." 
                                    className="pl-8 rtl:pr-8 w-full" 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                />
                            </div>
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="w-full md:w-[180px]">
                                    <SelectValue placeholder="فلتر بالدور" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">كل الأدوار</SelectItem>
                                    {Object.entries(roleTranslation).map(([k,v]) => 
                                        <SelectItem key={k} value={k}>{v}</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full md:w-[180px]">
                                    <SelectValue placeholder="فلتر بالحالة" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">كل الحالات</SelectItem>
                                    <SelectItem value="active">نشط</SelectItem>
                                    <SelectItem value="inactive">معطل</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>الاسم</TableHead>
                                    <TableHead>الجوال</TableHead>
                                    <TableHead>الدور</TableHead>
                                    <TableHead>القسم</TableHead>
                                    <TableHead>المسمى الوظيفي</TableHead>
                                    <TableHead>تاريخ التوظيف</TableHead>
                                    <TableHead>الحالة</TableHead>
                                    <TableHead>الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!loading && filteredEmployees.length > 0 ? (
                                    filteredEmployees.map(emp => (
                                        <TableRow key={emp.id} className="hover:bg-muted/50">
                                            <TableCell className="font-medium">{emp.name_ar}</TableCell>
                                            <TableCell>{emp.phone_number || '---'}</TableCell>
                                            <TableCell>
                                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                                    {roleTranslation[emp.role] || emp.role}
                                                </span>
                                            </TableCell>
                                            <TableCell>{emp.department || '---'}</TableCell>
                                            <TableCell>{emp.job_title || '---'}</TableCell>
                                            <TableCell>{formatDateForDisplay(emp.hire_date)}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                    emp.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {emp.is_active ? 'نشط' : 'معطل'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    onClick={() => handleViewEmployee(emp)}
                                                    title="عرض التفاصيل"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center">
                                            {loading ? "جاري التحميل..." : "لم يتم العثور على موظفين."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {selectedEmployee && (
                <EmployeeViewDialog 
                    employee={selectedEmployee} 
                    onClose={handleCloseView} 
                />
            )}
        </motion.div>
    );
};

export default EmployeesPage;