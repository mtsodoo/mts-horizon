import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Package, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { message, Spin, Empty, Modal } from 'antd';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
import { formatCurrency } from '@/utils/financialUtils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const RequestCustody = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [custodyRequests, setCustodyRequests] = useState([]);
    const [openSettlements, setOpenSettlements] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        amount: '',
    });

    const [settlementModalOpen, setSettlementModalOpen] = useState(false);
    const [selectedSettlement, setSelectedSettlement] = useState(null);
    const [settlementData, setSettlementData] = useState({
        total_spent: '',
        notes: '',
    });

    // جلب البيانات
    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // جلب طلبات العهد
            const { data: requests, error: reqError } = await supabase
                .from('employee_requests')
                .select('*')
                .eq('user_id', user.id)
                .eq('request_type', 'custody')
                .order('created_at', { ascending: false });

            if (reqError) throw reqError;
            setCustodyRequests(requests || []);

            // جلب العهد المفتوحة (المعتمدة وغير المسوّاة)
            const approvedRequestIds = (requests || [])
                .filter(r => r.status === 'approved')
                .map(r => r.id);

            if (approvedRequestIds.length > 0) {
                const { data: settlements, error: settError } = await supabase
                    .from('custody_settlements')
                    .select('*')
                    .in('request_id', approvedRequestIds)
                    .eq('status', 'open');

                if (settError) throw settError;
                setOpenSettlements(settlements || []);
            } else {
                setOpenSettlements([]);
            }

        } catch (error) {
            handleSupabaseError(error, 'فشل في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    // إرسال طلب عهدة جديد
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            message.error('أدخل عنوان الطلب');
            return;
        }

        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            message.error('أدخل المبلغ المطلوب');
            return;
        }

        setSubmitting(true);
        try {
            const requestData = {
                user_id: user.id,
                request_type: 'custody',
                title: formData.title,
                description: formData.description || null,
                amount: parseFloat(formData.amount),
                status: 'pending',
                created_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('employee_requests')
                .insert([requestData]);

            if (error) throw error;

            message.success('✅ تم إرسال طلب العهدة بنجاح!');
            setFormData({ title: '', description: '', amount: '' });
            fetchData();

        } catch (error) {
            handleSupabaseError(error, 'فشل إرسال الطلب');
        } finally {
            setSubmitting(false);
        }
    };

    // فتح نافذة التسوية
    const openSettlementModal = (settlement) => {
        setSelectedSettlement(settlement);
        setSettlementData({
            total_spent: '',
            notes: '',
        });
        setSettlementModalOpen(true);
    };

    // إرسال التسوية
    const handleSettlementSubmit = async () => {
        if (!settlementData.total_spent || parseFloat(settlementData.total_spent) < 0) {
            message.error('أدخل المبلغ المصروف');
            return;
        }

        const totalSpent = parseFloat(settlementData.total_spent);
        const custodyAmount = selectedSettlement.custody_amount;

        if (totalSpent > custodyAmount) {
            message.error('المبلغ المصروف أكبر من مبلغ العهدة!');
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('custody_settlements')
                .update({
                    total_spent: totalSpent,
                    remaining_amount: custodyAmount - totalSpent,
                    notes: settlementData.notes || null,
                    status: 'settled',
                    settled_at: new Date().toISOString(),
                })
                .eq('id', selectedSettlement.id);

            if (error) throw error;

            message.success('✅ تم تسوية العهدة بنجاح!');
            setSettlementModalOpen(false);
            fetchData();

        } catch (error) {
            handleSupabaseError(error, 'فشل في التسوية');
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
            <Helmet><title>العهد</title></Helmet>
            <div className="space-y-6 p-4 md:p-8">
                <PageTitle title="العهد" icon={Package} />

                <Tabs defaultValue="request" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="request">طلب عهدة جديدة</TabsTrigger>
                        <TabsTrigger value="settlements">
                            التسوية ({openSettlements.length})
                        </TabsTrigger>
                        <TabsTrigger value="history">التقرير الشامل</TabsTrigger>
                    </TabsList>

                    {/* تبويب طلب عهدة جديدة */}
                    <TabsContent value="request">
                        <Card>
                            <CardHeader>
                                <CardTitle>تقديم طلب عهدة مالية</CardTitle>
                                <CardDescription>
                                    املأ النموذج أدناه لتقديم طلب عهدة مالية. سيتم مراجعته من قبل المدير.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div>
                                        <Label htmlFor="title">عنوان الطلب *</Label>
                                        <Input
                                            id="title"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            placeholder="مثال: عهدة مصاريف السفر"
                                            className="mt-2"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="amount">المبلغ المطلوب (ريال) *</Label>
                                        <Input
                                            id="amount"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            placeholder="0.00"
                                            className="mt-2"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="description">وصف الغرض من العهدة *</Label>
                                        <Textarea
                                            id="description"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="أدخل تفاصيل الغرض من العهدة المالية..."
                                            rows={4}
                                            className="mt-2"
                                            required
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => navigate(-1)}
                                            disabled={submitting}
                                            className="flex-1"
                                        >
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                            رجوع
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={submitting}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            {submitting && <Spin size="small" className="ml-2" />}
                                            {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* تبويب التسوية */}
                    <TabsContent value="settlements">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    العهد المفتوحة
                                </CardTitle>
                                <CardDescription>
                                    قائمة العهد التي تم اعتمادها وتحتاج إلى تسوية
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <Spin size="large" />
                                    </div>
                                ) : openSettlements.length === 0 ? (
                                    <Empty description="لا توجد عهد مفتوحة" />
                                ) : (
                                    <div className="space-y-4">
                                        {openSettlements.map((settlement) => {
                                            const request = custodyRequests.find(r => r.id === settlement.request_id);
                                            return (
                                                <Card key={settlement.id} className="border-orange-200">
                                                    <CardContent className="pt-6">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div>
                                                                <h3 className="font-bold text-lg">{request?.title || 'عهدة مالية'}</h3>
                                                                <p className="text-sm text-gray-600">{request?.description}</p>
                                                            </div>
                                                            <Badge className="bg-orange-500 text-white">مفتوحة</Badge>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                                            <div>
                                                                <span className="text-sm text-gray-500">المبلغ المستلم:</span>
                                                                <p className="font-bold text-lg text-blue-600">
                                                                    {formatCurrency(settlement.custody_amount)}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <span className="text-sm text-gray-500">تاريخ الاستلام:</span>
                                                                <p className="font-medium">
                                                                    {format(new Date(settlement.created_at), 'PPp', { locale: ar })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            onClick={() => openSettlementModal(settlement)}
                                                            className="w-full bg-green-600 hover:bg-green-700"
                                                        >
                                                            <CheckCircle className="ml-2 h-4 w-4" />
                                                            تسوية العهدة
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* تبويب التقرير الشامل */}
                    <TabsContent value="history">
                        <Card>
                            <CardHeader>
                                <CardTitle>التقرير الشامل للعهد</CardTitle>
                                <CardDescription>
                                    جميع طلبات العهد (معتمدة، مرفوضة، قيد المراجعة)
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <Spin size="large" />
                                    </div>
                                ) : custodyRequests.length === 0 ? (
                                    <Empty description="لا توجد طلبات عهد" />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>العنوان</TableHead>
                                                    <TableHead>المبلغ</TableHead>
                                                    <TableHead>الحالة</TableHead>
                                                    <TableHead>التاريخ</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {custodyRequests.map((request) => (
                                                    <TableRow key={request.id}>
                                                        <TableCell className="font-medium">{request.title}</TableCell>
                                                        <TableCell>{formatCurrency(request.amount)}</TableCell>
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

            {/* نافذة التسوية */}
            <Modal
                title="تسوية العهدة"
                open={settlementModalOpen}
                onCancel={() => setSettlementModalOpen(false)}
                footer={[
                    <Button key="cancel" variant="outline" onClick={() => setSettlementModalOpen(false)}>
                        إلغاء
                    </Button>,
                    <Button key="submit" onClick={handleSettlementSubmit} disabled={submitting}>
                        {submitting ? 'جاري التسوية...' : 'تسوية'}
                    </Button>,
                ]}
            >
                {selectedSettlement && (
                    <div className="space-y-4 mt-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-gray-600">مبلغ العهدة:</p>
                            <p className="text-xl font-bold text-blue-600">
                                {formatCurrency(selectedSettlement.custody_amount)}
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="total_spent">المبلغ المصروف (ريال) *</Label>
                            <Input
                                id="total_spent"
                                type="number"
                                step="0.01"
                                min="0"
                                max={selectedSettlement.custody_amount}
                                value={settlementData.total_spent}
                                onChange={(e) => setSettlementData({ ...settlementData, total_spent: e.target.value })}
                                placeholder="0.00"
                                className="mt-2"
                            />
                        </div>

                        {settlementData.total_spent && (
                            <div className="p-4 bg-green-50 rounded-lg">
                                <p className="text-sm text-gray-600">المبلغ المتبقي:</p>
                                <p className="text-xl font-bold text-green-600">
                                    {formatCurrency(selectedSettlement.custody_amount - parseFloat(settlementData.total_spent || 0))}
                                </p>
                            </div>
                        )}

                        <div>
                            <Label htmlFor="notes">ملاحظات (اختياري)</Label>
                            <Textarea
                                id="notes"
                                value={settlementData.notes}
                                onChange={(e) => setSettlementData({ ...settlementData, notes: e.target.value })}
                                placeholder="أدخل أي ملاحظات..."
                                rows={3}
                                className="mt-2"
                            />
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default RequestCustody;