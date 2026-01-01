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
import { 
  Wallet, Plus, Trash2, Upload, Receipt, CheckCircle, Clock, 
  AlertCircle, FileText, X, Loader2, Calculator, Eye
} from 'lucide-react';
import { message, Spin, Empty, Modal } from 'antd';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
import { formatCurrency } from '@/utils/financialUtils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { notifyManagerNewRequest } from '@/utils/notificationService';

// إعدادات API الرفع (نفس نظام الملفات)
const STORAGE_API_URL = 'https://sys.mtserp.com';
const STORAGE_API_KEY = 'MTS_FILES_2025_SECRET_KEY';

const RequestCustody = () => {
  const { user, profile } = useAuth();
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

  // حالة نافذة التسوية
  const [settlementModalOpen, setSettlementModalOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [settlementItems, setSettlementItems] = useState([]);
  const [settlementNotes, setSettlementNotes] = useState('');
  const [uploadingIndex, setUploadingIndex] = useState(null);

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

      // جلب العهد المفتوحة
      const approvedRequestIds = (requests || [])
        .filter(r => r.status === 'approved')
        .map(r => r.id);

      if (approvedRequestIds.length > 0) {
        const { data: settlements, error: settError } = await supabase
          .from('custody_settlements')
          .select('*')
          .in('custody_request_id', approvedRequestIds)
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

    // منع الإرسال المزدوج
    if (submitting) return;

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

      const { data, error } = await supabase
        .from('employee_requests')
        .insert([requestData])
        .select();

      if (error) throw error;

      // إشعار المدير
      try {
        await notifyManagerNewRequest(
          '0539755999',
          profile?.name_ar || 'موظف',
          'custody',
          data?.[0]?.request_number || '',
          `المبلغ: ${formData.amount} ريال\nالوصف: ${formData.description || 'لا يوجد'}`
        );
      } catch (e) {
        console.log('Notification failed:', e);
      }

      message.success('تم إرسال طلب العهدة بنجاح!');
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
    setSettlementItems([{ item_name: '', amount: '', receipt_url: '' }]);
    setSettlementNotes('');
    setSettlementModalOpen(true);
  };

  // إضافة بند جديد
  const addSettlementItem = () => {
    setSettlementItems([...settlementItems, { item_name: '', amount: '', receipt_url: '' }]);
  };

  // حذف بند
  const removeSettlementItem = (index) => {
    if (settlementItems.length === 1) {
      message.warning('يجب وجود بند واحد على الأقل');
      return;
    }
    setSettlementItems(settlementItems.filter((_, i) => i !== index));
  };

  // تحديث بند
  const updateSettlementItem = (index, field, value) => {
    const updated = [...settlementItems];
    updated[index][field] = value;
    setSettlementItems(updated);
  };

  // رفع صورة الفاتورة (نفس نظام الملفات)
  const uploadReceipt = async (index, file) => {
    if (!file) return;

    // التحقق من نوع الملف
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      message.error('نوع الملف غير مدعوم. استخدم JPG أو PNG أو PDF');
      return;
    }

    // التحقق من الحجم (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      message.error('حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت');
      return;
    }

    setUploadingIndex(index);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', user.id);
      formData.append('folder', 'custody_receipts');

      const response = await fetch(`${STORAGE_API_URL}/upload.php`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STORAGE_API_KEY}`
        },
        body: formData,
      });

      const result = await response.json();

      if (result.success || result.url) {
        // حفظ في file_metadata
        await supabase.from('file_metadata').insert({
          user_id: user.id,
          folder_name: 'custody_receipts',
          original_name: file.name,
          stored_name: result.url.split('/').pop(),
          file_url: result.url,
          file_size: file.size,
          mime_type: file.type,
          employee_name: profile?.name_ar,
          description: `فاتورة عهدة - ${selectedSettlement?.id || 'جديد'}`,
          file_type: 'custody_receipts',
        });

        updateSettlementItem(index, 'receipt_url', result.url);
        message.success('تم رفع الفاتورة بنجاح');
      } else {
        throw new Error(result.message || 'فشل رفع الملف');
      }

    } catch (error) {
      console.error('Upload error:', error);
      message.error('فشل رفع الفاتورة: ' + error.message);
    } finally {
      setUploadingIndex(null);
    }
  };

  // حساب إجمالي المصروفات
  const calculateTotalSpent = () => {
    return settlementItems.reduce((sum, item) => {
      return sum + (parseFloat(item.amount) || 0);
    }, 0);
  };

  // حساب المتبقي
  const calculateRemaining = () => {
    if (!selectedSettlement) return 0;
    return selectedSettlement.custody_amount - calculateTotalSpent();
  };

  // إرسال التسوية
  const handleSettlementSubmit = async () => {
    // التحقق من البنود
    const validItems = settlementItems.filter(item => item.item_name.trim() && parseFloat(item.amount) > 0);
    
    if (validItems.length === 0) {
      message.error('أضف بند واحد على الأقل مع اسم ومبلغ');
      return;
    }

    const totalSpent = calculateTotalSpent();
    const custodyAmount = selectedSettlement.custody_amount;

    if (totalSpent > custodyAmount) {
      message.error('إجمالي المصروفات أكبر من مبلغ العهدة!');
      return;
    }

    setSubmitting(true);
    try {
      const remaining = custodyAmount - totalSpent;
      const newStatus = remaining === 0 ? 'settled' : 'open';

      // تحديث التسوية
      const { error: updateError } = await supabase
        .from('custody_settlements')
        .update({
          total_spent: totalSpent,
          remaining_amount: remaining,
          settlement_notes: settlementNotes,
          status: newStatus,
          settled_at: newStatus === 'settled' ? new Date().toISOString() : null,
          settled_by: newStatus === 'settled' ? user.id : null,
        })
        .eq('id', selectedSettlement.id);

      if (updateError) throw updateError;

      // إضافة بنود التسوية
      const itemsToInsert = validItems.map(item => ({
        settlement_id: selectedSettlement.id,
        item_name: item.item_name,
        amount: parseFloat(item.amount),
        receipt_url: item.receipt_url || null,
        notes: null,
      }));

      const { error: itemsError } = await supabase
        .from('custody_settlement_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      if (newStatus === 'settled') {
        message.success('تم تسوية العهدة بالكامل!');
      } else {
        message.warning(`تم حفظ المصروفات. المتبقي: ${formatCurrency(remaining)}`);
      }

      setSettlementModalOpen(false);
      fetchData();

    } catch (error) {
      handleSupabaseError(error, 'فشل في حفظ التسوية');
    } finally {
      setSubmitting(false);
    }
  };

  // Badge للحالة
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'قيد المراجعة', className: 'bg-amber-100 text-amber-800' },
      approved: { label: 'معتمد', className: 'bg-green-100 text-green-800' },
      rejected: { label: 'مرفوض', className: 'bg-red-100 text-red-800' },
      settled: { label: 'مسوّى', className: 'bg-blue-100 text-blue-800' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <>
      <Helmet>
        <title>العهد المالية | MTS</title>
      </Helmet>
      <PageTitle title="العهد المالية" />

      <div className="space-y-6 max-w-5xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">العهد المالية</h1>
            <p className="text-gray-500">طلب وتسوية العهد المالية</p>
          </div>
        </div>

        <Tabs defaultValue="request" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="request" className="gap-2">
              <Plus className="w-4 h-4" />
              طلب عهدة
            </TabsTrigger>
            <TabsTrigger value="open" className="gap-2">
              <Clock className="w-4 h-4" />
              العهد المفتوحة
              {openSettlements.length > 0 && (
                <Badge className="bg-orange-500 text-white mr-1">{openSettlements.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <FileText className="w-4 h-4" />
              السجل
            </TabsTrigger>
          </TabsList>

          {/* تبويب طلب عهدة */}
          <TabsContent value="request">
            <Card className="shadow-lg border-t-4 border-t-purple-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-purple-600" />
                  طلب عهدة جديدة
                </CardTitle>
                <CardDescription>
                  أدخل بيانات العهدة المطلوبة وسيتم مراجعتها من الإدارة
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">عنوان العهدة *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="مثال: مصاريف مباراة الهلال"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">المبلغ المطلوب (ريال) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">وصف / سبب الطلب</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="اشرح سبب طلب العهدة..."
                      rows={3}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting || !formData.title.trim() || !formData.amount}
                    className="w-full bg-purple-600 hover:bg-purple-700 h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin ml-2" />
                    ) : (
                      <Plus className="w-5 h-5 ml-2" />
                    )}
                    {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* تبويب العهد المفتوحة */}
          <TabsContent value="open">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  العهد المفتوحة
                </CardTitle>
                <CardDescription>
                  العهد المعتمدة التي تحتاج إلى تسوية
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
                      const request = custodyRequests.find(r => r.id === settlement.custody_request_id);
                      const spent = settlement.total_spent || 0;
                      const remaining = settlement.custody_amount - spent;
                      
                      return (
                        <Card key={settlement.id} className="border-orange-200 bg-orange-50/30">
                          <CardContent className="pt-6">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="font-bold text-lg">{request?.title || 'عهدة مالية'}</h3>
                                <p className="text-sm text-gray-600">{request?.description}</p>
                              </div>
                              <Badge className="bg-orange-500 text-white">مفتوحة</Badge>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div className="bg-white p-3 rounded-lg border">
                                <span className="text-xs text-gray-500 block">مبلغ العهدة</span>
                                <p className="font-bold text-lg text-blue-600">
                                  {formatCurrency(settlement.custody_amount)}
                                </p>
                              </div>
                              <div className="bg-white p-3 rounded-lg border">
                                <span className="text-xs text-gray-500 block">المصروف</span>
                                <p className="font-bold text-lg text-red-600">
                                  {formatCurrency(spent)}
                                </p>
                              </div>
                              <div className="bg-white p-3 rounded-lg border">
                                <span className="text-xs text-gray-500 block">المتبقي</span>
                                <p className="font-bold text-lg text-green-600">
                                  {formatCurrency(remaining)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-xs text-gray-500 mb-4">
                              تاريخ الاستلام: {format(new Date(settlement.created_at), 'PPp', { locale: ar })}
                            </div>
                            
                            <Button
                              onClick={() => openSettlementModal(settlement)}
                              className="w-full bg-green-600 hover:bg-green-700"
                            >
                              <Receipt className="ml-2 h-4 w-4" />
                              إضافة مصروفات / تسوية
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

          {/* تبويب السجل */}
          <TabsContent value="history">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  سجل الطلبات
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Spin size="large" />
                  </div>
                ) : custodyRequests.length === 0 ? (
                  <Empty description="لا توجد طلبات" />
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
                            <TableCell className="text-sm text-gray-500">
                              {format(new Date(request.created_at), 'PP', { locale: ar })}
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
        title={
          <div className="flex items-center gap-2 text-lg">
            <Calculator className="w-5 h-5 text-green-600" />
            تسوية العهدة
          </div>
        }
        open={settlementModalOpen}
        onCancel={() => setSettlementModalOpen(false)}
        width={700}
        footer={null}
      >
        {selectedSettlement && (
          <div className="space-y-6 mt-4">
            {/* ملخص العهدة */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <p className="text-xs text-blue-600 mb-1">مبلغ العهدة</p>
                <p className="text-xl font-bold text-blue-700">
                  {formatCurrency(selectedSettlement.custody_amount)}
                </p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <p className="text-xs text-red-600 mb-1">إجمالي المصروف</p>
                <p className="text-xl font-bold text-red-700">
                  {formatCurrency(calculateTotalSpent())}
                </p>
              </div>
              <div className={`p-3 rounded-lg text-center ${calculateRemaining() >= 0 ? 'bg-green-50' : 'bg-red-100'}`}>
                <p className={`text-xs mb-1 ${calculateRemaining() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  المتبقي
                </p>
                <p className={`text-xl font-bold ${calculateRemaining() >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(calculateRemaining())}
                </p>
              </div>
            </div>

            {calculateRemaining() < 0 && (
              <div className="bg-red-100 border border-red-300 text-red-700 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>المصروفات تتجاوز مبلغ العهدة!</span>
              </div>
            )}

            {/* بنود المصروفات */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-bold">بنود المصروفات</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSettlementItem}
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  إضافة بند
                </Button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {settlementItems.map((item, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">بند {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSettlementItem(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">اسم البند *</Label>
                        <Input
                          value={item.item_name}
                          onChange={(e) => updateSettlementItem(index, 'item_name', e.target.value)}
                          placeholder="مثال: وجبات غداء"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">المبلغ (ريال) *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) => updateSettlementItem(index, 'amount', e.target.value)}
                          placeholder="0.00"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* رفع صورة الفاتورة */}
                    <div>
                      <Label className="text-xs">صورة الفاتورة (اختياري)</Label>
                      <div className="mt-1 flex items-center gap-2">
                        {item.receipt_url ? (
                          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg flex-1">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm truncate flex-1">تم رفع الفاتورة</span>
                            <a 
                              href={item.receipt_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              عرض
                            </a>
                            <button
                              type="button"
                              onClick={() => updateSettlementItem(index, 'receipt_url', '')}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex-1 cursor-pointer">
                            <div className={`border-2 border-dashed rounded-lg p-3 text-center hover:border-purple-400 hover:bg-purple-50 transition-colors ${uploadingIndex === index ? 'border-purple-400 bg-purple-50' : 'border-gray-300'}`}>
                              {uploadingIndex === index ? (
                                <div className="flex items-center justify-center gap-2 text-purple-600">
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                  <span className="text-sm">جاري الرفع...</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-2 text-gray-500">
                                  <Upload className="w-5 h-5" />
                                  <span className="text-sm">اضغط لرفع صورة الفاتورة</span>
                                </div>
                              )}
                            </div>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => uploadReceipt(index, e.target.files[0])}
                              disabled={uploadingIndex !== null}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ملاحظات */}
            <div>
              <Label>ملاحظات عامة (اختياري)</Label>
              <Textarea
                value={settlementNotes}
                onChange={(e) => setSettlementNotes(e.target.value)}
                placeholder="أي ملاحظات إضافية..."
                rows={2}
                className="mt-1"
              />
            </div>

            {/* أزرار */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setSettlementModalOpen(false)}
                className="flex-1"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSettlementSubmit}
                disabled={submitting || calculateRemaining() < 0}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin ml-2" />
                ) : (
                  <CheckCircle className="w-5 h-5 ml-2" />
                )}
                {submitting ? 'جاري الحفظ...' : calculateRemaining() === 0 ? 'تسوية كاملة' : 'حفظ المصروفات'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default RequestCustody;