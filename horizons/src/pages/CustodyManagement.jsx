import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Package, CheckCircle, XCircle, AlertCircle, FileText, Paperclip, Download } from 'lucide-react';
import { message, Spin, Empty, Modal, Input, Tag } from 'antd';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
import { formatCurrency, getStatusLabel, getStatusColor, getDeficitColor } from '@/utils/financialUtils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import ReviewSettlementModal from '@/components/ReviewSettlementModal';

const { TextArea } = Input;

const CustodyManagement = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [custodyRequests, setCustodyRequests] = useState([]);
    const [settlements, setSettlements] = useState([]);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [custodyReviewModalOpen, setCustodyReviewModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedSettlement, setSelectedSettlement] = useState(null);
    const [reviewNotes, setReviewNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: requestsData, error: requestsError } = await supabase
                .from('employee_requests')
                .select(`*, profiles:user_id (name_ar, email)`)
                .eq('request_type', 'custody')
                .order('created_at', { ascending: false });
            if (requestsError) throw requestsError;
            setCustodyRequests(requestsData || []);

            const { data: settlementsData, error: settlementsError } = await supabase
                .from('custody_settlements')
                .select(`*, 
                    employee_request:employee_requests!custody_settlements_custody_request_id_fkey(title),
                    employee:profiles!custody_settlements_user_id_fkey(name_ar), 
                    expenses:settlement_expenses(*), 
                    invoices:settlement_invoices(*)`)
                .in('status', ['open', 'pending_review', 'rejected'])
                .order('created_at', { ascending: false });
            if (settlementsError) throw settlementsError;
            setSettlements(settlementsData || []);

        } catch (error) {
            handleSupabaseError(error, 'فشل في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchData();
            const channel = supabase.channel('custody-management-channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'custody_settlements' }, fetchData)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'settlement_expenses' }, fetchData)
                .subscribe();
            return () => supabase.removeChannel(channel);
        }
    }, [user, fetchData]);

    const openReviewModal = (request, action) => {
        setSelectedRequest({ ...request, action });
        setReviewNotes('');
        setReviewModalOpen(true);
    };

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
    
    const handleOpenCustodyReview = (settlement) => {
        setSelectedSettlement(settlement);
        setCustodyReviewModalOpen(true);
    };

    const handleCustodyActionCallback = () => {
        fetchData();
        setCustodyReviewModalOpen(false);
        setSelectedSettlement(null);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending': return <Badge variant="secondary">قيد المراجعة</Badge>;
            case 'approved': return <Badge className="bg-green-500 text-white">مقبول</Badge>;
            case 'rejected': return <Badge variant="destructive">مرفوض</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };
    
    const openSettlements = settlements.filter(s => s.status === 'open');
    const pendingReviewSettlements = settlements.filter(s => s.status === 'pending_review');

    return (
        <>
            <Helmet><title>إدارة العهد</title></Helmet>
            <div className="space-y-6 p-4 md:p-8">
                <PageTitle title="إدارة العهد" icon={Package} />

                <Tabs defaultValue="open" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="open">العهد المفتوحة ({openSettlements.length + pendingReviewSettlements.length})</TabsTrigger>
                        <TabsTrigger value="requests">طلبات العهد ({custodyRequests.filter(r => r.status === 'pending').length})</TabsTrigger>
                        <TabsTrigger value="history">السجل الكامل</TabsTrigger>
                    </TabsList>

                    <TabsContent value="open">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-orange-500" />العهد المفتوحة</CardTitle>
                                <CardDescription>العهد التي تنتظر تسوية من الموظفين أو مراجعة من الإدارة.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? <div className="flex justify-center py-8"><Spin size="large" /></div> :
                                settlements.length === 0 ? <Empty description="لا توجد عهد مفتوحة حالياً" /> :
                                <Accordion type="single" collapsible className="w-full space-y-2">
                                    {settlements.map((s) => (
                                    <AccordionItem value={s.id} key={s.id} className="border rounded-lg">
                                        <AccordionTrigger className="p-4 hover:no-underline">
                                            <div className="flex justify-between items-center w-full">
                                                <div className="text-right">
                                                    <p className="font-semibold">{s.employee?.name_ar || 'غير محدد'}</p>
                                                    <p className="text-sm text-muted-foreground">{s.employee_request?.title || 'عهدة'}</p>
                                                    <p className="text-sm text-muted-foreground">{s.submitted_at ? `قدمت في: ${format(new Date(s.submitted_at), 'PPP', { locale: ar })}` : 'لم تقدم بعد'}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="font-mono text-lg">{formatCurrency(s.custody_amount)}</span>
                                                    <Tag className={`${getStatusColor(s.status)} text-sm`}>{getStatusLabel(s.status)}</Tag>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-4 border-t">
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-3 gap-4 text-center">
                                                    <div className="p-2 bg-gray-50 rounded-md"><p className="text-sm text-muted-foreground">مبلغ العهدة</p><p className="font-bold text-green-600">{formatCurrency(s.custody_amount)}</p></div>
                                                    <div className="p-2 bg-gray-50 rounded-md"><p className="text-sm text-muted-foreground">المصروفات</p><p className="font-bold text-orange-600">{formatCurrency(s.total_expenses)}</p></div>
                                                    <div className="p-2 bg-gray-50 rounded-md"><p className="text-sm text-muted-foreground">المتبقي</p><p className={`font-bold ${getDeficitColor(s.remaining_amount)}`}>{formatCurrency(s.remaining_amount)}</p></div>
                                                </div>
                                                
                                                <div>
                                                    <h4 className="font-semibold mb-2">الفواتير المرفقة</h4>
                                                    {s.invoices.length > 0 ? (
                                                      <div className="grid grid-cols-2 gap-2">
                                                        {s.invoices.map(inv => (
                                                          <a key={inv.id} href={inv.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 border rounded-md hover:bg-gray-100">
                                                            <Paperclip className="h-4 w-4 text-gray-500" />
                                                            <span className="text-xs font-medium truncate">{inv.file_name}</span>
                                                            <Download className="h-4 w-4 text-blue-500 ml-auto" />
                                                          </a>
                                                        ))}
                                                      </div>
                                                    ) : <p className="text-sm text-muted-foreground">لا توجد فواتير.</p>}
                                                </div>

                                                <div>
                                                    <h4 className="font-semibold mb-2">تفاصيل المصروفات</h4>
                                                    {s.expenses.length > 0 ? (
                                                        <Table><TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>المبلغ</TableHead><TableHead>الفئة</TableHead><TableHead>الحالة</TableHead><TableHead>الفاتورة</TableHead></TableRow></TableHeader>
                                                        <TableBody>{s.expenses.map(exp => (
                                                            <TableRow key={exp.id}>
                                                                <TableCell>{format(new Date(exp.expense_date), 'yyyy/MM/dd')}</TableCell>
                                                                <TableCell>{formatCurrency(exp.amount)}</TableCell>
                                                                <TableCell>{exp.category}</TableCell>
                                                                <TableCell><Tag className={getStatusColor(exp.status, true)}>{getStatusLabel(exp.status, true)}</Tag></TableCell>
                                                                <TableCell><a href={exp.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">عرض</a></TableCell>
                                                            </TableRow>
                                                        ))}</TableBody></Table>
                                                    ) : <p className="text-sm text-muted-foreground">لم يتم إضافة مصروفات بعد.</p>}
                                                </div>
                                                <div className="flex justify-end pt-2">
                                                    {s.status === 'pending_review' && <Button onClick={() => handleOpenCustodyReview(s)}>مراجعة التسوية</Button>}
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                    ))}
                                </Accordion>}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="requests">
                        <Card><CardHeader><CardTitle>طلبات العهد</CardTitle><CardDescription>مراجعة وموافقة على طلبات العهد</CardDescription></CardHeader>
                            <CardContent>{loading ? <div className="flex justify-center py-8"><Spin size="large" /></div> :
                                custodyRequests.filter(r => r.status === 'pending').length === 0 ? <Empty description="لا توجد طلبات قيد المراجعة" /> :
                                <div className="space-y-4">{custodyRequests.filter(r => r.status === 'pending').map((request) => (
                                    <Card key={request.id} className="border-orange-200"><CardContent className="pt-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div><h3 className="font-bold text-lg">{request.title}</h3><p className="text-sm text-gray-600">الموظف: {request.profiles?.name_ar}</p><p className="text-sm text-gray-600">{request.description}</p></div>
                                            {getStatusBadge(request.status)}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div><span className="text-sm text-gray-500">المبلغ المطلوب:</span><p className="font-bold text-lg text-blue-600">{formatCurrency(request.amount)}</p></div>
                                            <div><span className="text-sm text-gray-500">تاريخ التقديم:</span><p className="font-medium">{format(new Date(request.created_at), 'PPp', { locale: ar })}</p></div>
                                        </div>
                                        {request.status === 'pending' && (
                                            <div className="flex gap-3">
                                                <Button onClick={() => openReviewModal(request, 'approved')} className="flex-1 bg-green-600 hover:bg-green-700"><CheckCircle className="ml-2 h-4 w-4" />قبول</Button>
                                                <Button onClick={() => openReviewModal(request, 'rejected')} variant="destructive" className="flex-1"><XCircle className="ml-2 h-4 w-4" />رفض</Button>
                                            </div>
                                        )}
                                    </CardContent></Card>
                                ))}</div>}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="history">
                        <Card><CardHeader><CardTitle>السجل الكامل للعهد</CardTitle><CardDescription>جميع طلبات العهد (معتمدة، مرفوضة، مسوّاة)</CardDescription></CardHeader>
                            <CardContent>{loading ? <div className="flex justify-center py-8"><Spin size="large" /></div> : custodyRequests.length === 0 ? <Empty description="لا توجد طلبات" /> :
                                <div className="overflow-x-auto"><Table>
                                    <TableHeader><TableRow><TableHead>الموظف</TableHead><TableHead>العنوان</TableHead><TableHead>المبلغ</TableHead><TableHead>الحالة</TableHead><TableHead>التاريخ</TableHead></TableRow></TableHeader>
                                    <TableBody>{custodyRequests.map((request) => (
                                        <TableRow key={request.id}>
                                            <TableCell className="font-medium">{request.profiles?.name_ar}</TableCell>
                                            <TableCell>{request.title}</TableCell>
                                            <TableCell>{formatCurrency(request.amount)}</TableCell>
                                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                                            <TableCell>{format(new Date(request.created_at), 'PPp', { locale: ar })}</TableCell>
                                        </TableRow>
                                    ))}</TableBody>
                                </Table></div>}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            <Modal title={selectedRequest?.action === 'approved' ? 'قبول طلب العهدة' : 'رفض طلب العهدة'} open={reviewModalOpen} onCancel={() => setReviewModalOpen(false)}
                footer={[<Button key="cancel" variant="outline" onClick={() => setReviewModalOpen(false)}>إلغاء</Button>,
                    <Button key="submit" onClick={handleReview} disabled={submitting} className={selectedRequest?.action === 'approved' ? 'bg-green-600' : ''}>{submitting ? 'جاري المعالجة...' : 'تأكيد'}</Button>
                ]}>
                {selectedRequest && <div className="space-y-4 mt-4">
                    <div className="p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-600">الموظف:</p><p className="font-bold">{selectedRequest.profiles?.name_ar}</p></div>
                    <div className="p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-600">المبلغ:</p><p className="font-bold">{formatCurrency(selectedRequest.amount)}</p></div>
                    <div><label className="block text-sm font-medium mb-2">ملاحظات (اختياري)</label><TextArea rows={4} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="أضف أي ملاحظات..." /></div>
                </div>}
            </Modal>
            
            {selectedSettlement && <ReviewSettlementModal settlementId={selectedSettlement.id} visible={custodyReviewModalOpen} onCancel={() => setCustodyReviewModalOpen(false)} onFinish={handleCustodyActionCallback} />}
        </>
    );
};

export default CustodyManagement;