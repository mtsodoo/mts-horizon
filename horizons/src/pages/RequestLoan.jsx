
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Wallet, ArrowRight, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { message, Spin } from 'antd';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
import { formatCurrency } from '@/utils/financialUtils';
import { notifyManagerNewRequest } from '@/utils/notificationService';

const RequestLoan = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [profile, setProfile] = useState(null);
    const [formData, setFormData] = useState({
        description: '', 
        amount: '',
        installments_count: '',
    });

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                
                if (error) throw error;
                setProfile(data);
            } catch (error) {
                console.error("Error fetching profile:", error);
                message.error("فشل في جلب بيانات الراتب");
            } finally {
                setLoadingProfile(false);
            }
        };

        fetchProfile();
    }, [user]);

    const baseSalary = profile?.base_salary || 0;
    const monthlyInstallment = formData.amount && formData.installments_count && parseInt(formData.installments_count) > 0
        ? (parseFloat(formData.amount) / parseInt(formData.installments_count))
        : 0;
    
    // Percentage calculation relative to base salary
    const deductionPercentage = baseSalary > 0 && monthlyInstallment > 0
        ? ((monthlyInstallment / baseSalary) * 100)
        : 0;

    const isLimitExceeded = deductionPercentage > 10;
    const salaryAfterDeduction = baseSalary - monthlyInstallment;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            message.error('أدخل المبلغ المطلوب');
            return;
        }

        if (!formData.installments_count || parseInt(formData.installments_count) <= 0) {
            message.error('أدخل عدد الأقساط');
            return;
        }

        // Article 93 Validation
        if (isLimitExceeded) {
             message.error('لا يمكن تقديم الطلب: القسط الشهري يتجاوز 10% من الراتب الأساسي');
             return;
        }

        setSubmitting(true);
        try {
            const loanNumber = `LN-${Date.now().toString().slice(-6)}`;
            
            // Use profile phone for verification later
            const verificationPhone = profile?.phone || '';

            const loanData = {
                employee_id: user.id,
                loan_number: loanNumber,
                amount: parseFloat(formData.amount),
                installments: parseInt(formData.installments_count),
                monthly_deduction: parseFloat(monthlyInstallment.toFixed(2)),
                reason: formData.description,
                status: 'pending',
                created_at: new Date().toISOString(),
                // verification_phone will be set during verification phase
            };

            const { error } = await supabase
                .from('employee_loans')
                .insert([loanData]);

            if (error) throw error;

            // Notify Manager
            await notifyManagerNewRequest(
                '0539755999',
                profile?.name_ar || user.email,
                'loan',
                `مبلغ: ${formData.amount} - ${formData.installments_count} قسط`
            );

            message.success('✅ تم إرسال طلب السلفة بنجاح!');
            navigate('/my-requests'); 

        } catch (error) {
            handleSupabaseError(error, 'فشل إرسال الطلب');
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingProfile) {
        return <div className="flex justify-center p-8"><Spin size="large" /></div>;
    }

    return (
        <>
            <Helmet><title>طلب سلفة</title></Helmet>
            <div className="space-y-6 p-4 md:p-8">
                <PageTitle title="طلب سلفة" icon={Wallet} />

                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {/* Left Column: Form */}
                    <div className="md:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>تقديم طلب سلفة</CardTitle>
                                <CardDescription>
                                    املأ النموذج أدناه لتقديم طلب سلفة. سيتم خصم الأقساط من راتبك الشهري.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    
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
                                            disabled={submitting || isLimitExceeded || !formData.amount}
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

                    {/* Right Column: Calculations & Validation Box */}
                    <div className="md:col-span-1">
                        <Card className={`border-2 ${isLimitExceeded ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'} sticky top-6`}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    {isLimitExceeded ? (
                                        <AlertTriangle className="text-red-500 h-5 w-5" />
                                    ) : (
                                        <CheckCircle2 className="text-green-600 h-5 w-5" />
                                    )}
                                    تحليل السلفة
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-white p-4 rounded-lg border shadow-sm font-mono text-sm space-y-3">
                                    <div className="flex justify-between items-center border-b pb-2 border-dashed">
                                        <span className="text-gray-500">الراتب الأساسي:</span>
                                        <span className="font-bold">{formatCurrency(baseSalary)}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b pb-2 border-dashed">
                                        <span className="text-gray-500">القسط الشهري:</span>
                                        <span className="font-bold text-blue-600">
                                            {formatCurrency(monthlyInstallment)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center border-b pb-2 border-dashed">
                                        <span className="text-gray-500">نسبة الخصم:</span>
                                        <div className="flex items-center gap-1">
                                            <span className={`font-bold ${isLimitExceeded ? 'text-red-600' : 'text-green-600'}`}>
                                                {deductionPercentage.toFixed(1)}%
                                            </span>
                                            {isLimitExceeded ? <XCircle className="h-4 w-4 text-red-500" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-1">
                                        <span className="text-gray-500">الراتب بعد الخصم:</span>
                                        <span className="font-bold text-gray-800">{formatCurrency(salaryAfterDeduction)}</span>
                                    </div>
                                </div>

                                {isLimitExceeded && (
                                    <div className="text-red-600 text-sm bg-red-100 p-3 rounded border border-red-200">
                                        <p className="font-bold mb-1 flex items-center gap-1">
                                            <AlertTriangle className="h-4 w-4" />
                                            تجاوز الحد المسموح!
                                        </p>
                                        <p>
                                            وفقاً للمادة 93 من نظام العمل، لا يجوز أن تتجاوز نسبة الخصم من الراتب 10%.
                                        </p>
                                    </div>
                                )}
                                
                                {!isLimitExceeded && formData.amount > 0 && (
                                    <div className="text-green-700 text-sm bg-green-100 p-3 rounded border border-green-200">
                                        <p className="font-bold flex items-center gap-1">
                                            <CheckCircle2 className="h-4 w-4" />
                                            النسبة مطابقة للنظام
                                        </p>
                                        <p className="text-xs mt-1">نسبة الخصم في الحدود المسموحة (أقل من 10%).</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
};

export default RequestLoan;
