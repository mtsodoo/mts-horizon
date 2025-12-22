import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plane, CheckCircle, XCircle } from 'lucide-react';
import { message, Spin, Empty, Modal, Input } from 'antd';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const { TextArea } = Input;

const LeaveManagement = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [leaveRequests, setLeaveRequests] = useState([]);
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
            // جلب الموظفين مع أرصدتهم
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .eq('is_active', true)
                .order('name_ar');

            if (profilesError) throw profilesError;

            // حساب رصيد كل موظف
            const employeesWithBalance = await Promise.all(
                (profilesData || []).map(async (emp) => {
                    const { data: balance } = await supabase.rpc('calculate_annual_leave_balance', {
                        p_user_id: emp.id
                    });
                    return { ...emp, leave_balance: balance || 0 };
                })
            );

            setEmployees(employeesWithBalance);

            // جلب طلبات الإجازات
            const { data: requestsData, error: requestsError } = await supabase
                .from('employee_requests')
                .select(`
                    *,
                    profiles:user_id (name_ar, email)
                `)
                .eq('request_type', 'leave')
                .order('created_at', { ascending: false });

            if (requestsError) throw requestsError;
            setLeaveRequests(requestsData || []);

        } catch (error) {
            handleSupabaseError(error, 'فشل في تحميل البيانات');
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
            <Helmet><title>إدارة الإجازات</title></Helmet>
            <div className="space-y-6 p-4 md:p-8">
                <PageTitle title="إدارة الإجازات" icon={Plane} />

                <Tabs defaultValue="balances" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="balances">أرصدة الموظفين</TabsTrigger>
                        <TabsTrigger value="requests">
                            طلبات الإجازات ({leaveRequests.filter(r => r.status === 'pending').length})
                        </TabsTrigger>
                    </TabsList>

                    {/* تبويب أرصدة الموظفين */}
                    <TabsContent value="balances">
                        <Card>
                            <CardHeader>
                                <CardTitle>أرصدة الإجازات السنوية</CardTitle>
                                <CardDescription>
                                    رصيد الإجازات المتبقي لكل موظف
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <Spin size="large" />
                                    </div>
                                ) : employees.length === 0 ? (
                                    <Empty description="لا يوجد موظفين" />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>الموظف</TableHead>
                                                    <TableHead>البريد الإلكتروني</TableHead>
                                                    <TableHead>تاريخ التعيين</TableHead>
                                                    <TableHead>الرصيد المتبقي</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {employees.map((emp) => (
                                                    <TableRow key={emp.id}>
                                                        <TableCell className="font-medium">{emp.name_ar}</TableCell>
                                                        <TableCell>{emp.email}</TableCell>
                                                        <TableCell>
                                                            {emp.hire_date ? format(new Date(emp.hire_date), 'PPP', { locale: ar }) : '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="font-bold text-blue-600">
                                                                {emp.leave_balance.toFixed(1)} يوم
                                                            </span>
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

                    {/* تبويب طلبات الإجازات */}
                    <TabsContent value="requests">
                        <Card>
                            <CardHeader>
                                <CardTitle>طلبات الإجازات</CardTitle>
                                <CardDescription>
                                    مراجعة وموافقة على طلبات الإجازات
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <Spin size="large" />
                                    </div>
                                ) : leaveRequests.length === 0 ? (
                                    <Empty description="لا توجد طلبات" />
                                ) : (
                                    <div className="space-y-4">
                                        {leaveRequests.map((request) => (
                                            <Card key={request.id} className={request.status === 'pending' ? 'border-orange-200' : ''}>
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
                                                            <span className="text-sm text-gray-500">من:</span>
                                                            <p className="font-medium">
                                                                {format(new Date(request.start_date), 'PPP', { locale: ar })}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-sm text-gray-500">إلى:</span>
                                                            <p className="font-medium">
                                                                {format(new Date(request.end_date), 'PPP', { locale: ar })}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-sm text-gray-500">المدة:</span>
                                                            <p className="font-bold text-blue-600">
                                                                {request.total_days} يوم
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
                                                    {request.review_notes && (
                                                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                                            <p className="text-sm font-medium">ملاحظات المراجعة:</p>
                                                            <p className="text-sm text-gray-600">{request.review_notes}</p>
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
                </Tabs>
            </div>

            {/* نافذة المراجعة */}
            <Modal
                title={selectedRequest?.action === 'approved' ? 'قبول طلب الإجازة' : 'رفض طلب الإجازة'}
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
                            <p className="text-sm text-gray-600">المدة:</p>
                            <p className="font-bold">{selectedRequest.total_days} يوم</p>
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

export default LeaveManagement;