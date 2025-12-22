
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Helmet } from 'react-helmet';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty, Spin, message, Tag, Alert } from 'antd';
import { FileClock, User, Calendar, Type, FileText, Check, X, Download, Landmark, Wallet, BedDouble, FileQuestion, HelpCircle } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
import { formatCurrency } from '@/utils/financialUtils';
// 🔥 استيراد أداة التسجيل لتوثيق قرارات المدير
import { logSystemActivity } from '@/utils/omarTools';

const OperationsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("leave");
  // Added 'other' to state
  const [requests, setRequests] = useState({ leave: [], custody: [], loan: [], permission: [], other: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getRequestTypeLabel = (type) => ({
    leave: 'إجازة', 
    custody: 'عهدة مالية', 
    loan: 'سلفة', 
    permission: 'استئذان', 
    other: 'طلب آخر'
  }[type] || type);

  const fetchData = useCallback(async (type) => {
    if (!user) return [];
    let query;
    try {
      // بناء الاستعلام بناءً على التبويب
      query = supabase.from('employee_requests')
        .select(`*, user:profiles!employee_requests_user_id_fkey(name_ar, department)`)
        .eq('status', 'pending');

      switch (type) {
        case 'leave':
          query = query.eq('request_type', 'leave');
          break;
        case 'custody':
          query = query.eq('request_type', 'custody');
          break;
        case 'loan':
          query = query.eq('request_type', 'loan');
          break;
        case 'permission':
          query = query.eq('request_type', 'permission');
          break;
        case 'other':
          query = query.eq('request_type', 'other');
          break;
        default:
          return [];
      }

      const { data, error } = await query.order('created_at', { ascending: true });
      if (error) {
        throw error;
      }
      return data || [];
    } catch (err) {
      console.error(`Failed to fetch ${type} requests:`, err);
      handleSupabaseError(err, `فشل في تحميل طلبات ${getRequestTypeLabel(type)}`);
      return [];
    }
  }, [user]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [leave, custody, loan, permission, other] = await Promise.all([
      fetchData('leave'), 
      fetchData('custody'), 
      fetchData('loan'), 
      fetchData('permission'),
      fetchData('other')
    ]);
    setRequests({ leave, custody, loan, permission, other });
    setLoading(false);
  }, [fetchData]);

  useEffect(() => {
    if (user) {
      fetchAllData();
      const channels = ['employee_requests'].map(table =>
        supabase.channel(`public:${table}:approvals`)
          .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
            console.log('Change received!', payload);
            fetchAllData();
          })
          .subscribe()
      );
      return () => channels.forEach(c => supabase.removeChannel(c));
    }
  }, [user, fetchAllData]);

  const handleOpenReview = (request, type) => {
    setSelectedRequest({ ...request, type });
    setReviewNotes('');
    setIsReviewModalOpen(true);
  };

  const handleApprovalAction = async (status) => {
    if (!selectedRequest) return;
    if (status === 'rejected' && !reviewNotes.trim()) {
      message.error('ملاحظات الرفض مطلوبة.');
      return;
    }

    setSubmitting(true);
    try {
      const updatePayload = {
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null
      };

      const { error: updateError } = await supabase
        .from('employee_requests')
        .update(updatePayload)
        .eq('id', selectedRequest.id);

      if (updateError) throw updateError;

      // منطق خاص للعهد: إنشاء تسوية
      if (selectedRequest.request_type === 'custody' && status === 'approved') {
        await supabase.from('custody_settlements').insert({
          custody_request_id: selectedRequest.id,
          user_id: selectedRequest.user_id,
          custody_amount: selectedRequest.amount,
          status: 'open',
          total_expenses: 0,
          remaining_amount: selectedRequest.amount
        });
      }

      // 🔥 تسجيل القرار في سجل الأنشطة (Activity Log)
      const actionType = 'ADMIN_DECISION'; 
      const decisionText = status === 'approved' ? 'الموافقة على' : 'رفض';
      const typeLabel = getRequestTypeLabel(selectedRequest.request_type);
      const employeeName = selectedRequest.user?.name_ar || 'موظف';

      await logSystemActivity(
        user.id,
        actionType,
        'REQUEST', 
        {
          title: `قرار إداري: ${decisionText} طلب ${typeLabel}`,
          message: `قام المدير ${user.name || 'النظام'} بـ ${decisionText} طلب ${typeLabel} للموظف ${employeeName}`,
          requestId: selectedRequest.id,
          employeeName: employeeName,
          decision: status,
          notes: reviewNotes
        },
        selectedRequest.id
      );

      message.success(`تم ${status === 'approved' ? 'قبول' : 'رفض'} الطلب بنجاح`);
      fetchAllData();
      setIsReviewModalOpen(false);
      setSelectedRequest(null);
      setReviewNotes('');
    } catch (error) {
      handleSupabaseError(error, 'فشل في تحديث حالة الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  const renderDetails = () => {
    if (!selectedRequest) return null;
    const r = selectedRequest;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
        <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
            <User className="h-5 w-5 text-muted-foreground mt-1" />
            <div><p className="text-muted-foreground">الموظف</p><div className="font-semibold">{r.user?.name_ar}</div></div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
            <Type className="h-5 w-5 text-muted-foreground mt-1" />
            <div><p className="text-muted-foreground">النوع</p><div className="font-semibold">{getRequestTypeLabel(r.request_type)}</div></div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50 md:col-span-2">
            <FileText className="h-5 w-5 text-muted-foreground mt-1" />
            <div><p className="text-muted-foreground">العنوان/التفاصيل</p><div className="font-semibold">{r.title}</div><div className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">{r.description}</div></div>
        </div>
        {(r.amount > 0) && (
            <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                <Landmark className="h-5 w-5 text-muted-foreground mt-1" />
                <div><p className="text-muted-foreground">المبلغ</p><div className="font-semibold text-green-600">{formatCurrency(r.amount)}</div></div>
            </div>
        )}
        
        {/* عرض تفاصيل التواريخ إذا كانت إجازة */}
        {r.request_type === 'leave' && r.start_date && r.end_date && (
           <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50 md:col-span-2">
              <Calendar className="h-5 w-5 text-muted-foreground mt-1" />
              <div className="flex flex-col gap-1 w-full">
                <p className="text-muted-foreground">فترة الإجازة</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground block">من:</span>
                    <span className="font-semibold">{format(parseISO(r.start_date), 'dd MMMM yyyy', { locale: ar })}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">إلى:</span>
                    <span className="font-semibold">{format(parseISO(r.end_date), 'dd MMMM yyyy', { locale: ar })}</span>
                  </div>
                </div>
              </div>
           </div>
        )}

        {(r.total_days > 0) && (
            <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                <Calendar className="h-5 w-5 text-muted-foreground mt-1" />
                <div><p className="text-muted-foreground">المدة/الأيام</p><div className="font-semibold">{r.total_days} {r.request_type === 'other' ? 'ساعات (تقديري)' : 'يوم'}</div></div>
            </div>
        )}
      </div>
    );
  };

  const tabsConfig = [
    { value: "leave", label: "طلبات الإجازات", icon: BedDouble, data: requests.leave },
    { value: "custody", label: "طلبات العهد", icon: Wallet, data: requests.custody },
    { value: "loan", label: "طلبات السلف", icon: Landmark, data: requests.loan },
    { value: "permission", label: "طلبات الاستئذان", icon: FileQuestion, data: requests.permission },
    { value: "other", label: "طلبات أخرى", icon: HelpCircle, data: requests.other },
  ];

  return (
    <>
      <Helmet><title>إدارة العمليات</title></Helmet>
      <div className="space-y-6">
        <PageTitle title="إدارة العمليات" icon={FileClock} />
        <Card>
          <CardHeader>
            <CardTitle>الطلبات المعلقة</CardTitle>
            <CardDescription>قائمة بالطلبات التي تنتظر موافقتك.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <Alert message="خطأ" description={error} type="error" showIcon className="mb-4" />}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                {tabsConfig.map(t => (
                  <TabsTrigger key={t.value} value={t.value} disabled={loading} className="text-xs sm:text-sm">
                    <t.icon className="w-4 h-4 ml-1 sm:ml-2" />
                    <span className="hidden sm:inline">{t.label}</span>
                    <span className="sm:hidden">{t.label.split(' ')[1]}</span>
                     ({loading ? '...' : t.data.length})
                  </TabsTrigger>
                ))}
              </TabsList>
              {tabsConfig.map(t => (
                <TabsContent key={t.value} value={t.value}>
                  {loading ? (
                    <div className="flex justify-center py-10"><Spin size="large" /></div>
                  ) : t.data.length === 0 ? (
                    <Empty description="لا توجد طلبات معلقة." />
                  ) : (
                    <div className="overflow-x-auto mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>الموظف</TableHead>
                            <TableHead>التفاصيل</TableHead>
                            {/* إضافة أعمدة خاصة للإجازات */}
                            {t.value === 'leave' && (
                              <>
                                <TableHead>من تاريخ</TableHead>
                                <TableHead>إلى تاريخ</TableHead>
                                <TableHead>عدد الأيام</TableHead>
                              </>
                            )}
                            <TableHead>تاريخ الطلب</TableHead>
                            <TableHead>الحالة</TableHead>
                            <TableHead>الإجراء</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {t.data.map(req => {
                            // حساب عدد الأيام للإجازات
                            let daysCount = 0;
                            if (t.value === 'leave' && req.start_date && req.end_date) {
                              // نضيف 1 لأن الفرق بين نفس اليوم هو 0 بينما هو يوم واحد إجازة
                              daysCount = differenceInDays(parseISO(req.end_date), parseISO(req.start_date)) + 1;
                            } else if (req.total_days) {
                              daysCount = req.total_days;
                            }

                            return (
                            <TableRow key={req.id}>
                              <TableCell className="font-medium">{req.user?.name_ar || 'غير معروف'}</TableCell>
                              <TableCell className="max-w-xs">
                                <div className="font-medium truncate">{req.title}</div>
                                {req.amount > 0 && <span className="text-green-600 text-xs font-bold ml-2">({formatCurrency(req.amount)})</span>}
                                {req.request_type === 'other' && req.description && (
                                  <div className="text-xs text-gray-500 truncate mt-1">{req.description}</div>
                                )}
                              </TableCell>
                              
                              {/* عرض خلايا التواريخ للإجازات */}
                              {t.value === 'leave' && (
                                <>
                                  <TableCell className="whitespace-nowrap">
                                    {req.start_date ? format(parseISO(req.start_date), 'dd MMMM yyyy', { locale: ar }) : '-'}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    {req.end_date ? format(parseISO(req.end_date), 'dd MMMM yyyy', { locale: ar }) : '-'}
                                  </TableCell>
                                  <TableCell className="font-bold text-center">
                                    {daysCount > 0 ? `${daysCount} يوم` : '-'}
                                  </TableCell>
                                </>
                              )}

                              <TableCell>{format(parseISO(req.created_at), 'P', { locale: ar })}</TableCell>
                              <TableCell>
                                <Tag color="orange">قيد الانتظار</Tag>
                              </TableCell>
                              <TableCell>
                                <Button variant="outline" size="sm" onClick={() => handleOpenReview(req, t.value)}>مراجعة</Button>
                              </TableCell>
                            </TableRow>
                          )})}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>مراجعة الطلب</DialogTitle>
            <DialogDescription>اتخاذ القرار الإداري المناسب.</DialogDescription>
          </DialogHeader>
          {renderDetails()}
          <div className="grid w-full gap-1.5 mt-4">
            <Label htmlFor="review-notes">ملاحظات المدير (مطلوبة للرفض)</Label>
            <Textarea
              id="review-notes"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="اكتب سبب القبول أو الرفض هنا..."
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="ghost" onClick={() => setIsReviewModalOpen(false)} disabled={submitting}>إلغاء</Button>
            <Button variant="destructive" disabled={submitting || !reviewNotes.trim()} onClick={() => handleApprovalAction('rejected')}>
              {submitting ? <Spin size="small" className="ml-2" /> : <X className="w-4 h-4 ml-1" />} رفض
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" disabled={submitting} onClick={() => handleApprovalAction('approved')}>
              {submitting ? <Spin size="small" className="ml-2" /> : <Check className="w-4 h-4 ml-1" />} موافقة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OperationsPage;
