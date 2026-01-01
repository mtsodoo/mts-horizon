
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Wallet, Plus, FileSignature, ArrowLeft, Download } from 'lucide-react';
import { Spin, Empty } from 'antd';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { formatCurrency } from '@/utils/financialUtils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const MyLoans = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [loans, setLoans] = useState([]);

    useEffect(() => {
        if (user) {
            fetchLoans();
        }
    }, [user]);

    const fetchLoans = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('employee_loans')
                .select('*')
                .eq('employee_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            // Calculate payments for active loans
            const loansWithDetails = await Promise.all((data || []).map(async (loan) => {
                let paid = 0;
                if (loan.status === 'active' || loan.status === 'completed') {
                     const { data: installments } = await supabase
                        .from('loan_installments')
                        .select('installment_amount')
                        .eq('loan_id', loan.id)
                        .eq('status', 'paid');
                     paid = installments?.reduce((sum, item) => sum + Number(item.installment_amount), 0) || 0;
                }
                
                return {
                    ...loan,
                    paid_amount: paid,
                    remaining_amount: Math.max(0, loan.amount - paid)
                };
            }));

            setLoans(loansWithDetails);
        } catch (error) {
            console.error('Error fetching loans:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 text-sm px-3 py-1">قيد المراجعة</Badge>;
            case 'approved':
                return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-sm px-3 py-1">بانتظار التوثيق</Badge>;
            case 'active':
                return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-sm px-3 py-1">نشطة</Badge>;
            case 'rejected':
                return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 text-sm px-3 py-1">مرفوض</Badge>;
            case 'completed':
                return <Badge variant="outline" className="border-green-500 text-green-500 bg-green-50 text-sm px-3 py-1">مسددة بالكامل</Badge>;
            default:
                return <Badge className="text-sm px-3 py-1">{status}</Badge>;
        }
    };

    return (
        <>
            <Helmet><title>سلفي الخاصة | MTS</title></Helmet>
            <div className="space-y-6 p-4 md:p-8 max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <PageTitle title="سلفي الخاصة" icon={Wallet} />
                    <Button onClick={() => navigate('/request-loan')} size="lg" className="gap-2 text-base px-6">
                        <Plus className="w-5 h-5" />
                        طلب سلفة جديدة
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12"><Spin size="large" /></div>
                ) : loans.length === 0 ? (
                    <div className="bg-white rounded-lg border border-dashed p-16 text-center shadow-sm">
                        <div className="bg-gray-50 p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                            <Wallet className="w-12 h-12 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد سلف سابقة</h3>
                        <p className="text-gray-500 mb-8 text-lg">يمكنك تقديم طلب سلفة جديد وسيتم مراجعته من قبل الإدارة</p>
                        <Button size="lg" onClick={() => navigate('/request-loan')} className="px-8 text-base">تقديم طلب سلفة</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {loans.map((loan) => (
                            <Card key={loan.id} className="relative overflow-hidden transition-all hover:shadow-lg border-t-[6px] border-t-gray-200 hover:border-t-blue-500">
                                <CardHeader className="pb-4 pt-6 px-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <Badge variant="outline" className="font-mono text-sm px-3 py-1 text-gray-500 bg-gray-50">
                                            {loan.loan_number}
                                        </Badge>
                                        {getStatusBadge(loan.status)}
                                    </div>
                                    <CardTitle className="text-3xl font-bold flex items-baseline gap-2 text-gray-900 mt-2">
                                        {formatCurrency(loan.amount)}
                                        <span className="text-sm font-normal text-muted-foreground">ريال سعودي</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6 px-6 pb-6">
                                    <div className="grid grid-cols-2 gap-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <div>
                                            <p className="text-gray-500 text-sm mb-1.5 font-medium">القسط الشهري</p>
                                            <p className="font-bold text-xl text-gray-900">{formatCurrency(loan.monthly_deduction)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-sm mb-1.5 font-medium">مدة السداد</p>
                                            <p className="font-bold text-xl text-gray-900">{loan.installments} شهر</p>
                                        </div>
                                    </div>

                                    {(loan.status === 'active' || loan.status === 'completed') && (
                                        <div className="space-y-3 pt-2">
                                            <div className="flex justify-between text-sm font-medium text-gray-600">
                                                <span>تم سداد: <span className="text-emerald-600 font-bold">{formatCurrency(loan.paid_amount)}</span></span>
                                                <span>المتبقي: <span className="text-red-600 font-bold">{formatCurrency(loan.remaining_amount)}</span></span>
                                            </div>
                                            <Progress 
                                                value={((loan.amount - loan.remaining_amount) / loan.amount) * 100} 
                                                className="h-4 rounded-full" 
                                            />
                                            <p className="text-xs text-center text-gray-400 font-medium pt-1">
                                                نسبة السداد: {Math.round(((loan.amount - loan.remaining_amount) / loan.amount) * 100)}%
                                            </p>
                                        </div>
                                    )}

                                    {loan.status === 'rejected' && loan.rejection_reason && (
                                        <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-sm text-red-700 mt-2">
                                            <strong className="block mb-1 text-red-800">سبب الرفض:</strong> 
                                            {loan.rejection_reason}
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="bg-gray-50 p-5 flex gap-3 border-t">
                                    {loan.status === 'approved' ? (
                                        <Button 
                                            className="w-full bg-blue-600 hover:bg-blue-700 gap-2 h-12 text-base font-medium shadow-sm hover:shadow"
                                            onClick={() => navigate(`/loan-verification/${loan.id}`)}
                                        >
                                            <FileSignature className="w-5 h-5" />
                                            توثيق العقد واستلام المبلغ
                                        </Button>
                                    ) : (loan.status === 'active' || loan.status === 'completed') ? (
                                        <Button 
                                            variant="outline" 
                                            className="w-full gap-2 h-12 text-base font-medium bg-white hover:bg-gray-50 border-gray-300"
                                            onClick={() => window.open(`/loan-verification/${loan.id}`, '_blank')}
                                        >
                                            <Download className="w-5 h-5" />
                                            تحميل نسخة العقد
                                        </Button>
                                    ) : (
                                        <div className="w-full text-center py-2 text-sm text-gray-400 font-medium">
                                            تم التقديم في {format(new Date(loan.created_at), 'PPP', { locale: ar })}
                                        </div>
                                    )}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default MyLoans;
