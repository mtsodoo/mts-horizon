import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { 
    Package, CheckCircle, XCircle, AlertCircle, FileText, 
    Paperclip, Download, Eye, Wallet, Clock, Check, X, Loader2,
    Receipt, Image as ImageIcon
} from 'lucide-react';
import { message, Spin, Empty, Modal, Input, Tag } from 'antd';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
import { formatCurrency } from '@/utils/financialUtils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const { TextArea } = Input;

const CustodyManagement = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [custodyRequests, setCustodyRequests] = useState([]);
    const [settlements, setSettlements] = useState([]);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [closeModalOpen, setCloseModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedSettlement, setSelectedSettlement] = useState(null);
    const [settlementItems, setSettlementItems] = useState([]);
    const [reviewNotes, setReviewNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // جلب طلبات العهد
            const { data: requestsData, error: requestsError } = await supabase
                .from('employee_requests')
                .select(`*, profiles:user_id (name_ar, email, phone)`)
                .eq('request_type', 'custody')
                .order('created_at', { ascending: false });
            if (requestsError) throw requestsError;
            setCustodyRequests(requestsData || []);

            // جلب التسويات مع البنود
            const { data: settlementsData, error: settlementsError } = await supabase
                .from('custody_settlements')
                .select(`*, 
                    employee_request:employee_requests!custody_settlements_custody_request_id_fkey(title, description),
                    employee:profiles!custody_settlements_user_id_fkey(name_ar, phone)`)
                .in('status', ['open', 'pending_review', 'settled'])
                .order('created_at', { ascending: false });
            if (settlementsError) throw settlementsError;
            setSettlements(settlementsData || []);

        } catch (error) {
            handleSupabaseError(error, 'فشل في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    }, []);

    // جلب بنود التسوية
    const fetchSettlementItems = async (settlementId) => {
        try {
            const { data, error } = await supabase
                .from('custody_settlement_items')
                .select('*')
                .eq('settlement_id', settlementId)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching items:', error);
            return [];
        }
    };

    useEffect(() => {
        if (user) {
            fetchData();
            const channel = supabase.channel('custody-management-channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'custody_settlements' }, fetchData)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'custody_settlement_items' }, fetchData)
                .subscribe();
            return () => supabase.removeChannel(channel);
        }
    }, [user, fetchData]);

    // فتح نافذة مراجعة الطلب
    const openReviewModal = (request, action) => {
        setSelectedRequest({ ...request, action });
        setReviewNotes('');
        setReviewModalOpen(true);
    };

    // معالجة قبول/رفض الطلب
    const handleReview = async () => {
        if (!selectedRequest) return;
        setSubmitting(true);
        try {
            const { error } = await supabase.from('employee_requests').update({
                status: selectedRequest.action,
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString(),
                review_notes: reviewNotes || null
            }).eq('id', selectedRequest.id);
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
    
    // فتح نافذة إقفال العهدة
    const openCloseModal = async (settlement) => {
        setSelectedSettlement(settlement);
        const items = await fetchSettlementItems(settlement.id);
        setSettlementItems(items);
        setReviewNotes('');
        setCloseModalOpen(true);
    };

    // إقفال العهدة
    const handleCloseSettlement = async () => {
        if (!selectedSettlement) return;
        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('custody_settlements')
                .update({
                    status: 'settled',
                    settled_at: new Date().toISOString(),
                    settled_by: user.id,
                    settlement_notes: reviewNotes || null
                })
                .eq('id', selectedSettlement.id);

            if (error) throw error;

            message.success('✅ تم إقفال العهدة بنجاح!');
            setCloseModalOpen(false);
            setSelectedSettlement(null);
            fetchData();
        } catch (error) {
            handleSupabaseError(error, 'فشل في إقفال العهدة');
        } finally {
            setSubmitting(false);
        }
    };

    // رفض التسوية
    const handleRejectSettlement = async () => {
        if (!selectedSettlement) return;
        if (!reviewNotes.trim()) {
            message.error('يجب كتابة سبب الرفض');
            return;
        }
        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('custody_settlements')
                .update({
                    status: 'open',
                    settlement_notes: `رفض: ${reviewNotes}`
                })
                .eq('id', selectedSettlement.id);

            if (error) throw error;

            message.warning('تم رفض التسوية وإعادتها للموظف');
            setCloseModalOpen(false);
            setSelectedSettlement(null);
            fetchData();
        } catch (error) {
            handleSupabaseError(error, 'فشل في رفض التسوية');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending': return <Badge className="bg-amber-100 text-amber-800">قيد المراجعة</Badge>;
            case 'approved': return <Badge className="bg-green-100 text-green-800">مقبول</Badge>;
            case 'rejected': return <Badge className="bg-red-100 text-red-800">مرفوض</Badge>;
            case 'open': return <Badge className="bg-orange-100 text-orange-800">مفتوحة</Badge>;
            case 'settled': return <Badge className="bg-blue-100 text-blue-800">مسوّاة</Badge>;
            case 'pending_review': return <Badge className="bg-purple-100 text-purple-800">بانتظار المراجعة</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    const getDeficitColor = (amount) => {
        if (amount > 0) return 'text-green-600';
        if (amount < 0) return 'text-red-600';
        return 'text-gray-600';
    };
    
    // تصنيف العهد
    const openSettlements = settlements.filter(s => s.status === 'open' && (s.total_spent || 0) > 0);
    const pendingSettlements = settlements.filter(s => s.status === 'open' && (s.total_spent || 0) === 0);
    const settledSettlements = settlements.filter(s => s.status === 'settled');

    return (
        <>
            <Helmet><title>إدارة العهد | MTS</title></Helmet>
            <div className="space-y-6 p-4 md:p-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center shadow-lg">
                        <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">إدارة العهد المالية</h1>
                        <p className="text-gray-500">مراجعة وإقفال العهد والتسويات</p>
                    </div>
                </div>

                <Tabs defaultValue="pending" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="pending" className="gap-2">
                            <Clock className="w-4 h-4" />
                            بانتظار التسوية
                            {pendingSettlements.length > 0 && (
                                <Badge className="bg-orange-500 text-white mr-1">{pendingSettlements.length}</Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="review" className="gap-2">
                            <AlertCircle className="w-4 h-4" />
                            جاهزة للإقفال
                            {openSettlements.length > 0 && (
                                <Badge className="bg-green-500 text-white mr-1">{openSettlements.length}</Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="requests" className="gap-2">
                            <FileText className="w-4 h-4" />
                            طلبات جديدة
                            {custodyRequests.filter(r => r.status === 'pending').length > 0 && (
                                <Badge className="bg-amber-500 text-white mr-1">{custodyRequests.filter(r => r.status === 'pending').length}</Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="history" className="gap-2">
                            <CheckCircle className="w-4 h-4" />
                            المسوّاة
                        </TabsTrigger>
                    </TabsList>

                    {/* العهد بانتظار التسوية من الموظف */}
                    <TabsContent value="pending">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-orange-500" />
                                    عهد بانتظار التسوية
                                </CardTitle>
                                <CardDescription>العهد التي لم يقدم الموظف تسويتها بعد</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex justify-center py-8"><Spin size="large" /></div>
                                ) : pendingSettlements.length === 0 ? (
                                    <Empty description="لا توجد عهد بانتظار التسوية" />
                                ) : (
                                    <div className="space-y-4">
                                        {pendingSettlements.map((s) => (
                                            <Card key={s.id} className="border-orange-200 bg-orange-50/30">
                                                <CardContent className="pt-6">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h3 className="font-bold text-lg">{s.employee?.name_ar || 'غير محدد'}</h3>
                                                            <p className="text-sm text-gray-600">{s.employee_request?.title || 'عهدة مالية'}</p>
                                                        </div>
                                                        {getStatusBadge('open')}
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div className="bg-white p-3 rounded-lg border">
                                                            <span className="text-xs text-gray-500 block">مبلغ العهدة</span>
                                                            <p className="font-bold text-lg text-blue-600">{formatCurrency(s.custody_amount)}</p>
                                                        </div>
                                                        <div className="bg-white p-3 rounded-lg border">
                                                            <span className="text-xs text-gray-500 block">تاريخ الاستلام</span>
                                                            <p className="font-medium">{format(new Date(s.created_at), 'PP', { locale: ar })}</p>
                                                        </div>
                                                        <div className="bg-white p-3 rounded-lg border">
                                                            <span className="text-xs text-gray-500 block">الحالة</span>
                                                            <p className="font-medium text-orange-600">بانتظار الموظف</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* العهد الجاهزة للإقفال */}
                    <TabsContent value="review">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-green-500" />
                                    عهد جاهزة للإقفال
                                </CardTitle>
                                <CardDescription>العهد التي قدم الموظف تسويتها وتنتظر مراجعتك</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex justify-center py-8"><Spin size="large" /></div>
                                ) : openSettlements.length === 0 ? (
                                    <Empty description="لا توجد عهد جاهزة للإقفال" />
                                ) : (
                                    <div className="space-y-4">
                                        {openSettlements.map((s) => (
                                            <Card key={s.id} className="border-green-200 bg-green-50/30">
                                                <CardContent className="pt-6">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h3 className="font-bold text-lg">{s.employee?.name_ar || 'غير محدد'}</h3>
                                                            <p className="text-sm text-gray-600">{s.employee_request?.title || 'عهدة مالية'}</p>
                                                        </div>
                                                        <Badge className="bg-green-500 text-white">جاهزة للإقفال</Badge>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                                        <div className="bg-white p-3 rounded-lg border">
                                                            <span className="text-xs text-gray-500 block">مبلغ العهدة</span>
                                                            <p className="font-bold text-lg text-blue-600">{formatCurrency(s.custody_amount)}</p>
                                                        </div>
                                                        <div className="bg-white p-3 rounded-lg border">
                                                            <span className="text-xs text-gray-500 block">المصروف</span>
                                                            <p className="font-bold text-lg text-red-600">{formatCurrency(s.total_spent || 0)}</p>
                                                        </div>
                                                        <div className="bg-white p-3 rounded-lg border">
                                                            <span className="text-xs text-gray-500 block">المتبقي</span>
                                                            <p className={`font-bold text-lg ${getDeficitColor(s.remaining_amount || 0)}`}>
                                                                {formatCurrency(s.remaining_amount || 0)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button 
                                                        onClick={() => openCloseModal(s)}
                                                        className="w-full bg-green-600 hover:bg-green-700"
                                                    >
                                                        <Eye className="ml-2 h-4 w-4" />
                                                        مراجعة وإقفال العهدة
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* طلبات العهد الجديدة */}
                    <TabsContent value="requests">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-amber-500" />
                                    طلبات العهد الجديدة
                                </CardTitle>
                                <CardDescription>طلبات العهد التي تنتظر موافقتك</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex justify-center py-8"><Spin size="large" /></div>
                                ) : custodyRequests.filter(r => r.status === 'pending').length === 0 ? (
                                    <Empty description="لا توجد طلبات جديدة" />
                                ) : (
                                    <div className="space-y-4">
                                        {custodyRequests.filter(r => r.status === 'pending').map((request) => (
                                            <Card key={request.id} className="border-amber-200 bg-amber-50/30">
                                                <CardContent className="pt-6">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h3 className="font-bold text-lg">{request.title}</h3>
                                                            <p className="text-sm text-gray-600">الموظف: {request.profiles?.name_ar}</p>
                                                            <p className="text-sm text-gray-500 mt-1">{request.description}</p>
                                                        </div>
                                                        {getStatusBadge(request.status)}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                                        <div className="bg-white p-3 rounded-lg border">
                                                            <span className="text-xs text-gray-500 block">المبلغ المطلوب</span>
                                                            <p className="font-bold text-lg text-blue-600">{formatCurrency(request.amount)}</p>
                                                        </div>
                                                        <div className="bg-white p-3 rounded-lg border">
                                                            <span className="text-xs text-gray-500 block">تاريخ الطلب</span>
                                                            <p className="font-medium">{format(new Date(request.created_at), 'PPp', { locale: ar })}</p>
                                                        </div>
                                                    </div>
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
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* العهد المسوّاة */}
                    <TabsContent value="history">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-blue-500" />
                                    العهد المسوّاة
                                </CardTitle>
                                <CardDescription>العهد التي تم إقفالها</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex justify-center py-8"><Spin size="large" /></div>
                                ) : settledSettlements.length === 0 ? (
                                    <Empty description="لا توجد عهد مسوّاة" />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>الموظف</TableHead>
                                                    <TableHead>العنوان</TableHead>
                                                    <TableHead>مبلغ العهدة</TableHead>
                                                    <TableHead>المصروف</TableHead>
                                                    <TableHead>المتبقي</TableHead>
                                                    <TableHead>تاريخ الإقفال</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {settledSettlements.map((s) => (
                                                    <TableRow key={s.id}>
                                                        <TableCell className="font-medium">{s.employee?.name_ar}</TableCell>
                                                        <TableCell>{s.employee_request?.title}</TableCell>
                                                        <TableCell>{formatCurrency(s.custody_amount)}</TableCell>
                                                        <TableCell className="text-red-600">{formatCurrency(s.total_spent || 0)}</TableCell>
                                                        <TableCell className={getDeficitColor(s.remaining_amount || 0)}>
                                                            {formatCurrency(s.remaining_amount || 0)}
                                                        </TableCell>
                                                        <TableCell>
                                                            {s.settled_at ? format(new Date(s.settled_at), 'PP', { locale: ar }) : '-'}
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

            {/* نافذة قبول/رفض الطلب */}
            <Modal 
                title={
                    <div className="flex items-center gap-2">
                        {selectedRequest?.action === 'approved' ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        {selectedRequest?.action === 'approved' ? 'قبول طلب العهدة' : 'رفض طلب العهدة'}
                    </div>
                } 
                open={reviewModalOpen} 
                onCancel={() => setReviewModalOpen(false)}
                footer={null}
            >
                {selectedRequest && (
                    <div className="space-y-4 mt-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">الموظف:</p>
                            <p className="font-bold">{selectedRequest.profiles?.name_ar}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">المبلغ:</p>
                            <p className="font-bold text-lg text-blue-600">{formatCurrency(selectedRequest.amount)}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                ملاحظات {selectedRequest.action === 'rejected' && <span className="text-red-500">*</span>}
                            </label>
                            <TextArea 
                                rows={4} 
                                value={reviewNotes} 
                                onChange={(e) => setReviewNotes(e.target.value)} 
                                placeholder="أضف أي ملاحظات..." 
                            />
                        </div>
                        <div className="flex gap-3 pt-4">
                            <Button variant="outline" onClick={() => setReviewModalOpen(false)} className="flex-1">
                                إلغاء
                            </Button>
                            <Button 
                                onClick={handleReview} 
                                disabled={submitting || (selectedRequest.action === 'rejected' && !reviewNotes.trim())}
                                className={`flex-1 ${selectedRequest.action === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                                {submitting ? 'جاري المعالجة...' : 'تأكيد'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
            
            {/* نافذة إقفال العهدة */}
            <Modal 
                title={
                    <div className="flex items-center gap-2 text-lg">
                        <Receipt className="w-5 h-5 text-green-600" />
                        مراجعة وإقفال العهدة
                    </div>
                }
                open={closeModalOpen} 
                onCancel={() => setCloseModalOpen(false)}
                width={700}
                footer={null}
            >
                {selectedSettlement && (
                    <div className="space-y-6 mt-4">
                        {/* معلومات العهدة */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-blue-50 p-3 rounded-lg text-center">
                                <p className="text-xs text-blue-600 mb-1">مبلغ العهدة</p>
                                <p className="text-xl font-bold text-blue-700">
                                    {formatCurrency(selectedSettlement.custody_amount)}
                                </p>
                            </div>
                            <div className="bg-red-50 p-3 rounded-lg text-center">
                                <p className="text-xs text-red-600 mb-1">المصروف</p>
                                <p className="text-xl font-bold text-red-700">
                                    {formatCurrency(selectedSettlement.total_spent || 0)}
                                </p>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg text-center">
                                <p className="text-xs text-green-600 mb-1">المتبقي</p>
                                <p className={`text-xl font-bold ${getDeficitColor(selectedSettlement.remaining_amount || 0)}`}>
                                    {formatCurrency(selectedSettlement.remaining_amount || 0)}
                                </p>
                            </div>
                        </div>

                        {/* بنود المصروفات */}
                        <div>
                            <h4 className="font-bold mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                بنود المصروفات ({settlementItems.length})
                            </h4>
                            {settlementItems.length === 0 ? (
                                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                                    لم يتم إضافة بنود
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                                    {settlementItems.map((item, index) => (
                                        <div key={item.id} className="bg-gray-50 p-4 rounded-lg border">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium">{item.item_name}</p>
                                                    <p className="text-lg font-bold text-red-600">{formatCurrency(item.amount)}</p>
                                                </div>
                                                {item.receipt_url && (
                                                    <a 
                                                        href={item.receipt_url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-blue-600 hover:underline text-sm bg-blue-50 px-3 py-1 rounded-full"
                                                    >
                                                        <ImageIcon className="w-4 h-4" />
                                                        عرض الفاتورة
                                                    </a>
                                                )}
                                            </div>
                                            {item.notes && (
                                                <p className="text-sm text-gray-500 mt-2">{item.notes}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ملاحظات المراجعة */}
                        <div>
                            <label className="block text-sm font-medium mb-2">ملاحظات المراجعة</label>
                            <TextArea 
                                rows={3} 
                                value={reviewNotes} 
                                onChange={(e) => setReviewNotes(e.target.value)} 
                                placeholder="أضف أي ملاحظات على التسوية..." 
                            />
                        </div>

                        {/* أزرار الإجراءات */}
                        <div className="flex gap-3 pt-4 border-t">
                            <Button 
                                variant="outline" 
                                onClick={() => setCloseModalOpen(false)}
                                className="flex-1"
                            >
                                إلغاء
                            </Button>
                            <Button 
                                variant="destructive"
                                onClick={handleRejectSettlement}
                                disabled={submitting}
                                className="flex-1"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <X className="w-4 h-4 ml-2" />}
                                رفض التسوية
                            </Button>
                            <Button 
                                onClick={handleCloseSettlement}
                                disabled={submitting}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Check className="w-4 h-4 ml-2" />}
                                إقفال العهدة
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default CustodyManagement;