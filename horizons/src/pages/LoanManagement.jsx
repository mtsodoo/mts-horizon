
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wallet, CheckCircle, XCircle, AlertCircle, Info, ShieldCheck, FileText, Printer, Download } from 'lucide-react';
import { message, Spin, Empty, Modal, Input } from 'antd';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
import { formatCurrency } from '@/utils/financialUtils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const { TextArea } = Input;

const LoanManagement = () => {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [loanRequests, setLoanRequests] = useState([]);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [reviewNotes, setReviewNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Only General Manager can approve/reject loans
    const canApproveLoan = profile?.role === 'general_manager';

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: requestsData, error: requestsError } = await supabase
                .from('employee_loans')
                .select(`
                    *,
                    profile:profiles!employee_loans_employee_id_fkey(name_ar, email, phone)
                `)
                .order('created_at', { ascending: false });

            if (requestsError) throw requestsError;
            
            const formattedData = (requestsData || []).map(loan => ({
                ...loan,
                employee_name: loan.profile?.name_ar || 'غير معروف',
                title: `سلفة رقم ${loan.loan_number}`, 
                description: loan.reason,
                installments_count: loan.installments
            }));

            setLoanRequests(formattedData);

        } catch (error) {
            handleSupabaseError(error, 'فشل في تحميل بيانات طلبات السلف');
        } finally {
            setLoading(false);
        }
    };

    const openReviewModal = (request, action) => {
        if (!canApproveLoan) {
            message.error('عذراً، فقط المدير العام يمكنه اتخاذ إجراء على طلبات السلف');
            return;
        }
        setSelectedRequest({ ...request, action });
        setReviewNotes('');
        setReviewModalOpen(true);
    };

    const handleReview = async () => {
        if (!selectedRequest || !canApproveLoan) return;

        setSubmitting(true);
        try {
            const updates = {
                status: selectedRequest.action, 
                approved_by: user.id,
                approved_at: new Date().toISOString(),
            };

            if (selectedRequest.action === 'rejected') {
                updates.rejection_reason = reviewNotes;
            }

            const { error } = await supabase
                .from('employee_loans')
                .update(updates)
                .eq('id', selectedRequest.id);

            if (error) throw error;

            if (updates.status === 'approved') {
                const { error: notifError } = await supabase.from('notifications').insert({
                    user_id: selectedRequest.employee_id,
                    title: 'تمت الموافقة على السلفة',
                    message: 'يرجى توثيق العقد لإتمام الإجراءات',
                    type: 'loan_approved',
                    link: `/loan-verification/${selectedRequest.id}`,
                    read: false,
                    created_at: new Date().toISOString()
                });
                
                if (notifError) console.error('Failed to send notification:', notifError);
            }

            message.success(`✅ تم ${selectedRequest.action === 'approved' ? 'قبول' : 'رفض'} الطلب بنجاح!`);
            setReviewModalOpen(false);
            fetchData();

        } catch (error) {
            handleSupabaseError(error, 'فشل في معالجة الطلب');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <Badge variant="secondary">قيد المراجعة</Badge>;
            case 'approved':
                return <Badge className="bg-blue-500 text-white">بانتظار التوثيق</Badge>;
            case 'active':
                return <Badge className="bg-green-500 text-white">نشطة (موثقة)</Badge>;
            case 'rejected':
                return <Badge variant="destructive">مرفوض</Badge>;
            case 'completed':
                return <Badge variant="outline" className="border-green-500 text-green-500">مسددة</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    return (
        <>
            <Helmet><title>إدارة السلف</title></Helmet>
            <div className="space-y-6 p-4 md:p-8">
                <PageTitle title="إدارة السلف" icon={Wallet} />

                <Tabs defaultValue="requests" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="active">الطلبات الموثقة</TabsTrigger>
                        <TabsTrigger value="requests">طلبات السلف ({loanRequests.filter(r => r.status === 'pending').length})</TabsTrigger>
                        <TabsTrigger value="history">السجل الكامل</TabsTrigger>
                    </TabsList>

                    <TabsContent value="active">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-orange-500" />
                                    الطلبات الموثقة
                                </CardTitle>
                                <CardDescription>قائمة الأقساط المستحقة للموظفين (الموثقة)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex justify-center py-8"><Spin size="large" /></div>
                                ) : loanRequests.filter(r => r.status === 'active').length === 0 ? (
                                    <Empty description="لا توجد سلف نشطة حالياً" />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>رقم السلفة</TableHead>
                                                    <TableHead>الموظف</TableHead>
                                                    <TableHead>المبلغ الإجمالي</TableHead>
                                                    <TableHead>القسط الشهري</TableHead>
                                                    <TableHead>تاريخ التفعيل</TableHead>
                                                    <TableHead>إجراءات</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loanRequests.filter(r => r.status === 'active').map((loan) => (
                                                    <TableRow key={loan.id}>
                                                        <TableCell className="font-medium">{loan.loan_number}</TableCell>
                                                        <TableCell>{loan.employee_name}</TableCell>
                                                        <TableCell>{formatCurrency(loan.amount)}</TableCell>
                                                        <TableCell>{formatCurrency(loan.monthly_deduction)}</TableCell>
                                                        <TableCell>{loan.verified_at ? format(new Date(loan.verified_at), 'PP', { locale: ar }) : '-'}</TableCell>
                                                        <TableCell className="flex space-x-2">
                                                            <Button variant="outline" size="sm" onClick={() => navigate(`/loan-verification/${loan.id}`)} className="ml-2">
                                                                <FileText className="h-4 w-4 ml-1" />
                                                                عرض العقد
                                                            </Button>
                                                            <Button variant="outline" size="sm" onClick={() => window.open(`/loan-verification/${loan.id}`, '_blank')} className="ml-2">
                                                                <Printer className="h-4 w-4 ml-1" />
                                                                طباعة
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="requests">
                        <Card>
                            <CardHeader>
                                <CardTitle>طلبات السلف</CardTitle>
                                <CardDescription>مراجعة وموافقة على طلبات السلف</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!canApproveLoan && (
                                    <Alert className="mb-4 bg-yellow-50 border-yellow-200">
                                        <Info className="h-4 w-4 text-yellow-600" />
                                        <AlertTitle className="text-yellow-800">تنبيه صلاحيات</AlertTitle>
                                        <AlertDescription className="text-yellow-700">
                                            فقط المدير العام يمتلك صلاحية الموافقة النهائية أو الرفض لطلبات السلف المالية.
                                        </AlertDescription>
                                    </Alert>
                                )}
                                {loading ? (
                                    <div className="flex justify-center py-8"><Spin size="large" /></div>
                                ) : loanRequests.filter(r => r.status === 'pending').length === 0 ? (
                                    <Empty description="لا توجد طلبات سلف قيد المراجعة" />
                                ) : (
                                    <div className="space-y-4">
                                        {loanRequests.filter(r => r.status === 'pending').map((request) => (
                                            <Card key={request.id} className="border-orange-200">
                                                <CardContent className="pt-6">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h3 className="font-bold text-lg">{request.loan_number}</h3>
                                                            <p className="text-sm text-gray-600">الموظف: {request.employee_name}</p>
                                                            <p className="text-sm text-gray-600">{request.reason}</p>
                                                        </div>
                                                        {getStatusBadge(request.status)}
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                                        <div>
                                                            <span className="text-sm text-gray-500">المبلغ الإجمالي:</span>
                                                            <p className="font-bold text-lg text-blue-600">{formatCurrency(request.amount)}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-sm text-gray-500">عدد الأقساط:</span>
                                                            <p className="font-bold text-lg">{request.installments} قسط</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-sm text-gray-500">قيمة القسط:</span>
                                                            <p className="font-bold text-lg text-green-600">{formatCurrency(request.monthly_deduction)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm text-gray-500 mb-4">
                                                        تاريخ التقديم: {format(new Date(request.created_at), 'PPp', { locale: ar })}
                                                    </div>
                                                    {request.status === 'pending' && canApproveLoan && (
                                                        <div className="flex gap-3">
                                                            <Button onClick={() => openReviewModal(request, 'approved')} className="flex-1 bg-green-600 hover:bg-green-700">
                                                                <CheckCircle className="ml-2 h-4 w-4" />
                                                                موافقة مبدئية
                                                            </Button>
                                                            <Button onClick={() => openReviewModal(request, 'rejected')} variant="destructive" className="flex-1">
                                                                <XCircle className="ml-2 h-4 w-4" />
                                                                رفض
                                                            </Button>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="history">
                        <Card>
                            <CardHeader>
                                <CardTitle>السجل الكامل للسلف</CardTitle>
                                <CardDescription>جميع طلبات السلف (معتمدة، مرفوضة، مكتملة)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex justify-center py-8"><Spin size="large" /></div>
                                ) : loanRequests.length === 0 ? (
                                    <Empty description="لا توجد طلبات" />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>رقم السلفة</TableHead>
                                                    <TableHead>الموظف</TableHead>
                                                    <TableHead>المبلغ</TableHead>
                                                    <TableHead>الأقساط</TableHead>
                                                    <TableHead>الحالة</TableHead>
                                                    <TableHead>التاريخ</TableHead>
                                                    <TableHead>إجراءات</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loanRequests.map((request) => (
                                                    <TableRow key={request.id}>
                                                        <TableCell className="font-medium">{request.loan_number}</TableCell>
                                                        <TableCell>{request.employee_name}</TableCell>
                                                        <TableCell>{formatCurrency(request.amount)}</TableCell>
                                                        <TableCell>{request.installments} قسط</TableCell>
                                                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                                                        <TableCell>{format(new Date(request.created_at), 'PPp', { locale: ar })}</TableCell>
                                                        <TableCell>
                                                            {request.status === 'approved' && (
                                                                <Button variant="outline" size="sm" onClick={() => navigate(`/loan-verification/${request.id}`)}>
                                                                    <ShieldCheck className="w-4 h-4 ml-2" />
                                                                    رابط التوثيق
                                                                </Button>
                                                            )}
                                                            {(request.status === 'active' || request.status === 'verified') && (
                                                                <Button variant="ghost" size="sm" onClick={() => window.open(`/loan-verification/${request.id}`, '_blank')} title="طباعة العقد" className="ml-2">
                                                                    <Printer className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            <Modal
                title={selectedRequest?.action === 'approved' ? 'موافقة على السلفة' : 'رفض طلب السلفة'}
                open={reviewModalOpen}
                onCancel={() => setReviewModalOpen(false)}
                footer={[
                    <Button key="cancel" variant="outline" onClick={() => setReviewModalOpen(false)}>إلغاء</Button>,
                    <Button key="submit" onClick={handleReview} disabled={submitting} className={selectedRequest?.action === 'approved' ? 'bg-green-600' : ''}>
                        {submitting ? 'جاري المعالجة...' : 'تأكيد'}
                    </Button>,
                ]}
            >
                {selectedRequest && (
                    <div className="space-y-4 mt-4">
                        {selectedRequest.action === 'approved' && (
                            <Alert className="bg-blue-50 border-blue-200">
                                <Info className="h-4 w-4 text-blue-600" />
                                <AlertTitle>تنبيه</AlertTitle>
                                <AlertDescription>
                                    عند الموافقة، سيتم تغيير حالة الطلب إلى "بانتظار التوثيق". يجب على الموظف توثيق العقد عبر رمز التحقق لتفعيل السلفة ونزول الأقساط.
                                </AlertDescription>
                            </Alert>
                        )}
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">الموظف:</p>
                            <p className="font-bold">{selectedRequest.employee_name}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">المبلغ الإجمالي:</p>
                            <p className="font-bold">{formatCurrency(selectedRequest.amount)}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">قيمة القسط الشهري:</p>
                            <p className="font-bold text-green-600">{formatCurrency(selectedRequest.monthly_deduction)}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                {selectedRequest.action === 'rejected' ? 'سبب الرفض (مطلوب)' : 'ملاحظات (اختياري)'}
                            </label>
                            <TextArea rows={4} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="أضف أي ملاحظات..." required={selectedRequest.action === 'rejected'} />
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default LoanManagement;
