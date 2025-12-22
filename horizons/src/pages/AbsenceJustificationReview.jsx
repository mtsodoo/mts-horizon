import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Helmet } from 'react-helmet';
import PageTitle from '@/components/PageTitle';
import JustificationActions from '@/components/JustificationActions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Empty, Spin, message } from 'antd';
import { FileCheck, Download, AlertTriangle, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
import { getAttendanceColor } from '@/utils/attendanceUtils';

const DebugInfo = ({ info }) => (
    <Card className="mb-4 bg-muted/20 border-dashed">
        <CardHeader className="py-2 px-4">
            <CardTitle className="text-sm font-semibold">Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <p>Total Records: <span className="font-bold">{info.total}</span></p>
                <p>Pending: <span className="font-bold text-yellow-500">{info.pending}</span></p>
                <p>Approved: <span className="font-bold text-green-500">{info.approved}</span></p>
                <p>Rejected: <span className="font-bold text-red-500">{info.rejected}</span></p>
            </div>
        </CardContent>
    </Card>
);

const AbsenceJustificationReview = () => {
    const { user } = useAuth();
    const [justifications, setJustifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedJustification, setSelectedJustification] = useState(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [reviewNotes, setReviewNotes] = useState('');
    const [approvalType, setApprovalType] = useState('');
    const [editFormData, setEditFormData] = useState({ id: null, absence_date: '', reason: '' });
    const [submitting, setSubmitting] = useState(false);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [debugInfo, setDebugInfo] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });

    const approvalOptions = [
        { value: 'medical_excuse', label: 'عذر طبي' },
        { value: 'annual_leave', label: 'إجازة سنوية' },
        { value: 'acceptable_reason', label: 'سبب مقبول' },
        { value: 'field_work', label: 'مهمة عمل' },
        { value: 'rejected', label: 'مرفوض' },
    ];

    const fetchJustifications = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('absence_justifications')
                .select('*, profile:profiles!absence_justifications_user_id_fkey(name_ar, department)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            const fetchedData = data || [];
            setJustifications(fetchedData);

            const pendingCount = fetchedData.filter(j => j.status === 'pending').length;
            const approvedCount = fetchedData.filter(j => j.status === 'approved').length;
            const rejectedCount = fetchedData.filter(j => j.status === 'rejected').length;
            setDebugInfo({ total: fetchedData.length, pending: pendingCount, approved: approvedCount, rejected: rejectedCount });

        } catch (error) {
            handleSupabaseError(error, 'فشل في جلب تبريرات الغياب');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchJustifications();
        const channel = supabase.channel('public:absence_justifications')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'absence_justifications' }, () => {
                fetchJustifications();
            }).subscribe();
        return () => supabase.removeChannel(channel);
    }, [fetchJustifications]);

    const filteredJustifications = useMemo(() => {
        if (statusFilter === 'all') return justifications;
        return justifications.filter(j => j.status === statusFilter);
    }, [justifications, statusFilter]);

    const handleOpenView = (justification) => {
        setSelectedJustification(justification);
        setIsViewModalOpen(true);
    };

    const handleOpenReview = (justification) => {
        setSelectedJustification(justification);
        setReviewNotes('');
        setApprovalType('');
        setIsReviewModalOpen(true);
    };

    const handleOpenEdit = (justification) => {
        setSelectedJustification(justification);
        setEditFormData({
            id: justification.id,
            absence_date: justification.absence_date,
            reason: justification.reason,
        });
        setIsEditModalOpen(true);
    };
    
    const handleOpenDeleteConfirm = (justification) => {
        console.log('[DELETE] Opening delete confirmation for:', justification);
        setSelectedJustification(justification);
        setIsDeleteConfirmOpen(true);
    };

    const handleEditSubmit = async () => {
        if (!editFormData.id || !editFormData.absence_date || !editFormData.reason.trim()) {
            message.error('الرجاء ملء جميع الحقول.');
            return;
        }
        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('absence_justifications')
                .update({
                    absence_date: editFormData.absence_date,
                    reason: editFormData.reason,
                })
                .eq('id', editFormData.id);
            if (error) throw error;
            message.success('تم تحديث التبرير بنجاح.');
            setIsEditModalOpen(false);
            fetchJustifications();
        } catch (error) {
            handleSupabaseError(error, 'فشل في تحديث التبرير');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedJustification) return;

        setSubmitting(true);
        console.log(`[DELETE] Attempting to delete justification with id: ${selectedJustification.id}`);

        try {
            // أولاً: تحديث سجل الحضور قبل الحذف
            const { error: attendanceError } = await supabase
                .from('attendance_records')
                .update({
                    status: 'absent',
                    justification_id: null
                })
                .eq('user_id', selectedJustification.user_id)
                .eq('work_date', selectedJustification.absence_date);

            if (attendanceError) {
                console.warn('[DELETE] Could not update attendance record:', attendanceError);
            }

            // ثانياً: حذف التبرير
            const { data, error } = await supabase
                .from('absence_justifications')
                .delete()
                .eq('id', selectedJustification.id)
                .select();

            if (error) {
                console.error('[DELETE] Supabase error:', error);
                if (error.code === '23503' || error.message.includes('foreign key constraint')) {
                     message.error('لا يمكن حذف التبرير لأنه مرتبط بسجلات أخرى (مثل سجل الحضور). لحل هذه المشكلة، قد تحتاج إلى تعديل قواعد البيانات.', 10);
                } else {
                    handleSupabaseError(error, 'فشل في حذف التبرير');
                }
                return;
            }

            if (!data || data.length === 0) {
                 console.warn(`[DELETE] No data returned after delete for ID: ${selectedJustification.id}. The record might have been blocked by RLS or already deleted.`);
                 message.warn('لم يتم حذف السجل. ربما تم حذفه بالفعل أو ليس لديك الصلاحية.');
                 return;
            }
            
            console.log(`[DELETE] Successfully deleted justification:`, data);
            message.success('تم حذف التبرير بنجاح وإعادة حالة الحضور إلى "غياب".');
            setIsDeleteConfirmOpen(false);
            fetchJustifications();
        } catch (error) {
            console.error('[DELETE] Uncaught exception:', error);
            handleSupabaseError(error, 'حدث خطأ غير متوقع أثناء الحذف');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReviewSubmit = async () => {
        if (!selectedJustification || !approvalType) {
            message.error('الرجاء اختيار نوع الإجراء.');
            return;
        }
        if (approvalType === 'rejected' && !reviewNotes.trim()) {
            message.error('ملاحظات الرفض مطلوبة.');
            return;
        }

        setSubmitting(true);
        try {
            const isRejected = approvalType === 'rejected';
            
            // تحديث جدول absence_justifications
            const { error: justificationError } = await supabase
                .from('absence_justifications')
                .update({
                    status: isRejected ? 'rejected' : 'approved',
                    approval_type: isRejected ? null : approvalType,
                    manager_notes: reviewNotes,
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('id', selectedJustification.id);
            if (justificationError) throw justificationError;

            // تحديد الحالة الصحيحة بناءً على نوع الموافقة
            let attendanceStatus = 'justified'; // القيمة الافتراضية
            if (isRejected) {
                attendanceStatus = 'absent';
            } else if (approvalType === 'field_work') {
                attendanceStatus = 'work_mission';
            } else if (approvalType === 'acceptable_reason') {
                attendanceStatus = 'justified';
            } else if (approvalType === 'medical_excuse') {
                attendanceStatus = 'medical_leave';
            } else if (approvalType === 'annual_leave') {
                attendanceStatus = 'annual_leave';
            }

            // تحديث جدول attendance_records
            const { error: attendanceError } = await supabase
                .from('attendance_records')
                .update({
                    status: attendanceStatus,
                    justification_id: isRejected ? null : selectedJustification.id
                })
                .eq('user_id', selectedJustification.user_id)
                .eq('work_date', selectedJustification.absence_date);

            if (attendanceError) {
                console.warn(`Could not find or update attendance record for user ${selectedJustification.user_id} on date ${selectedJustification.absence_date}. Error: ${attendanceError.message}`);
            }

            // خصم الإجازة السنوية إذا كان النوع إجازة سنوية
            if (approvalType === 'annual_leave') {
                const { error: leaveError } = await supabase.rpc('deduct_annual_leave', {
                    p_user_id: selectedJustification.user_id,
                    p_days_to_deduct: 1
                });
                if (leaveError) {
                    handleSupabaseError(leaveError, 'فشل في خصم رصيد الإجازة. تم اعتماد الطلب ولكن يرجى مراجعة رصيد الموظف يدويًا.');
                }
            }

            // حذف الخصم إذا تمت الموافقة
            if (!isRejected) {
                await supabase
                    .from('attendance_deductions')
                    .delete()
                    .eq('user_id', selectedJustification.user_id)
                    .eq('deduction_date', selectedJustification.absence_date)
                    .eq('violation_type', 'absent');
            }

            message.success('تم تحديث حالة الطلب بنجاح.');
            setIsReviewModalOpen(false);
            fetchJustifications();
        } catch (error) {
            handleSupabaseError(error, 'فشل في تحديث الطلب');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="border-yellow-500 text-yellow-500">معلق</Badge>;
            case 'approved':
                return <Badge variant="outline" className="border-green-500 text-green-500">مقبول</Badge>;
            case 'rejected':
                return <Badge variant="destructive">مرفوض</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const getApprovalTypeLabel = (type) => {
        const option = approvalOptions.find(opt => opt.value === type);
        return option ? option.label : 'N/A';
    };

    return (
        <>
            <Helmet><title>مراجعة تبريرات الغياب</title></Helmet>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <PageTitle title="مراجعة تبريرات الغياب" icon={FileCheck} />
                    <Button onClick={fetchJustifications} disabled={loading} variant="outline" size="sm">
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        تحديث
                    </Button>
                </div>
                <DebugInfo info={debugInfo} />
                <Card>
                    <CardHeader>
                        <CardTitle>طلبات تبرير الغياب</CardTitle>
                        <CardDescription>مراجعة واعتماد طلبات تبرير الغياب للموظفين.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="pending">معلقة ({debugInfo.pending})</TabsTrigger>
                                <TabsTrigger value="approved">مقبولة ({debugInfo.approved})</TabsTrigger>
                                <TabsTrigger value="rejected">مرفوضة ({debugInfo.rejected})</TabsTrigger>
                                <TabsTrigger value="all">الكل ({debugInfo.total})</TabsTrigger>
                            </TabsList>
                            <div className="mt-4">
                                {loading ? (
                                    <div className="flex justify-center items-center py-10"><Spin size="large" /></div>
                                ) : filteredJustifications.length === 0 ? (
                                    <Empty description={`لا توجد طلبات ${statusFilter === 'all' ? '' : statusFilter === 'pending' ? 'معلقة' : statusFilter === 'approved' ? 'مقبولة' : 'مرفوضة' } حاليًا.`} />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>الموظف</TableHead>
                                                    <TableHead>القسم</TableHead>
                                                    <TableHead>تاريخ الغياب</TableHead>
                                                    <TableHead>الحالة</TableHead>
                                                    <TableHead>السبب</TableHead>
                                                    <TableHead>الإجراء</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredJustifications.map(j => (
                                                    <TableRow key={j.id}>
                                                        <TableCell className="font-medium">{j.profile?.name_ar || 'غير معروف'}</TableCell>
                                                        <TableCell>{j.profile?.department || '-'}</TableCell>
                                                        <TableCell>{format(parseISO(j.absence_date), 'PPP', { locale: ar })}</TableCell>
                                                        <TableCell>{getStatusBadge(j.status)}</TableCell>
                                                        <TableCell className="max-w-xs truncate">{j.reason}</TableCell>
                                                        <TableCell className="text-center">
                                                           <JustificationActions
                                                                justification={j}
                                                                onReview={handleOpenReview}
                                                                onEdit={handleOpenEdit}
                                                                onDelete={handleOpenDeleteConfirm}
                                                                onView={handleOpenView}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </div>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>

             <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>مراجعة تبرير الغياب</DialogTitle>
                        <DialogDescription>
                            مراجعة طلب الموظف: {selectedJustification?.profile?.name_ar} ليوم {selectedJustification && format(parseISO(selectedJustification.absence_date), 'PPP', { locale: ar })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <Label>السبب المقدم:</Label>
                            <p className="text-sm p-3 bg-muted rounded-md">{selectedJustification?.reason}</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="approval-type">نوع الإجراء</Label>
                            <Select onValueChange={setApprovalType} value={approvalType}>
                                <SelectTrigger id="approval-type">
                                    <SelectValue placeholder="اختر نوع الإجراء..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {approvalOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            <div className="flex items-center">
                                                <span className={`w-3 h-3 rounded-full mr-2 ${getAttendanceColor(opt.value)}`}></span>
                                                {opt.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {approvalType === 'annual_leave' && (
                            <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-400 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200" role="alert">
                                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h5 className="font-semibold">تنبيه</h5>
                                    <p className="text-sm">سيتم خصم يوم واحد من رصيد الإجازات السنوية للموظف.</p>
                                </div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="review-notes">ملاحظات {approvalType === 'rejected' && <span className="text-destructive">(مطلوبة للرفض)</span>}</Label>
                            <Textarea id="review-notes" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="أضف ملاحظاتك هنا..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsReviewModalOpen(false)} disabled={submitting}>إلغاء</Button>
                        <Button onClick={handleReviewSubmit} disabled={submitting || !approvalType}>
                            {submitting ? 'جاري الحفظ...' : 'حفظ القرار'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>تعديل تبرير الغياب</DialogTitle>
                        <DialogDescription>
                            تعديل طلب الموظف: {selectedJustification?.profile?.name_ar}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-absence-date">تاريخ الغياب</Label>
                            <Input
                                id="edit-absence-date"
                                type="date"
                                value={editFormData.absence_date}
                                onChange={(e) => setEditFormData({ ...editFormData, absence_date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-reason">السبب</Label>
                            <Textarea
                                id="edit-reason"
                                value={editFormData.reason}
                                onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
                                placeholder="أدخل سبب الغياب..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} disabled={submitting}>إلغاء</Button>
                        <Button onClick={handleEditSubmit} disabled={submitting}>
                            {submitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                <DialogContent>
                    <DialogHeader>
                         <DialogTitle>تفاصيل تبرير الغياب</DialogTitle>
                    </DialogHeader>
                     <div className="py-4 space-y-4 text-sm">
                        <p><strong>الموظف:</strong> {selectedJustification?.profile?.name_ar}</p>
                        <p><strong>تاريخ الغياب:</strong> {selectedJustification && format(parseISO(selectedJustification.absence_date), 'PPP', { locale: ar })}</p>
                        <p><strong>الحالة:</strong> {selectedJustification && getStatusBadge(selectedJustification.status)}</p>
                        {selectedJustification?.status === 'approved' && <p><strong>نوع القبول:</strong> {getApprovalTypeLabel(selectedJustification.approval_type)}</p>}
                        <div className="space-y-1">
                            <p><strong>السبب المقدم:</strong></p>
                            <p className="p-2 bg-muted rounded-md border">{selectedJustification?.reason}</p>
                        </div>
                        {selectedJustification?.manager_notes && (
                            <div className="space-y-1">
                                <p><strong>ملاحظات المدير:</strong></p>
                                <p className="p-2 bg-muted rounded-md border">{selectedJustification.manager_notes}</p>
                            </div>
                        )}
                        {selectedJustification?.file_url && (
                             <div className="flex items-center gap-2">
                                <strong>المرفق:</strong>
                                <a href={selectedJustification.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                                    <Download size={16} /> عرض المرفق
                                </a>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                         <Button onClick={() => setIsViewModalOpen(false)}>إغلاق</Button>
                         {selectedJustification?.status === 'pending' && <Button onClick={() => { setIsViewModalOpen(false); handleOpenReview(selectedJustification); }}><FileCheck className="mr-2 h-4 w-4"/>مراجعة الطلب</Button>}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>تأكيد الحذف</DialogTitle>
                        <DialogDescription>
                            هل أنت متأكد من رغبتك في حذف هذا التبرير بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} disabled={submitting}>إلغاء</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                            {submitting ? 'جاري الحذف...' : 'نعم، قم بالحذف'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default AbsenceJustificationReview;