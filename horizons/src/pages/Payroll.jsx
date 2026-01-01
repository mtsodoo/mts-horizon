import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Banknote, FileDown, RefreshCw, ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Helmet } from 'react-helmet';
import { usePermission } from '@/contexts/PermissionContext';

const PayrollPage = () => {
    const { profile } = useAuth();
    const { checkPermission } = usePermission();
    const [payrollData, setPayrollData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date());

    // ✅ قائمة الشهور المتاحة (آخر 12 شهر)
    const availableMonths = Array.from({ length: 12 }, (_, i) => {
        const date = subMonths(new Date(), i);
        return {
            value: format(date, 'yyyy-MM'),
            label: format(date, 'MMMM yyyy', { locale: ar }),
            date: date
        };
    });

    const fetchPayrollData = useCallback(async () => {
        setLoading(true);
        
        const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

        try {
            // 1️⃣ جلب بيانات الموظفين النشطين (استبعاد البوت وحسين وعبدالله)
            const { data: employees, error: empError } = await supabase
                .from('profiles')
                .select(`
                    id, name_ar, national_id, city, bank_name, account_number,
                    base_salary, housing_allowance, transportation_allowance, other_allowances,
                    gosi_registration_date, nationality, gosi_type, hire_date
                `)
                .eq('is_active', true)
                .not('name_ar', 'in', '("عمر","حسين الجندان","عبدالله عمر")');

            if (empError) throw empError;

            // 2️⃣ جلب الخصومات من attendance_deductions
            const { data: deductions, error: dedError } = await supabase
                .from('attendance_deductions')
                .select('user_id, amount, violation_type')
                .gte('deduction_date', monthStart)
                .lte('deduction_date', monthEnd);

            if (dedError) throw dedError;

            // 3️⃣ جلب خصومات السلف
            let loanDeductions = [];
            try {
                const { data, error } = await supabase
                    .from('loan_installments')
                    .select('user_id, installment_amount')
                    .gte('due_date', monthStart)
                    .lte('due_date', monthEnd)
                    .eq('status', 'pending');
                
                if (!error) loanDeductions = data || [];
            } catch (e) {
                console.warn('تحذير: لم نتمكن من جلب السلف', e);
            }

            // 4️⃣ جلب سجلات الحضور للشهر
            const { data: attendanceRecords, error: attError } = await supabase
                .from('attendance_records')
                .select('user_id, status, work_date')
                .gte('work_date', monthStart)
                .lte('work_date', monthEnd);

            if (attError) throw attError;

            // 5️⃣ حساب البيانات لكل موظف
            const processedData = employees.map(emp => {
                // حساب أيام العمل الفعلية
                const workingDays = attendanceRecords
                    ?.filter(r => r.user_id === emp.id && (r.status === 'present' || r.status === 'late'))
                    ?.length || 0;

                // ✅ حساب على أساس 30 يوم (نظام العمل السعودي)
                const monthDays = 30;
                
                // ✅ حساب الراتب التناسبي للموظفين الجدد (بناءً على hire_date)
                let workRatio = 1;
                let isPartialMonth = false;
                let daysEntitled = 30;
                
                if (emp.hire_date) {
                    const hireDate = new Date(emp.hire_date);
                    const monthStartDate = startOfMonth(selectedMonth);
                    const monthEndDate = endOfMonth(selectedMonth);
                    
                    // إذا تاريخ التعيين في نفس الشهر المختار
                    if (hireDate >= monthStartDate && hireDate <= monthEndDate) {
                        // حساب الأيام من تاريخ التعيين لنهاية الشهر
                        const lastDayOfMonth = monthEndDate.getDate();
                        const hireDay = hireDate.getDate();
                        daysEntitled = lastDayOfMonth - hireDay + 1;
                        workRatio = daysEntitled / monthDays;
                        isPartialMonth = true;
                    }
                    // إذا تاريخ التعيين بعد الشهر المختار = لا يستحق راتب
                    else if (hireDate > monthEndDate) {
                        daysEntitled = 0;
                        workRatio = 0;
                        isPartialMonth = true;
                    }
                }

                // حساب إجمالي الراتب الكامل
                const fullGrossSalary = (emp.base_salary || 0) + 
                                    (emp.housing_allowance || 0) + 
                                    (emp.transportation_allowance || 0) + 
                                    (emp.other_allowances || 0);
                
                // ✅ الراتب الفعلي (تناسبي إذا موظف جديد)
                const grossSalary = isPartialMonth ? Math.round(fullGrossSalary * workRatio) : fullGrossSalary;

                // حساب التأمينات (GOSI) - سعودي فقط - تناسبية
                let gosiDeduction = 0;
                const isSaudi = emp.nationality === 'سعودي' || emp.nationality === 'Saudi' || emp.gosi_type === 'saudi';
                
                if (isSaudi) {
                    // ✅ حساب GOSI على الراتب الفعلي وليس الكامل
                    const actualBaseSalary = isPartialMonth ? Math.round((emp.base_salary || 0) * workRatio) : (emp.base_salary || 0);
                    const actualHousing = isPartialMonth ? Math.round((emp.housing_allowance || 0) * workRatio) : (emp.housing_allowance || 0);
                    const gosiBase = Math.min(actualBaseSalary + actualHousing, 45000);
                    const cutoffDate = new Date('2024-07-03');
                    const registrationDate = emp.gosi_registration_date ? new Date(emp.gosi_registration_date) : new Date('2024-01-01');
                    const gosiRate = registrationDate >= cutoffDate ? 0.1025 : 0.0975;
                    gosiDeduction = parseFloat((gosiBase * gosiRate).toFixed(2));
                }

                // حساب خصومات الحضور
                const attendanceDeductions = deductions
                    ?.filter(d => d.user_id === emp.id)
                    ?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;

                // حساب خصومات السلف
                const loanDeduction = loanDeductions
                    ?.filter(l => l.user_id === emp.id)
                    ?.reduce((sum, l) => sum + (l.installment_amount || 0), 0) || 0;

                // إجمالي الخصومات
                const totalDeductions = gosiDeduction + attendanceDeductions + loanDeduction;

                // الراتب الصافي
                const netSalary = grossSalary - totalDeductions;

                return {
                    ...emp,
                    gross_salary: grossSalary,
                    full_gross_salary: fullGrossSalary,
                    gosi_deduction: gosiDeduction,
                    attendance_deductions: attendanceDeductions,
                    loan_deduction: loanDeduction,
                    total_deductions: totalDeductions,
                    net_salary: netSalary,
                    working_days: workingDays,
                    days_entitled: daysEntitled,
                    is_saudi: isSaudi,
                    is_partial_month: isPartialMonth,
                    work_ratio: workRatio
                };
            });

            setPayrollData(processedData);
        } catch (error) {
            console.error('Error:', error);
            toast({ variant: 'destructive', title: 'خطأ', description: 'لا يمكن جلب بيانات الرواتب' });
            setPayrollData([]);
        } finally {
            setLoading(false);
        }
    }, [selectedMonth]);

    useEffect(() => {
        if (checkPermission('payroll')) {
            fetchPayrollData();
        } else {
            setLoading(false);
        }
    }, [profile, fetchPayrollData, checkPermission]);

    // ✅ التنقل بين الشهور
    const goToPreviousMonth = () => setSelectedMonth(prev => subMonths(prev, 1));
    const goToNextMonth = () => {
        const nextMonth = addMonths(selectedMonth, 1);
        if (nextMonth <= new Date()) setSelectedMonth(nextMonth);
    };

    const handleMonthChange = (value) => {
        const selected = availableMonths.find(m => m.value === value);
        if (selected) setSelectedMonth(selected.date);
    };

    const handleExport = () => {
        toast({ title: '🚧 قيد التطوير!', description: 'سيتم تفعيل ميزة تصدير ملف WPS قريباً.' });
    };
    
    const formatCurrency = (amount) => Math.round(amount || 0).toLocaleString('en-US');

    if (!checkPermission('payroll')) {
        return (
            <div>
                <Helmet><title>الرواتب</title></Helmet>
                <PageTitle title='الرواتب' icon={Banknote} />
                <Card className="mt-6">
                    <CardContent className="p-8 text-center">
                        <p className="text-red-500 font-bold">⛔ ليس لديك صلاحية لعرض هذه الصفحة.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const totals = payrollData.reduce((acc, emp) => ({
        gross: acc.gross + (emp.gross_salary || 0),
        gosi: acc.gosi + (emp.gosi_deduction || 0),
        attendance: acc.attendance + (emp.attendance_deductions || 0),
        loan: acc.loan + (emp.loan_deduction || 0),
        deductions: acc.deductions + (emp.total_deductions || 0),
        net: acc.net + (emp.net_salary || 0)
    }), { gross: 0, gosi: 0, attendance: 0, loan: 0, deductions: 0, net: 0 });

    const isCurrentMonth = format(selectedMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM');

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Helmet><title>مسير الرواتب</title></Helmet>
            <PageTitle title="مسير الرواتب" icon={Banknote} />
            
            {/* ✅ فلتر اختيار الشهر */}
            <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-slate-600" />
                            <span className="font-semibold text-slate-700">اختر الشهر:</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            
                            <Select value={format(selectedMonth, 'yyyy-MM')} onValueChange={handleMonthChange}>
                                <SelectTrigger className="w-[200px] bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableMonths.map(month => (
                                        <SelectItem key={month.value} value={month.value}>
                                            {month.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            
                            <Button variant="outline" size="icon" onClick={goToNextMonth} disabled={isCurrentMonth}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        </div>
                        
                        <div className="flex gap-2">
                            <Button 
                                variant={isCurrentMonth ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedMonth(new Date())}
                            >
                                الشهر الحالي
                            </Button>
                            <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedMonth(subMonths(new Date(), 1))}
                            >
                                الشهر السابق
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            {/* ملخص سريع */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4 text-center">
                        <p className="text-xs text-blue-600 mb-1">إجمالي الرواتب</p>
                        <p className="text-xl font-bold text-blue-800">{formatCurrency(totals.gross)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                    <CardContent className="p-4 text-center">
                        <p className="text-xs text-red-600 mb-1">إجمالي الخصومات</p>
                        <p className="text-xl font-bold text-red-800">{formatCurrency(totals.deductions)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <CardContent className="p-4 text-center">
                        <p className="text-xs text-orange-600 mb-1">خصومات الحضور</p>
                        <p className="text-xl font-bold text-orange-800">{formatCurrency(totals.attendance)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4 text-center">
                        <p className="text-xs text-green-600 mb-1">صافي الرواتب</p>
                        <p className="text-xl font-bold text-green-800">{formatCurrency(totals.net)}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <CardTitle className="flex items-center gap-2">
                            مسير رواتب شهر: 
                            <span className="text-blue-600">{format(selectedMonth, 'MMMM yyyy', { locale: ar })}</span>
                            {!isCurrentMonth && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">شهر سابق</span>
                            )}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Button onClick={fetchPayrollData} variant="outline" disabled={loading}>
                                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                تحديث
                            </Button>
                            <Button variant="outline" onClick={handleExport}>
                                <FileDown className="mr-2 h-4 w-4" />
                                تصدير WPS
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto" dir="rtl">
                        <Table className="text-right">
                            <TableHeader>
                                <TableRow className="bg-gray-50">
                                    <TableHead className="text-right font-bold">اسم الموظف</TableHead>
                                    <TableHead className="text-right">الراتب الأساسي</TableHead>
                                    <TableHead className="text-right">بدل السكن</TableHead>
                                    <TableHead className="text-right">بدل المواصلات</TableHead>
                                    <TableHead className="text-right">الإجمالي</TableHead>
                                    <TableHead className="text-right text-blue-600">التأمينات</TableHead>
                                    <TableHead className="text-right text-orange-600">خصم الحضور</TableHead>
                                    <TableHead className="text-right text-purple-600">خصم السلف</TableHead>
                                    <TableHead className="text-right text-red-600">إجمالي الخصومات</TableHead>
                                    <TableHead className="text-right text-green-600 font-bold">الصافي</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-8">
                                            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
                                            جاري تحميل البيانات...
                                        </TableCell>
                                    </TableRow>
                                ) : payrollData.length > 0 ? (
                                    <>
                                        {payrollData.map(emp => (
                                            <TableRow key={emp.id} className="hover:bg-gray-50">
                                                <TableCell className="text-right font-medium">
                                                    {emp.name_ar || '---'}
                                                    {emp.is_partial_month && (
                                                        <span className="text-xs text-orange-500 block">({emp.days_entitled} يوم من 30)</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">{formatCurrency(emp.base_salary)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(emp.housing_allowance)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(emp.transportation_allowance)}</TableCell>
                                                <TableCell className="text-right font-semibold">{formatCurrency(emp.gross_salary)}</TableCell>
                                                <TableCell className="text-right text-blue-600">
                                                    {emp.gosi_deduction > 0 
                                                        ? `-${formatCurrency(emp.gosi_deduction)}` 
                                                        : <span className="text-gray-400 text-xs">معفى</span>}
                                                </TableCell>
                                                <TableCell className="text-right text-orange-600">
                                                    {emp.attendance_deductions > 0 ? `-${formatCurrency(emp.attendance_deductions)}` : '-'}
                                                </TableCell>
                                                <TableCell className="text-right text-purple-600">
                                                    {emp.loan_deduction > 0 ? `-${formatCurrency(emp.loan_deduction)}` : '-'}
                                                </TableCell>
                                                <TableCell className="text-right text-red-600 font-semibold">
                                                    -{formatCurrency(emp.total_deductions)}
                                                </TableCell>
                                                <TableCell className="text-right text-green-600 font-bold">
                                                    {formatCurrency(emp.net_salary)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow className="bg-gray-100 font-bold border-t-2">
                                            <TableCell className="text-right">الإجمالي ({payrollData.length} موظف)</TableCell>
                                            <TableCell className="text-right">{formatCurrency(payrollData.reduce((s, e) => s + (e.base_salary || 0), 0))}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(payrollData.reduce((s, e) => s + (e.housing_allowance || 0), 0))}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(payrollData.reduce((s, e) => s + (e.transportation_allowance || 0), 0))}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(totals.gross)}</TableCell>
                                            <TableCell className="text-right text-blue-600">-{formatCurrency(totals.gosi)}</TableCell>
                                            <TableCell className="text-right text-orange-600">-{formatCurrency(totals.attendance)}</TableCell>
                                            <TableCell className="text-right text-purple-600">-{formatCurrency(totals.loan)}</TableCell>
                                            <TableCell className="text-right text-red-600">-{formatCurrency(totals.deductions)}</TableCell>
                                            <TableCell className="text-right text-green-600">{formatCurrency(totals.net)}</TableCell>
                                        </TableRow>
                                    </>
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                                            لا يوجد موظفين نشطين
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default PayrollPage;