import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Banknote, FileDown, Calculator, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Helmet } from 'react-helmet';
import { usePermission } from '@/contexts/PermissionContext';

const PayrollPage = () => {
    const { profile } = useAuth();
    const { checkPermission } = usePermission();
    const [payrollData, setPayrollData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()));

    const fetchPayrollData = useCallback(async () => {
        setLoading(true);
        
        const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

        try {
            // 1. جلب بيانات الموظفين
            const { data: employees, error: empError } = await supabase
                .from('profiles')
                .select(`
                    id, name_ar, national_id, city, bank_name, account_number,
                    base_salary, housing_allowance, transportation_allowance, other_allowances,
                    gosi_registration_date
                `)
                .eq('is_active', true);

            if (empError) throw empError;

            // 2. جلب الخصومات من attendance_deductions
            const { data: deductions, error: dedError } = await supabase
                .from('attendance_deductions')
                .select('user_id, amount, violation_type')
                .gte('deduction_date', monthStart)
                .lte('deduction_date', monthEnd);

            if (dedError) throw dedError;

            // 3. جلب خصومات السلف (✅ تم إصلاح اسم العمود)
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

            // 4. حساب البيانات لكل موظف
            const processedData = employees.map(emp => {
                // حساب إجمالي الراتب
                const grossSalary = (emp.base_salary || 0) + 
                                    (emp.housing_allowance || 0) + 
                                    (emp.transportation_allowance || 0) + 
                                    (emp.other_allowances || 0);

                // حساب التأمينات (GOSI)
                const gosiBase = Math.min((emp.base_salary || 0) + (emp.housing_allowance || 0), 45000);
                const cutoffDate = new Date('2024-07-03');
                const registrationDate = emp.gosi_registration_date ? new Date(emp.gosi_registration_date) : new Date('2024-01-01');
                const gosiRate = registrationDate >= cutoffDate ? 0.1025 : 0.0975;
                const gosiDeduction = parseFloat((gosiBase * gosiRate).toFixed(2));

                // حساب خصومات الحضور
                const attendanceDeductions = deductions
                    ?.filter(d => d.user_id === emp.id)
                    ?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;

                // حساب خصومات السلف (✅ تم إصلاح اسم العمود)
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
                    gosi_deduction: gosiDeduction,
                    attendance_deductions: attendanceDeductions,
                    loan_deduction: loanDeduction,
                    total_deductions: totalDeductions,
                    net_salary: netSalary,
                    transaction_reference: 'non'
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
        // ✅ استخدام الصلاحيات من النظام
        if (checkPermission('payroll')) {
            fetchPayrollData();
        } else {
            setLoading(false);
        }
    }, [profile, fetchPayrollData, checkPermission]);

    const handleExport = () => {
        toast({ title: '🚧 قيد التطوير!', description: 'سيتم تفعيل ميزة تصدير ملف WPS قريباً.' });
    };
    
    const formatCurrency = (amount) => Math.round(amount || 0).toLocaleString('en-US');
    // ✅ التحقق من الصلاحية عبر النظام
    if (!checkPermission('payroll')) {
        return (
            <div>
                <Helmet><title>الرواتب</title></Helmet>
                <PageTitle title='الرواتب' icon={Banknote} />
                <Card className="mt-6">
                    <CardContent className="p-8 text-center">
                        <p className="text-red-500 font-bold">⛔ ليس لديك صلاحية لعرض هذه الصفحة.</p>
                        <p className="text-gray-500 text-sm mt-2">تواصل مع المدير لطلب الصلاحية.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // حساب الإجماليات
    const totals = payrollData.reduce((acc, emp) => ({
        gross: acc.gross + (emp.gross_salary || 0),
        gosi: acc.gosi + (emp.gosi_deduction || 0),
        attendance: acc.attendance + (emp.attendance_deductions || 0),
        loan: acc.loan + (emp.loan_deduction || 0),
        deductions: acc.deductions + (emp.total_deductions || 0),
        net: acc.net + (emp.net_salary || 0)
    }), { gross: 0, gosi: 0, attendance: 0, loan: 0, deductions: 0, net: 0 });

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Helmet><title>مسير الرواتب</title></Helmet>
            <PageTitle title="مسير الرواتب" icon={Banknote} />
            
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
                        <CardTitle>مسير رواتب شهر: {format(selectedMonth, 'MMMM yyyy', { locale: ar })}</CardTitle>
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
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50">
                                    <TableHead className="font-bold">اسم الموظف</TableHead>
                                    <TableHead>الراتب الأساسي</TableHead>
                                    <TableHead>بدل السكن</TableHead>
                                    <TableHead>بدل المواصلات</TableHead>
                                    <TableHead>الإجمالي</TableHead>
                                    <TableHead className="text-blue-600">التأمينات</TableHead>
                                    <TableHead className="text-orange-600">خصم الحضور</TableHead>
                                    <TableHead className="text-purple-600">خصم السلف</TableHead>
                                    <TableHead className="text-red-600">إجمالي الخصومات</TableHead>
                                    <TableHead className="text-green-600 font-bold">الصافي</TableHead>
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
                                                <TableCell className="font-medium">{emp.name_ar || '---'}</TableCell>
                                                <TableCell>{formatCurrency(emp.base_salary)}</TableCell>
                                                <TableCell>{formatCurrency(emp.housing_allowance)}</TableCell>
                                                <TableCell>{formatCurrency(emp.transportation_allowance)}</TableCell>
                                                <TableCell className="font-medium">{formatCurrency(emp.gross_salary)}</TableCell>
                                                <TableCell className="text-blue-600">-{formatCurrency(emp.gosi_deduction)}</TableCell>
                                                <TableCell className="text-orange-600">
                                                    {emp.attendance_deductions > 0 ? `-${formatCurrency(emp.attendance_deductions)}` : '-'}
                                                </TableCell>
                                                <TableCell className="text-purple-600">
                                                    {emp.loan_deduction > 0 ? `-${formatCurrency(emp.loan_deduction)}` : '-'}
                                                </TableCell>
                                                <TableCell className="text-red-600 font-medium">-{formatCurrency(emp.total_deductions)}</TableCell>
                                                <TableCell className="text-green-600 font-bold">{formatCurrency(emp.net_salary)}</TableCell>
                                            </TableRow>
                                        ))}
                                        {/* صف الإجماليات */}
                                        <TableRow className="bg-gray-100 font-bold border-t-2">
                                            <TableCell>الإجمالي</TableCell>
                                            <TableCell>{formatCurrency(payrollData.reduce((s, e) => s + (e.base_salary || 0), 0))}</TableCell>
                                            <TableCell>{formatCurrency(payrollData.reduce((s, e) => s + (e.housing_allowance || 0), 0))}</TableCell>
                                            <TableCell>{formatCurrency(payrollData.reduce((s, e) => s + (e.transportation_allowance || 0), 0))}</TableCell>
                                            <TableCell>{formatCurrency(totals.gross)}</TableCell>
                                            <TableCell className="text-blue-600">-{formatCurrency(totals.gosi)}</TableCell>
                                            <TableCell className="text-orange-600">-{formatCurrency(totals.attendance)}</TableCell>
                                            <TableCell className="text-purple-600">-{formatCurrency(totals.loan)}</TableCell>
                                            <TableCell className="text-red-600">-{formatCurrency(totals.deductions)}</TableCell>
                                            <TableCell className="text-green-600">{formatCurrency(totals.net)}</TableCell>
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