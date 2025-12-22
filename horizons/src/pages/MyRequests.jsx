
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Helmet } from 'react-helmet';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Eye, RefreshCw, DoorOpen } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Spin, Empty, Tag, message, Tabs } from 'antd';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
// 🔥 استيراد أداة التسجيل
import { logSystemActivity } from '@/utils/omarTools';

const MyRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Form state - Default to custody
  const [formData, setFormData] = useState({
    request_type: 'custody',
    title: '',
    description: '',
    amount: '',
    total_days: '',
    installments_count: '1',
  });

  // Fetch user's requests
  const fetchRequests = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);

    } catch (error) {
      handleSupabaseError(error, 'فشل جلب الطلبات');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load requests on mount
  useEffect(() => {
    if (user?.id) {
      fetchRequests();

      // Subscribe to real-time updates
      const channel = supabase
        .channel('my_requests_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'employee_requests', filter: `user_id=eq.${user.id}` },
          () => {
            console.log('📡 Real-time update received for my requests');
            fetchRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, fetchRequests]);

  const handleCreateRequest = async (e) => {
    e.preventDefault();

    if (!formData.request_type) {
      message.error('اختر نوع الطلب');
      return;
    }

    if (!formData.title || formData.title.trim().length === 0) {
      message.error('أدخل عنوان الطلب');
      return;
    }

    if (formData.request_type === 'custody' || formData.request_type === 'loan') {
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        message.error('أدخل مبلغ صحيح');
        return;
      }
    }

    if (formData.request_type === 'loan') {
      if (!formData.installments_count || parseInt(formData.installments_count) <= 0) {
        message.error('أدخل عدد أقساط صحيح');
        return;
      }
    }

    if (formData.request_type === 'leave') {
      if (!formData.total_days || parseInt(formData.total_days) <= 0) {
        message.error('أدخل عدد أيام صحيح');
        return;
      }
    }

    try {
      setSubmitting(true);
      
      const requestData = {
        user_id: user.id,
        request_type: formData.request_type,
        title: formData.title,
        description: formData.description || null,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      // Add type-specific fields
      if (formData.request_type === 'custody' || formData.request_type === 'loan') {
        requestData.amount = parseFloat(formData.amount);
      }

      if (formData.request_type === 'loan') {
        requestData.installments_count = parseInt(formData.installments_count);
      }

      if (formData.request_type === 'leave') {
        requestData.total_days = parseInt(formData.total_days);
      }

      const { data: newRequest, error } = await supabase
        .from('employee_requests')
        .insert([requestData])
        .select();

      if (error) throw error;

      // 🔥 تسجيل العملية في السجل الشامل
      logSystemActivity(
          user.id, 
          'CREATE_REQUEST', 
          'REQUEST', 
          { 
              type: formData.request_type, 
              title: formData.title,       
              amount: requestData.amount,  
              days: requestData.total_days 
          }, 
          newRequest[0].id
      );

      message.success('✅ تم إنشاء الطلب بنجاح!');

      // Reset form
      setFormData({
        request_type: 'custody',
        title: '',
        description: '',
        amount: '',
        total_days: '',
        installments_count: '1',
      });

      setIsCreateModalOpen(false);

    } catch (error) {
      handleSupabaseError(error, 'فشل إنشاء الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenView = (request) => {
    setSelectedRequest(request);
    setIsViewModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setFormData({
      request_type: 'custody',
      title: '',
      description: '',
      amount: '',
      total_days: '',
      installments_count: '1',
    });
  };

  const getRequestTypeLabel = (type) => {
    const labels = {
      'custody': 'عهدة مالية',
      'leave': 'إجازة',
      'loan': 'سلفة',
      'permission': 'استئذان',
      'settlement_review': 'مراجعة تسوية',
      'other': 'أخرى'
    };
    return labels[type] || type;
  };

  const getRequestTypeColor = (type) => {
    const colors = {
      'custody': 'blue',
      'leave': 'green',
      'loan': 'orange',
      'permission': 'cyan',
      'settlement_review': 'purple',
      'other': 'gray'
    };
    return colors[type] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'pending': 'قيد الانتظار',
      'approved': 'معتمد',
      'rejected': 'مرفوض',
      'completed': 'مكتمل'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'orange',
      'approved': 'green',
      'rejected': 'red',
      'completed': 'blue',
    };
    return colors[status] || 'default';
  };

  const tabItems = [
    {
      key: 'all',
      label: `الكل (${requests.length})`,
      children: null
    },
    {
      key: 'pending',
      label: `قيد الانتظار (${requests.filter(r => r.status === 'pending').length})`,
      children: null
    },
    {
      key: 'approved',
      label: `معتمد (${requests.filter(r => r.status === 'approved').length})`,
      children: null
    },
    {
      key: 'rejected',
      label: `مرفوض (${requests.filter(r => r.status === 'rejected').length})`,
      children: null
    }
  ];

  const filteredRequests = activeTab === 'all'
    ? requests
    : requests.filter(r => r.status === activeTab);

  return (
    <>
      <Helmet>
        <title>طلباتي</title>
        <meta name="description" content="عرض وإدارة جميع طلباتك المقدمة في النظام." />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageTitle title="طلباتي" icon={FileText} />
          <div className="flex gap-2">
            <Button
              onClick={fetchRequests}
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            {/* The "طلب جديد" button has been removed */}
          </div>
        </div>
        
        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة الطلبات</CardTitle>
            <CardDescription>جميع الطلبات التي قمت بإنشائها.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
            />

            {loading ? (
              <div className="flex justify-center py-8">
                <Spin size="large" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <Empty description={`لا توجد طلبات ${activeTab !== 'all' ? 'بهذه الحالة' : ''}`} />
            ) : (
              <div className="overflow-x-auto mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>نوع الطلب</TableHead>
                      <TableHead>العنوان</TableHead>
                      <TableHead>التفاصيل</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead className="text-center">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <Tag color={getRequestTypeColor(request.request_type)}>
                            {getRequestTypeLabel(request.request_type)}
                          </Tag>
                        </TableCell>
                        <TableCell className="font-semibold max-w-xs truncate">
                          {request.title}
                        </TableCell>
                        <TableCell className="text-sm">
                          {(request.request_type === 'custody' || request.request_type === 'loan') && (
                            <span>{parseFloat(request.amount || 0).toLocaleString()} ريال</span>
                          )}
                          {request.request_type === 'loan' && request.installments_count && (
                            <span className="text-gray-500 mr-2">({request.installments_count} قسط)</span>
                          )}
                          {request.request_type === 'leave' && (
                            <span>{request.total_days} يوم</span>
                          )}
                           {request.request_type === 'settlement_review' && (
                            <span className="text-gray-500">راجع تفاصيل التسوية</span>
                          )}
                          {(request.request_type === 'other' || request.request_type === 'permission') && (
                            <span className="max-w-[150px] truncate block">{request.description || '-'}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Tag color={getStatusColor(request.status)}>
                            {getStatusLabel(request.status)}
                          </Tag>
                        </TableCell>
                        <TableCell>
                          {format(new Date(request.created_at), 'PPP', { locale: ar })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenView(request)}
                          >
                            <Eye className="w-4 h-4 ml-1" />
                            عرض
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
      </div>

      {/* Create Request Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={handleCloseCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إنشاء طلب جديد</DialogTitle>
            <DialogDescription>املأ الحقول التالية لإنشاء طلبك.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRequest} className="space-y-6 pt-4">
            {/* Request Type */}
            <div>
              <Label htmlFor="request_type">نوع الطلب *</Label>
              <Select
                value={formData.request_type}
                onValueChange={(value) => setFormData({ ...formData, request_type: value, title: '', description: '' })}
              >
                <SelectTrigger id="request_type" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custody">طلب عهدة مالية</SelectItem>
                  <SelectItem value="leave">طلب إجازة</SelectItem>
                  <SelectItem value="loan">طلب سلفة</SelectItem>
                  <SelectItem value="permission">طلب استئذان</SelectItem>
                  <SelectItem value="other">طلب آخر</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title">العنوان *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="مثال: عهدة لشراء مستلزمات مكتبية"
                className="mt-2"
              />
            </div>

            {/* Amount (for custody/loan) */}
            {(formData.request_type === 'custody' || formData.request_type === 'loan') && (
              <div>
                <Label htmlFor="amount">المبلغ المطلوب (بالريال) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="أدخل المبلغ المطلوب"
                  className="mt-2"
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            {/* Installments (for loan only) */}
            {formData.request_type === 'loan' && (
              <div>
                <Label htmlFor="installments_count">عدد الأقساط *</Label>
                <Input
                  id="installments_count"
                  type="number"
                  value={formData.installments_count}
                  onChange={(e) => setFormData({ ...formData, installments_count: e.target.value })}
                  placeholder="أدخل عدد الأقساط"
                  className="mt-2"
                  min="1"
                  max="12"
                />
                {formData.amount && formData.installments_count && (
                  <p className="text-sm text-gray-500 mt-2">
                    القسط الشهري: {(parseFloat(formData.amount) / parseInt(formData.installments_count)).toFixed(2)} ريال
                  </p>
                )}
              </div>
            )}

            {/* Days (for leave) */}
            {formData.request_type === 'leave' && (
              <div>
                <Label htmlFor="total_days">عدد أيام الإجازة *</Label>
                <Input
                  id="total_days"
                  type="number"
                  value={formData.total_days}
                  onChange={(e) => setFormData({ ...formData, total_days: e.target.value })}
                  placeholder="أدخل عدد الأيام"
                  className="mt-2"
                  min="1"
                />
              </div>
            )}

            {/* Description */}
            <div>
              <Label htmlFor="description">تفاصيل الطلب {formData.request_type === 'permission' ? '(مطلوب للاستئذان)' : '(اختياري)'}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="أدخل أي تفاصيل إضافية هنا..."
                rows={4}
                className="mt-2"
              />
            </div>
          </form>

          <DialogFooter className="gap-2 pt-4">
            <Button variant="ghost" onClick={handleCloseCreateModal} disabled={submitting}>
              إلغاء
            </Button>
            <Button
              onClick={handleCreateRequest}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? <Spin size="small" className="ml-2" /> : null}
              {submitting ? 'جاري الإنشاء...' : 'إنشاء الطلب'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Request Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={() => setIsViewModalOpen(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب</DialogTitle>
            <DialogDescription>
              {selectedRequest && getRequestTypeLabel(selectedRequest.request_type)}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 pt-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">نوع الطلب</span>
                    <p className="font-semibold">{getRequestTypeLabel(selectedRequest.request_type)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">الحالة</span>
                    <p className="font-semibold">
                      <Tag color={getStatusColor(selectedRequest.status)}>
                        {getStatusLabel(selectedRequest.status)}
                      </Tag>
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 dark:text-gray-400">العنوان</span>
                    <p className="font-semibold">{selectedRequest.title}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">تاريخ الإنشاء</span>
                    <p className="font-semibold">
                      {format(new Date(selectedRequest.created_at), 'PPP p', { locale: ar })}
                    </p>
                  </div>

                  {(selectedRequest.request_type === 'custody' || selectedRequest.request_type === 'loan') && (
                    <>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">المبلغ</span>
                        <p className="font-semibold text-green-600">
                          {parseFloat(selectedRequest.amount || 0).toLocaleString()} ريال
                        </p>
                      </div>
                      {selectedRequest.request_type === 'loan' && selectedRequest.installments_count && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">عدد الأقساط</span>
                          <p className="font-semibold">{selectedRequest.installments_count} قسط</p>
                        </div>
                      )}
                      {selectedRequest.request_type === 'loan' && selectedRequest.monthly_installment && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">القسط الشهري</span>
                          <p className="font-semibold text-blue-600">
                            {parseFloat(selectedRequest.monthly_installment).toLocaleString()} ريال
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {selectedRequest.request_type === 'leave' && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">عدد الأيام</span>
                      <p className="font-semibold">{selectedRequest.total_days} يوم</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedRequest.description && (
                <div>
                  <Label>تفاصيل الطلب</Label>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg mt-2 text-sm whitespace-pre-wrap">
                    {selectedRequest.description}
                  </div>
                </div>
              )}

              {selectedRequest.review_notes && (
                <div>
                  <Label className={selectedRequest.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}>
                    ملاحظات المراجعة
                  </Label>
                  <div className={`p-3 rounded-lg mt-2 text-sm ${selectedRequest.status === 'rejected' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30' : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30'}`}>
                    {selectedRequest.review_notes}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MyRequests;
