import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import PageTitle from '@/components/PageTitle';
import { Modal, Form, Input, message } from 'antd';
import { CalendarDays, Upload as UploadIcon } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import AttendanceCalendar from '@/components/AttendanceCalendar';
import { uploadFile } from '@/utils/fileStorage';  // 🔥 استخدام النظام الموحد
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from '@/components/ui/use-toast';

const AttendancePage = () => {
    const { user, profile } = useAuth();

    // حالات نموذج التبرير
    const [isJustificationModalOpen, setIsJustificationModalOpen] = useState(false);
    const [selectedAbsenceDate, setSelectedAbsenceDate] = useState(null);
    const [justificationSubmitting, setJustificationSubmitting] = useState(false);
    const [justificationForm] = Form.useForm();
    const [selectedFile, setSelectedFile] = useState(null);  // 🔥 الملف المحدد
    const [uploadingFile, setUploadingFile] = useState(false);  // 🔥 حالة الرفع

    // معالج فتح نموذج التبرير
    const handleOpenJustificationModal = useCallback(async (date) => {
        // التحقق من وجود تبرير مرفوض نهائي
        const { data: existingJustifications, error } = await supabase
            .from('absence_justifications')
            .select('id, status, is_final')
            .eq('user_id', user.id)
            .eq('absence_date', format(date, 'yyyy-MM-dd'));

        if (error) {
            console.error('Error checking justifications:', error);
            toast({ variant: "destructive", title: "خطأ", description: 'فشل التحقق من التبريرات السابقة.' });
            return;
        }

        const hasRejectedFinal = existingJustifications?.some(j => j.status === 'rejected' && j.is_final);
        if (hasRejectedFinal) {
            toast({
                variant: "destructive",
                title: "غير مسموح",
                description: 'تم رفض تبريرك السابق لهذا اليوم نهائياً. لا يمكن تقديم تبرير جديد وسيتم خصم الغياب من راتبك.'
            });
            return;
        }

        const hasPending = existingJustifications?.some(j => j.status === 'pending');
        if (hasPending) {
            toast({
                variant: "destructive",
                title: "تبرير معلق",
                description: 'لديك تبرير معلق لهذا اليوم. انتظر المراجعة أولاً.'
            });
            return;
        }

        setSelectedAbsenceDate(date);
        setIsJustificationModalOpen(true);
        justificationForm.resetFields();
        setSelectedFile(null);  // 🔥 تصفير الملف
    }, [justificationForm, user, toast]);

    // معالج إرسال التبرير
    const handleSubmitJustification = async (values) => {
        if (!selectedAbsenceDate) return;
        setJustificationSubmitting(true);
        
        try {
            const { reason } = values;
            let fileUrl = null;
            let fileName = null;

            // 🔥 رفع الملف إلى المجلد الموحد للتبريرات
            if (selectedFile) {
                setUploadingFile(true);
                try {
                    const uploadResult = await uploadFile(selectedFile, 'absence-justifications');
                    fileUrl = uploadResult.url;
                    fileName = uploadResult.originalName;
                } catch (uploadError) {
                    console.error('File upload error:', uploadError);
                    toast({
                        variant: "destructive",
                        title: "خطأ في رفع الملف",
                        description: "فشل رفع الملف. سيتم إرسال التبرير بدون مرفق."
                    });
                } finally {
                    setUploadingFile(false);
                }
            }

            const newJustification = {
                user_id: user.id,
                absence_date: format(selectedAbsenceDate, 'yyyy-MM-dd'),
                reason: reason,
                file_url: fileUrl,
                file_name: fileName,
                status: 'pending'
            };

            const { data: justificationData, error: justificationError } = await supabase
                .from('absence_justifications')
                .insert(newJustification)
                .select()
                .single();

            if (justificationError) throw justificationError;

            await supabase.from('attendance_records').upsert({
                user_id: user.id,
                work_date: format(selectedAbsenceDate, 'yyyy-MM-dd'),
                status: 'unjustified_absence',
                justification_id: justificationData.id
            }, { onConflict: 'user_id,work_date' });

            message.success('تم إرسال تبرير الغياب بنجاح.');
            setIsJustificationModalOpen(false);
        } catch (error) {
            handleSupabaseError(error, 'فشل في إرسال تبرير الغياب');
        } finally {
            setJustificationSubmitting(false);
        }
    };

    return (
        <>
            <Helmet><title>الحضور والانصراف</title></Helmet>
            <div className="space-y-6">
                <PageTitle title="سجل الحضور والغياب" icon={CalendarDays} />

                <Card>
                    <CardHeader>
                        <CardTitle>سجل الحضور</CardTitle>
                        <CardDescription>عرض سجلات الحضور والانصراف الشهرية وتبرير الغياب.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AttendanceCalendar onAbsenceDayClick={handleOpenJustificationModal} />
                    </CardContent>
                </Card>
            </div>

            {/* نموذج تبرير الغياب */}
            <Modal
                title={`تبرير غياب يوم ${selectedAbsenceDate ? format(selectedAbsenceDate, 'd MMMM yyyy', { locale: ar }) : ''}`}
                open={isJustificationModalOpen}
                onCancel={() => setIsJustificationModalOpen(false)}
                destroyOnClose
                footer={[
                    <Button key="back" variant="ghost" onClick={() => setIsJustificationModalOpen(false)} disabled={justificationSubmitting}>
                        إلغاء
                    </Button>,
                    <Button key="submit" onClick={() => justificationForm.submit()} disabled={justificationSubmitting || uploadingFile}>
                        {uploadingFile ? 'جاري رفع الملف...' : justificationSubmitting ? 'جاري الإرسال...' : 'إرسال التبرير'}
                    </Button>,
                ]}
            >
                <Form form={justificationForm} layout="vertical" onFinish={handleSubmitJustification} className="mt-4">
                    <Form.Item label="التاريخ">
                        <Input readOnly value={selectedAbsenceDate ? format(selectedAbsenceDate, 'EEEE, d MMMM yyyy', { locale: ar }) : ''} />
                    </Form.Item>
                    <Form.Item
                        name="reason"
                        label="سبب الغياب"
                        rules={[{ required: true, message: 'الرجاء إدخال سبب الغياب.' }]}
                    >
                        <Input.TextArea rows={4} placeholder="مثال: زيارة طارئة للمستشفى..." />
                    </Form.Item>
                    <Form.Item label="مرفق (اختياري)">
                        <div className="space-y-2">
                            <input
                                type="file"
                                accept="image/png,image/jpeg,application/pdf"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                className="block w-full text-sm text-gray-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-md file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-blue-50 file:text-blue-700
                                    hover:file:bg-blue-100
                                    cursor-pointer"
                            />
                            {selectedFile && (
                                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                                    <UploadIcon className="h-4 w-4 text-green-600" />
                                    <span className="text-sm text-green-700">{selectedFile.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedFile(null)}
                                        className="mr-auto text-red-500 hover:text-red-700"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                            <p className="text-xs text-gray-500">الملفات المسموحة: PNG, JPG, PDF (بحد أقصى 5MB)</p>
                        </div>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default AttendancePage;