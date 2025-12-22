import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DoorOpen, ArrowRight, Calendar, Clock, AlertCircle } from 'lucide-react';
import { message, Spin } from 'antd';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
import { logSystemActivity } from '@/utils/omarTools';
import { format, parse, differenceInMinutes, isBefore, startOfDay } from 'date-fns';
import { ar } from 'date-fns/locale';

const RequestPermission = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        permission_date: format(new Date(), 'yyyy-MM-dd'),
        exit_time: '',
        return_time: '',
        reason: '',
    });

    // حساب المدة بالدقائق
    const calculateDuration = () => {
        if (!formData.exit_time || !formData.return_time) return null;
        
        const exitDate = parse(formData.exit_time, 'HH:mm', new Date());
        const returnDate = parse(formData.return_time, 'HH:mm', new Date());
        
        const minutes = differenceInMinutes(returnDate, exitDate);
        return minutes > 0 ? minutes : null;
    };

    const formatDuration = (minutes) => {
        if (!minutes) return '';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours === 0) return `${mins} دقيقة`;
        if (mins === 0) return `${hours} ساعة`;
        return `${hours} ساعة و ${mins} دقيقة`;
    };

    const duration = calculateDuration();

    const handleSubmit = async (e) => {
        e.preventDefault();

        // التحقق من الحقول
        if (!formData.permission_date) {
            message.error('حدد تاريخ الاستئذان');
            return;
        }

        if (!formData.exit_time) {
            message.error('حدد ساعة الخروج');
            return;
        }

        if (!formData.return_time) {
            message.error('حدد ساعة العودة');
            return;
        }

        if (!duration || duration <= 0) {
            message.error('ساعة العودة يجب أن تكون بعد ساعة الخروج');
            return;
        }

        if (duration > 480) { // 8 ساعات
            message.error('لا يمكن أن تتجاوز مدة الاستئذان 8 ساعات');
            return;
        }

        // التحقق من التاريخ (لا يمكن طلب استئذان لتاريخ ماضي)
        const selectedDate = new Date(formData.permission_date);
        if (isBefore(selectedDate, startOfDay(new Date()))) {
            message.error('لا يمكن طلب استئذان لتاريخ ماضي');
            return;
        }

        setSubmitting(true);
        try {
            const formattedDate = format(new Date(formData.permission_date), 'EEEE d MMMM', { locale: ar });
            const title = `استئذان يوم ${formattedDate} من ${formData.exit_time} إلى ${formData.return_time}`;

            // تجميع التفاصيل في description
            const descriptionParts = [];
            if (formData.reason) descriptionParts.push(formData.reason);
            descriptionParts.push(`📤 الخروج: ${formData.exit_time}`);
            descriptionParts.push(`📥 العودة: ${formData.return_time}`);
            descriptionParts.push(`⏱️ المدة: ${formatDuration(duration)}`);

            const requestData = {
                user_id: user.id,
                request_type: 'permission',
                title: title,
                description: descriptionParts.join('\n'),
                start_date: formData.permission_date,
                end_date: formData.permission_date,
                status: 'pending',
                created_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('employee_requests')
                .insert([requestData])
                .select();

            if (error) throw error;

            logSystemActivity(
                user.id, 
                'CREATE_REQUEST', 
                'REQUEST', 
                { 
                    type: 'permission', 
                    date: formData.permission_date,
                    exit_time: formData.exit_time,
                    return_time: formData.return_time,
                    duration_minutes: duration
                }, 
                data[0].id
            );

            message.success('✅ تم إرسال طلب الاستئذان بنجاح!');
            navigate('/dashboard'); 

        } catch (error) {
            handleSupabaseError(error, 'فشل إرسال الطلب');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Helmet><title>طلب استئذان</title></Helmet>
            <div className="space-y-6 p-4 md:p-8">
                <PageTitle title="طلب استئذان" icon={DoorOpen} />

                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DoorOpen className="w-5 h-5 text-blue-600" />
                            تقديم طلب استئذان
                        </CardTitle>
                        <CardDescription>
                            حدد التاريخ ووقت الخروج والعودة. سيتم مراجعة الطلب من قبل المدير.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            
                            {/* التاريخ */}
                            <div>
                                <Label htmlFor="permission_date" className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-500" />
                                    تاريخ الاستئذان *
                                </Label>
                                <Input
                                    id="permission_date"
                                    type="date"
                                    value={formData.permission_date}
                                    onChange={(e) => setFormData({ ...formData, permission_date: e.target.value })}
                                    min={format(new Date(), 'yyyy-MM-dd')}
                                    className="mt-2"
                                    required
                                />
                                {formData.permission_date && (
                                    <p className="text-sm text-blue-600 mt-1">
                                        {format(new Date(formData.permission_date), 'EEEE، d MMMM yyyy', { locale: ar })}
                                    </p>
                                )}
                            </div>

                            {/* ساعة الخروج والعودة */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="exit_time" className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-red-500" />
                                        ساعة الخروج *
                                    </Label>
                                    <Input
                                        id="exit_time"
                                        type="time"
                                        value={formData.exit_time}
                                        onChange={(e) => setFormData({ ...formData, exit_time: e.target.value })}
                                        className="mt-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="return_time" className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-green-500" />
                                        ساعة العودة *
                                    </Label>
                                    <Input
                                        id="return_time"
                                        type="time"
                                        value={formData.return_time}
                                        onChange={(e) => setFormData({ ...formData, return_time: e.target.value })}
                                        className="mt-2"
                                        required
                                    />
                                </div>
                            </div>

                            {/* عرض المدة المحسوبة */}
                            {duration && duration > 0 && (
                                <div className={`p-3 rounded-lg border ${duration > 180 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                                    <div className="flex items-center gap-2">
                                        {duration > 180 && <AlertCircle className="w-4 h-4 text-orange-500" />}
                                        <span className={`text-sm font-medium ${duration > 180 ? 'text-orange-700' : 'text-green-700'}`}>
                                            مدة الاستئذان: {formatDuration(duration)}
                                        </span>
                                    </div>
                                    {duration > 180 && (
                                        <p className="text-xs text-orange-600 mt-1">
                                            ⚠️ الاستئذان لأكثر من 3 ساعات قد يتطلب موافقة خاصة
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* ساعة العودة قبل الخروج */}
                            {formData.exit_time && formData.return_time && (!duration || duration <= 0) && (
                                <div className="p-3 rounded-lg border bg-red-50 border-red-200">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                        <span className="text-sm font-medium text-red-700">
                                            ساعة العودة يجب أن تكون بعد ساعة الخروج
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* السبب */}
                            <div>
                                <Label htmlFor="reason">سبب الاستئذان (اختياري)</Label>
                                <Textarea
                                    id="reason"
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="مثال: مراجعة طبية، موعد حكومي..."
                                    rows={3}
                                    className="mt-2"
                                />
                            </div>

                            {/* ملخص الطلب */}
                            {formData.permission_date && formData.exit_time && formData.return_time && duration > 0 && (
                                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                                    <h4 className="font-bold text-blue-800 mb-2">ملخص الطلب:</h4>
                                    <div className="text-sm text-blue-700 space-y-1">
                                        <p>📅 التاريخ: {format(new Date(formData.permission_date), 'EEEE، d MMMM yyyy', { locale: ar })}</p>
                                        <p>🚪 الخروج: {formData.exit_time}</p>
                                        <p>🔙 العودة: {formData.return_time}</p>
                                        <p>⏱️ المدة: {formatDuration(duration)}</p>
                                    </div>
                                </div>
                            )}

                            {/* الأزرار */}
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
                                    disabled={submitting || !duration || duration <= 0}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {submitting && <Spin size="small" className="ml-2" />}
                                    {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
};

export default RequestPermission;