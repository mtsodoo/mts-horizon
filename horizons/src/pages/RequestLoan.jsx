import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Wallet, ArrowRight } from 'lucide-react';
import { message, Spin } from 'antd';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';

const RequestLoan = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        amount: '',
        installments_count: '',
    });

    const monthlyInstallment = formData.amount && formData.installments_count 
        ? (parseFloat(formData.amount) / parseInt(formData.installments_count)).toFixed(2)
        : 0;

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

        if (!formData.installments_count || parseInt(formData.installments_count) <= 0) {
            message.error('أدخل عدد الأقساط');
            return;
        }

        setSubmitting(true);
        try {
            const requestData = {
                user_id: user.id,
                request_type: 'loan',
                title: formData.title,
                description: formData.description || null,
                amount: parseFloat(formData.amount),
                installments_count: parseInt(formData.installments_count),
                status: 'pending',
                created_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('employee_requests')
                .insert([requestData]);

            if (error) throw error;

            message.success('✅ تم إرسال طلب السلفة بنجاح!');
            navigate('/activity-log');

        } catch (error) {
            handleSupabaseError(error, 'فشل إرسال الطلب');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Helmet><title>طلب سلفة</title></Helmet>
            <div className="space-y-6 p-4 md:p-8">
                <PageTitle title="طلب سلفة" icon={Wallet} />

                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle>تقديم طلب سلفة</CardTitle>
                        <CardDescription>
                            املأ النموذج أدناه لتقديم طلب سلفة. سيتم خصم الأقساط من راتبك الشهري.
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
                                    placeholder="مثال: سلفة لشراء سيارة"
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
                                <Label htmlFor="installments">عدد الأقساط الشهرية *</Label>
                                <Input
                                    id="installments"
                                    type="number"
                                    min="1"
                                    max="60"
                                    value={formData.installments_count}
                                    onChange={(e) => setFormData({ ...formData, installments_count: e.target.value })}
                                    placeholder="مثال: 12"
                                    className="mt-2"
                                    required
                                />
                                {monthlyInstallment > 0 && (
                                    <p className="text-sm text-gray-500 mt-2">
                                        القسط الشهري: <span className="font-bold text-blue-600">{monthlyInstallment} ريال</span>
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="description">سبب طلب السلفة *</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="أدخل سبب طلب السلفة..."
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
            </div>
        </>
    );
};

export default RequestLoan;