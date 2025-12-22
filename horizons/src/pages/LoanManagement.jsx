import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Wallet, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { message, Spin, Empty, Modal, Input } from 'antd';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
import { formatCurrency } from '@/utils/financialUtils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const { TextArea } = Input;

const LoanManagement = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [loanRequests, setLoanRequests] = useState([]);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [reviewNotes, setReviewNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // جلب طلبات السلف
            const { data: requestsData, error: requestsError } = await supabase
                .from('employee_requests')
                .select(`
                    *,
                    profiles:user_id (name_ar, email)
                `)
                .eq('request_type', 'loan')
                .order('created_at', { ascending: false });

            if (requestsError) throw requestsError;
            setLoanRequests(requestsData || []);

            // The query for loan_installments has been removed to prevent permission errors.
            // setActiveInstallments([]);

        } catch (error) {
            handleSupabaseError(error, 'فشل في تحميل بيانات طلبات السلف');
        } finally {
            setLoading(false);
        }
    };

    const openReviewModal = (request, action) => {
        setSelectedRequest({ ...request, action });
        setReviewNotes('');
        setReviewModalOpen(true);
    };

    const handleReview = async () => {
        if (!selectedRequest) return;

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('employee_requests')
                .update({
                    status: selectedRequest.action,
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                    review_notes: reviewNotes || null
                })
                .eq('id', selectedRequest.id);

            if (error) throw error;

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
                return <Badge className="bg-green-500 text-white">مقبول</Badge>;
            case 'rejected':
                return <Badge variant="destructive">مرفوض</Badge>;
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
                        <TabsTrigger value="active">
                            الأقساط النشطة
                        </TabsTrigger>
                        <TabsTrigger value="requests">
                            طلبات السلف ({loanRequests.filter(r => r.status === 'pending').length})
                        </TabsTrigger>
                        <TabsTrigger value="history">السجل الكامل</TabsTrigger>
                    </TabsList>

                    {/* تبويب الأقساط النشطة */}
                    <TabsContent value="active">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-orange-500" />
                                    الأقساط النشطة
                                </CardTitle>
                                <CardDescription>
                                    قائمة الأقساط المستحقة للموظفين
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-50 rounded-lg">
                                    <Info className="h-12 w-12 text-blue-500 mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">بيانات الأقساط غير متاحة مؤقتاً</h3>
                                    <p className="text-muted-foreground">
                                        نعمل حالياً على تحسين هذه الميزة. يرجى التحقق مرة أخرى لاحقاً.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* تبويب طلبات السلف */}
                    <TabsContent value="requests">
                        <Card>
                            <CardHeader>
                                <CardTitle>طلبات السلف</CardTitle>
                                <CardDescription>
                                    مراجعة وموافقة على طلبات السلف
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <Spin size="large" />
                                    </div>
                                ) : loanRequests.filter(r => r.status === 'pending').length === 0 ? (
                                    <Empty description="لا توجد طلبات سلف قيد المراجعة" />
                                ) : (
                                    <div className="space-y-4">
                                        {loanRequests.filter(r => r.status === 'pending').map((request) => (
                                            <Card key={request.id} className="border-orange-200">
                                                <CardContent className="pt-6">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h3 className="font-bold text-lg">{request.title}</h3>
                                                            <p className="text-sm text-gray-600">
                                                                الموظف: {request.profiles?.name_ar}
                                                            </p>
                                                            <p className="text-sm text-gray-600">
                                                                {request.description}
                                                            </p>
                                                        </div>
                                                        {getStatusBadge(request.status)}
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                                        <div>
                                                            <span className="text-sm text-gray-500">المبلغ الإجمالي:</span>
                                                            <p className="font-bold text-lg text-blue-600">
                                                                {formatCurrency(request.amount)}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-sm text-gray-500">عدد الأقساط:</span>
                                                            <p className="font-bold text-lg">
                                                                {request.installments_count} قسط
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-sm text-gray-500">قيمة القسط:</span>
                                                            <p className="font-bold text-lg text-green-600">
                                                                {formatCurrency(request.amount / request.installments_count)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm text-gray-500 mb-4">
                                                        تاريخ التقديم: {format(new Date(request.created_at), 'PPp', { locale: ar })}
                                                    </div>
                                                    {request.status === 'pending' && (
                                                        <div className="flex gap-3">
                                                            <Button
                                                                onClick={() => openReviewModal(request, 'approved')}
                                                                className="flex-1 bg-green-600 hover:bg-green-700"
                                                            >
                                                                <CheckCircle className="ml-2 h-4 w-4" />
                                                                قبول
                                                            </Button>
                                                            <Button
                                                                onClick={() => openReviewModal(request, 'rejected')}
                                                                variant="destructive"
                                                                className="flex-1"
                                                            >
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

                    {/* تبويب السجل الكامل */}
                    <TabsContent value="history">
                        <Card>
                            <CardHeader>
                                <CardTitle>السجل الكامل للسلف</CardTitle>
                                <CardDescription>
                                    جميع طلبات السلف (معتمدة، مرفوضة، مكتملة)
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <Spin size="large" />
                                    </div>
                                ) : loanRequests.length === 0 ? (
                                    <Empty description="لا توجد طلبات" />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>الموظف</TableHead>
                                                    <TableHead>العنوان</TableHead>
                                                    <TableHead>المبلغ</TableHead>
                                                    <TableHead>الأقساط</TableHead>
                                                    <TableHead>الحالة</TableHead>
                                                    <TableHead>التاريخ</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loanRequests.map((request) => (
                                                    <TableRow key={request.id}>
                                                        <TableCell className="font-medium">
                                                            {request.profiles?.name_ar}
                                                        </TableCell>
                                                        <TableCell>{request.title}</TableCell>
                                                        <TableCell>{formatCurrency(request.amount)}</TableCell>
                                                        <TableCell>{request.installments_count} قسط</TableCell>
                                                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                                                        <TableCell>
                                                            {format(new Date(request.created_at), 'PPp', { locale: ar })}
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

            {/* نافذة المراجعة */}
            <Modal
                title={selectedRequest?.action === 'approved' ? 'قبول طلب السلفة' : 'رفض طلب السلفة'}
                open={reviewModalOpen}
                onCancel={() => setReviewModalOpen(false)}
                footer={[
                    <Button key="cancel" variant="outline" onClick={() => setReviewModalOpen(false)}>
                        إلغاء
                    </Button>,
                    <Button
                        key="submit"
                        onClick={handleReview}
                        disabled={submitting}
                        className={selectedRequest?.action === 'approved' ? 'bg-green-600' : ''}
                    >
                        {submitting ? 'جاري المعالجة...' : 'تأكيد'}
                    </Button>,
                ]}
            >
                {selectedRequest && (
                    <div className="space-y-4 mt-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">الموظف:</p>
                            <p className="font-bold">{selectedRequest.profiles?.name_ar}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">المبلغ الإجمالي:</p>
                            <p className="font-bold">{formatCurrency(selectedRequest.amount)}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">عدد الأقساط:</p>
                            <p className="font-bold">{selectedRequest.installments_count} قسط</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">قيمة القسط الشهري:</p>
                            <p className="font-bold text-green-600">
                                {formatCurrency(selectedRequest.amount / selectedRequest.installments_count)}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                ملاحظات (اختياري)
                            </label>
                            <TextArea
                                rows={4}
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                                placeholder="أضف أي ملاحظات..."
                            />
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default LoanManagement;