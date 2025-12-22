import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Modal, Spin, Button as AntButton, message, Popconfirm, Tag, Empty, DatePicker } from 'antd';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
import { formatCurrency, getStatusColor, getStatusLabel } from '@/utils/financialUtils';
import { Download, Paperclip, Trash2, PlusCircle } from 'lucide-react';
import dayjs from 'dayjs';

const expenseCategories = ["مواصلات", "إقامة", "مواد", "معدات", "طعام وشراب", "خدمات", "أخرى"];

const ReviewSettlementModal = ({ settlementId, visible, onCancel, onFinish }) => {
    const { profile } = useAuth();
    const [settlement, setSettlement] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reviewNotes, setReviewNotes] = useState('');
    const [isAddingExpense, setIsAddingExpense] = useState(false);
    const [newExpense, setNewExpense] = useState({ expense_date: dayjs(), amount: '', category: '', description: '', receipt_url: '' });

    const isSuperAdmin = ['super_admin', 'general_manager'].includes(profile?.role);

    const fetchData = useCallback(async () => {
        if (!settlementId) return;
        setLoading(true);
        try {
            const { data: settlementData, error: settlementError } = await supabase
                .from('custody_settlements')
                .select('*, employee:profiles!custody_settlements_user_id_fkey(name_ar, department)')
                .eq('id', settlementId)
                .single();
            if (settlementError) throw settlementError;
            setSettlement(settlementData);
            setReviewNotes(settlementData.review_notes || '');

            const { data: expensesData, error: expensesError } = await supabase
                .from('settlement_expenses')
                .select('*')
                .eq('settlement_id', settlementId)
                .order('expense_date', { ascending: true });
            if (expensesError) throw expensesError;
            setExpenses(expensesData || []);

            const { data: invoicesData, error: invoicesError } = await supabase
                .from('settlement_invoices')
                .select('*')
                .eq('settlement_id', settlementId);
            if (invoicesError) throw invoicesError;
            setInvoices(invoicesData || []);

        } catch (error) {
            handleSupabaseError(error, 'فشل في جلب تفاصيل التسوية');
            onCancel();
        } finally {
            setLoading(false);
        }
    }, [settlementId, onCancel]);

    useEffect(() => {
        if (visible) {
            fetchData();
        }
    }, [visible, fetchData]);

    const handleExpenseStatusChange = async (expenseId, status) => {
        try {
            const { error } = await supabase.from('settlement_expenses').update({ status }).eq('id', expenseId);
            if (error) throw error;
            message.success('تم تحديث حالة المصروف.');
            fetchData(); // Refresh data
        } catch (error) {
            handleSupabaseError(error, 'فشل تحديث حالة المصروف');
        }
    };

    const handleSettlementAction = async (status) => {
        try {
            const { error } = await supabase.from('custody_settlements').update({ status, review_notes: reviewNotes, reviewed_by: profile.id, reviewed_at: new Date().toISOString() }).eq('id', settlementId);
            if (error) throw error;
            message.success(`تم ${status === 'approved' ? 'اعتماد' : 'رفض'} التسوية.`);
            onFinish();
        } catch (error) {
            handleSupabaseError(error, 'فشل تحديث حالة التسوية');
        }
    };

    const handleAddExpense = async () => {
        if (!newExpense.amount || !newExpense.category || !newExpense.receipt_url) {
            message.error('يرجى ملء جميع حقول المصروف الجديد.');
            return;
        }
        try {
            const { error } = await supabase.from('settlement_expenses').insert({
                settlement_id: settlementId,
                user_id: settlement.user_id,
                expense_date: newExpense.expense_date.format('YYYY-MM-DD'),
                amount: newExpense.amount,
                category: newExpense.category,
                description: newExpense.description,
                receipt_url: newExpense.receipt_url,
                receipt_file_name: 'Manually Added',
                status: 'approved' // Admin-added expenses are auto-approved
            });
            if (error) throw error;
            message.success('تمت إضافة المصروف بنجاح.');
            setIsAddingExpense(false);
            setNewExpense({ expense_date: dayjs(), amount: '', category: '', description: '', receipt_url: '' });
            fetchData();
        } catch (error) {
            handleSupabaseError(error, 'فشل إضافة المصروف');
        }
    };

    const handleDeleteExpense = async (expenseId) => {
        try {
            const { error } = await supabase.from('settlement_expenses').delete().eq('id', expenseId);
            if (error) throw error;
            message.success('تم حذف المصروف بنجاح.');
            fetchData();
        } catch (error) {
            handleSupabaseError(error, 'فشل حذف المصروف');
        }
    };

    const canTakeAction = settlement?.status === 'pending_review';

    return (
        <Modal
            title={`مراجعة تسوية عهدة - ${settlement?.employee?.name_ar || ''}`}
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={1000}
            centered
        >
            {loading ? <div className="flex justify-center items-center h-96"><Spin size="large" /></div> :
            !settlement ? <Empty description="لم يتم العثور على التسوية" /> :
            <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-gray-50">
                    <div><p className="text-sm text-gray-500">الموظف</p><p className="font-semibold">{settlement.employee.name_ar}</p></div>
                    <div><p className="text-sm text-gray-500">مبلغ العهدة</p><p className="font-semibold text-green-600">{formatCurrency(settlement.custody_amount)}</p></div>
                    <div><p className="text-sm text-gray-500">إجمالي المصروفات</p><p className="font-semibold text-orange-600">{formatCurrency(settlement.total_expenses)}</p></div>
                    <div><p className="text-sm text-gray-500">المتبقي / العجز</p><p className={`font-semibold ${settlement.remaining_amount >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(settlement.remaining_amount)}</p></div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">الفواتير المرفقة</h3>
                    {invoices.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {invoices.map(inv => (
                                <a key={inv.id} href={inv.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 border rounded-md hover:bg-gray-100">
                                    <Paperclip className="h-5 w-5 text-gray-500" />
                                    <span className="text-sm font-medium truncate">{inv.file_name}</span>
                                    <Download className="h-5 w-5 text-blue-500 ml-auto" />
                                </a>
                            ))}
                        </div>
                    ) : <Empty description="لا توجد فواتير مرفقة" />}
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">تفاصيل المصروفات</h3>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>المبلغ</TableHead><TableHead>الفئة</TableHead><TableHead>الوصف</TableHead><TableHead>الفاتورة</TableHead><TableHead>الحالة</TableHead><TableHead>الإجراء</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {expenses.map(exp => (
                                    <TableRow key={exp.id}>
                                        <TableCell>{format(new Date(exp.expense_date), 'yyyy/MM/dd')}</TableCell>
                                        <TableCell>{formatCurrency(exp.amount)}</TableCell>
                                        <TableCell>{exp.category}</TableCell>
                                        <TableCell>{exp.description}</TableCell>
                                        <TableCell><a href={exp.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">عرض</a></TableCell>
                                        <TableCell><Tag color={getStatusColor(exp.status, true)}>{getStatusLabel(exp.status, true)}</Tag></TableCell>
                                        <TableCell className="space-x-1">
                                            {canTakeAction && exp.status === 'pending' && (
                                                <>
                                                    <Popconfirm title="هل أنت متأكد من قبول هذا المصروف؟" onConfirm={() => handleExpenseStatusChange(exp.id, 'approved')}><AntButton size="small" type="primary" ghost>قبول</AntButton></Popconfirm>
                                                    <Popconfirm title="هل أنت متأكد من رفض هذا المصروف؟" onConfirm={() => handleExpenseStatusChange(exp.id, 'rejected')}><AntButton size="small" danger ghost>رفض</AntButton></Popconfirm>
                                                </>
                                            )}
                                            {isSuperAdmin && <Popconfirm title="هل أنت متأكد من حذف هذا المصروف؟" onConfirm={() => handleDeleteExpense(exp.id)}><Button variant="destructive" size="icon" className="h-6 w-6"><Trash2 size={14} /></Button></Popconfirm>}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {isAddingExpense && (
                                    <TableRow>
                                        <TableCell><DatePicker size="small" value={newExpense.expense_date} onChange={d => setNewExpense(p => ({...p, expense_date: d}))} /></TableCell>
                                        <TableCell><Input size="small" type="number" placeholder="المبلغ" value={newExpense.amount} onChange={e => setNewExpense(p => ({...p, amount: e.target.value}))} /></TableCell>
                                        <TableCell>
                                            <Select value={newExpense.category} onValueChange={v => setNewExpense(p => ({...p, category: v}))}>
                                                <SelectTrigger className="h-8"><SelectValue placeholder="الفئة" /></SelectTrigger>
                                                <SelectContent>{expenseCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell><Input size="small" placeholder="الوصف" value={newExpense.description} onChange={e => setNewExpense(p => ({...p, description: e.target.value}))} /></TableCell>
                                        <TableCell><Input size="small" placeholder="رابط الفاتورة" value={newExpense.receipt_url} onChange={e => setNewExpense(p => ({...p, receipt_url: e.target.value}))} /></TableCell>
                                        <TableCell></TableCell>
                                        <TableCell className="space-x-1">
                                            <AntButton size="small" type="primary" onClick={handleAddExpense}>حفظ</AntButton>
                                            <AntButton size="small" onClick={() => setIsAddingExpense(false)}>إلغاء</AntButton>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        {isSuperAdmin && !isAddingExpense && <Button variant="outline" size="sm" className="mt-2" onClick={() => setIsAddingExpense(true)}><PlusCircle size={16} className="mr-2" /> إضافة مصروف</Button>}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="review_notes">ملاحظات المراجعة</Label>
                    <Textarea id="review_notes" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="أضف ملاحظاتك هنا..." disabled={!canTakeAction} />
                </div>

                {canTakeAction && (
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <AntButton onClick={onCancel}>إلغاء</AntButton>
                        <Popconfirm title="هل أنت متأكد من رفض التسوية؟" onConfirm={() => handleSettlementAction('rejected')} disabled={!reviewNotes}><AntButton danger disabled={!reviewNotes}>رفض التسوية</AntButton></Popconfirm>
                        <Popconfirm title="هل أنت متأكد من اعتماد التسوية؟" onConfirm={() => handleSettlementAction('approved')}><AntButton type="primary">اعتماد التسوية</AntButton></Popconfirm>
                    </div>
                )}
            </div>
            }
        </Modal>
    );
};

export default ReviewSettlementModal;