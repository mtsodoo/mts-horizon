import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plane, ArrowRight } from 'lucide-react';
import { message, DatePicker, Spin } from 'antd';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import { logSystemActivity } from '@/utils/omarTools';

dayjs.locale('ar');

const RequestLeave = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [leaveBalance, setLeaveBalance] = useState(0);
    const [loadingBalance, setLoadingBalance] = useState(true);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_date: null,
        end_date: null,
        total_days: 0,
    });

    const calculateDays = (start, end) => {
        if (!start || !end) return 0;
        const startDate = dayjs(start);
        const endDate = dayjs(end);
        return endDate.diff(startDate, 'day') + 1;
    };

    // جلب رصيد الإجازات
    React.useEffect(() => {
        const fetchLeaveBalance = async () => {
            if (!user) return;
            setLoadingBalance(true);
            try {
                const { data } = await supabase.rpc('calculate_annual_leave_balance', { p_user_id: user.id });
                setLeaveBalance((data || 0).toFixed(1));
            } catch (error) {
                console.error('Error fetching leave balance:', error);
            } finally {
                setLoadingBalance(false);
            }
        };
        fetchLeaveBalance();
    }, [user]);

    const handleDateChange = (dates) => {
        if (dates && dates.length === 2) {
            const [start, end] = dates;
            const days = calculateDays(start, end);
            setFormData({
                ...formData,
                start_date: start.format('YYYY-MM-DD'),
                end_date: end.format('YYYY-MM-DD'),
                total_days: days,
            });
        } else {
            setFormData({
                ...formData,
                start_date: null,
                end_date: null,
                total_days: 0,
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            message.error('أدخل عنوان الطلب');
            return;
        }

        if (!formData.start_date || !formData.end_date) {
            message.error('حدد تاريخ بداية ونهاية الإجازة');
            return;
        }

        if (formData.total_days <= 0) {
            message.error('عدد الأيام يجب أن يكون أكبر من صفر');
            return;
        }

        setSubmitting(true);
        try {
            const requestData = {
                user_id: user.id,
                request_type: 'leave',
                title: formData.title,
                description: formData.description || null,
                start_date: formData.start_date,
                end_date: formData.end_date,
                total_days: formData.total_days,
                status: 'pending',
                created_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('employee_requests')
                .insert([requestData])
                .select();

            if (error) throw error;

            // تسجيل العملية
            logSystemActivity(
                user.id,
                'CREATE_REQUEST',
                'REQUEST',
                {
                    type: 'leave',
                    title: formData.title,
                    days: formData.total_days
                },
                data[0].id
            );

            message.success('✅ تم إرسال طلب الإجازة بنجاح!');

            // 🔥 تصحيح المسار: العودة للرئيسية
            navigate('/dashboard');

        } catch (error) {
            handleSupabaseError(error, 'فشل إرسال الطلب');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Helmet><title>طلب إجازة</title></Helmet>
            <div className="space-y-6 p-4 md:p-8">
                <PageTitle title="طلب إجازة" icon={Plane} />

                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle>تقديم طلب إجازة سنوية</CardTitle>
                        <CardDescription>
                            املأ النموذج أدناه لتقديم طلب إجازة. سيتم مراجعته من قبل المدير.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* رصيد الإجازات */}
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">رصيد الإجازات المتبقي:</span>
                                    <span className="text-2xl font-bold text-blue-600">
                                        {loadingBalance ? '...' : `${leaveBalance} يوم`}
                                    </span>
                                </div>
                            </div>

                            {/* العنوان */}
                            <div>
                                <Label htmlFor="title">عنوان الطلب *</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="مثال: إجازة سنوية"
                                    className="mt-2"
                                    required
                                />
                            </div>

                            {/* فترة الإجازة */}
                            <div>
                                <Label>فترة الإجازة *</Label>
                                <DatePicker.RangePicker
                                    className="mt-2 w-full"
                                    size="large"
                                    format="YYYY-MM-DD"
                                    placeholder={['تاريخ البداية', 'تاريخ النهاية']}
                                    onChange={handleDateChange}
                                />
                                {formData.total_days > 0 && (
                                    <p className="text-sm text-gray-500 mt-2">
                                        عدد الأيام: <span className="font-bold text-blue-600">{formData.total_days} يوم</span>
                                    </p>
                                )}
                            </div>

                            {/* التفاصيل */}
                            <div>
                                <Label htmlFor="description">تفاصيل إضافية (اختياري)</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="أدخل أي تفاصيل إضافية هنا..."
                                    rows={4}
                                    className="mt-2"
                                />
                            </div>

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
            </div>
        </>
    );
};

export default RequestLeave;