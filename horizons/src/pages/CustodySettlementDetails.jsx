import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Helmet } from 'react-helmet';
import PageTitle from '@/components/PageTitle';
import AddExpenseModal from '@/components/AddExpenseModal';
import ReceiptViewer from '@/components/ReceiptViewer';
import SettlementSummary from '@/components/SettlementSummary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileText, PlusCircle, Trash2, MoreVertical, AlertCircle, File, Download, Send, AlertTriangle } from 'lucide-react';
import { Empty, Spin, Tag, Popconfirm, message, Modal as AntdModal } from 'antd';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES, formatCurrency, getExpenseIcon, getDeficitLabel } from '@/utils/financialUtils';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';

const CustodySettlementDetails = () => {
    const { settlementId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [settlement, setSettlement] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
    const [receiptViewer, setReceiptViewer] = useState({ visible: false, url: '' });

    const fetchData = useCallback(async () => {
        if (!settlementId || !user) return;
        setLoading(true);
        setError(null);
        try {
            const [settlementRes, expensesRes] = await Promise.all([
                supabase.from('custody_settlements').select('*').eq('id', settlementId).eq('user_id', user.id).single(),
                supabase.from('settlement_expenses').select('*').eq('settlement_id', settlementId).order('expense_date', { ascending: false }),
            ]);

            if (settlementRes.error) {
                if (settlementRes.error.code === 'PGRST116') {
                     setError('لا يمكن الوصول لهذه التسوية أو أنها غير موجودة.');
                     navigate('/my-custody-settlements');
                } else {
                    throw settlementRes.error;
                }
                return;
            }
            if (expensesRes.error) throw expensesRes.error;

            setSettlement(settlementRes.data);
            setExpenses(expensesRes.data);
        } catch (err) {
            setError('فشل في تحميل تفاصيل التسوية.');
            handleSupabaseError(err, 'فشل جلب تفاصيل التسوية');
        } finally {
            setLoading(false);
        }
    }, [settlementId, user, navigate]);

    useEffect(() => {
        fetchData();
        const channel = supabase.channel(`settlement-details-${settlementId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'settlement_expenses', filter: `settlement_id=eq.${settlementId}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'custody_settlements', filter: `id=eq.${settlementId}` }, fetchData)
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [fetchData, settlementId]);

    const handleSubmitForReview = () => {
        const remainingAmount = settlement.custody_amount - (settlement.total_expenses || 0);
        const deficitLabel = getDeficitLabel(remainingAmount);
        const formattedAmount = formatCurrency(Math.abs(remainingAmount));

        const confirmationContent = (
            <div className="space-y-4 text-right">
                <p>هل أنت متأكد من تقديم هذه التسوية للمراجعة؟</p>
                {remainingAmount !== 0 && (
                     <div className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-yellow-500 ml-3 mt-1" />
                        <div>
                            <p className="font-semibold">تنبيه:</p>
                            <p>سيتم تسجيل {deficitLabel} بقيمة {formattedAmount} في هذه التسوية.</p>
                        </div>
                    </div>
                )}
                <p className="text-sm text-gray-500">لا يمكن تعديل التسوية بعد تقديمها.</p>
            </div>
        );

        AntdModal.confirm({
            title: 'تأكيد تقديم التسوية',
            content: confirmationContent,
            okText: 'نعم، قم بالتقديم',
            cancelText: 'إلغاء',
            onOk: async () => {
                setIsSubmitting(true);
                try {
                    const { error: updateError } = await supabase
                        .from('custody_settlements')
                        .update({ 
                            status: 'pending_review',
                            submitted_at: new Date().toISOString(),
                            submitted_by: user.id
                        })
                        .eq('id', settlement.id);

                    if (updateError) throw updateError;
                    
                    message.success('تم تقديم التسوية للمراجعة بنجاح.');
                    // Realtime will trigger fetchData to update UI
                } catch (err) {
                    handleSupabaseError(err, 'فشل تقديم التسوية للمراجعة');
                } finally {
                    setIsSubmitting(false);
                }
            },
        });
    };

    const handleDeleteExpense = async (expenseId) => {
        try {
            const { error } = await supabase.from('settlement_expenses').delete().eq('id', expenseId);
            if (error) throw error;
            message.success('تم حذف البند بنجاح.');
        } catch (err) {
            handleSupabaseError(err, 'فشل حذف البند');
        }
    };
    
    const canEdit = settlement?.user_id === user?.id && (settlement?.status === 'open' || settlement?.status === 'rejected');
    const canSubmit = canEdit && expenses.length > 0 && settlement?.status === 'open';

    if (loading) return <div className="flex justify-center items-center h-screen"><Spin size="large" /></div>;
    if (error) return <div className="flex flex-col items-center justify-center h-screen bg-red-50 border border-red-200 rounded-lg p-8"><AlertCircle className="w-16 h-16 text-red-500 mb-4" /><p className="text-red-700 font-semibold text-xl">{error}</p><Button onClick={() => navigate('/my-custody-settlements')} className="mt-6">العودة لصفحتي</Button></div>;
    if (!settlement) return <div className="text-center p-8">لم يتم العثور على التسوية.</div>;
    
    return (
        <>
            <Helmet><title>تفاصيل تسوية العهدة</title></Helmet>
            <div className="space-y-6">
                <PageTitle title="تفاصيل تسوية العهدة" icon={FileText} />
                
                <SettlementSummary settlement={settlement}>
                    {canSubmit && (
                        <Button onClick={handleSubmitForReview} disabled={isSubmitting} size="lg" className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                            {isSubmitting ? 'جاري التقديم...' : <><Send className="ml-2 h-4 w-4" /> تقديم للمراجعة والاعتماد</>}
                        </Button>
                    )}
                </SettlementSummary>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>المصاريف والمرفقات</CardTitle>
                            <CardDescription>قائمة المصاريف والفواتير المسجلة في هذه العهدة.</CardDescription>
                        </div>
                        {canEdit && <Button onClick={() => setIsAddExpenseModalOpen(true)}><PlusCircle className="ml-2 h-4 w-4" /> إضافة بند</Button>}
                    </CardHeader>
                    <CardContent>
                        {expenses.length === 0 ? <Empty description="لم يتم إضافة أي مصاريف أو مرفقات بعد." /> : (
                            <Table>
                                <TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>البيان</TableHead><TableHead>الفئة</TableHead><TableHead>المبلغ</TableHead><TableHead>الحالة</TableHead><TableHead>الإجراءات</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {expenses.map(expense => (
                                        <TableRow key={expense.id}>
                                            <TableCell>{format(new Date(expense.expense_date), 'PPP', { locale: ar })}</TableCell>
                                            <TableCell className="font-medium max-w-xs truncate">{expense.description}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {React.createElement(getExpenseIcon(expense.category) || File, { className: "h-4 w-4" })}
                                                    <span>{EXPENSE_CATEGORIES[expense.category]?.label || expense.category_other}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{expense.category === 'general_invoice' ? '-' : formatCurrency(expense.amount)}</TableCell>
                                            <TableCell><Tag className={EXPENSE_STATUSES[expense.status]?.color}>{EXPENSE_STATUSES[expense.status]?.text}</Tag></TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => setReceiptViewer({ visible: true, url: expense.receipt_url })}>
                                                            <File className="ml-2 h-4 w-4" /> {expense.category === 'general_invoice' ? 'عرض الملف' : 'عرض الإيصال'}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild>
                                                            <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" className="flex items-center w-full">
                                                                <Download className="ml-2 h-4 w-4" /> تحميل
                                                            </a>
                                                        </DropdownMenuItem>
                                                        {canEdit && (
                                                            <>
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-500 focus:bg-red-100">
                                                                    <Popconfirm title="هل أنت متأكد من حذف هذا البند؟" onConfirm={() => handleDeleteExpense(expense.id)} okText="نعم" cancelText="لا">
                                                                        <div className="flex items-center w-full"><Trash2 className="ml-2 h-4 w-4" /> حذف</div>
                                                                    </Popconfirm>
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

            </div>

            {canEdit && <AddExpenseModal settlement={settlement} visible={isAddExpenseModalOpen} onCancel={() => setIsAddExpenseModalOpen(false)} onFinish={() => setIsAddExpenseModalOpen(false)} />}
            {receiptViewer.visible && <ReceiptViewer visible={receiptViewer.visible} url={receiptViewer.url} onClose={() => setReceiptViewer({ visible: false, url: '' })} />}
        </>
    );
};

export default CustodySettlementDetails;