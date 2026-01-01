
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { message, Spin } from 'antd';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Phone, 
  Shield, 
  CheckCircle2, 
  AlertCircle,
  Send,
  Lock,
  Building2,
  User,
  Wallet,
  Download,
  Printer
} from 'lucide-react';

const LoanVerification = () => {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  const companyInfo = {
    name: 'مؤسسة الحلول الفنية المتعددة للخدمات التجارية',
    cr: '1010496123',
    tax_number: '300834797100003',
    representative: 'حسين حسن محمد جندان',
    address: 'الرياض، الرياض - العليا - العليا العام',
    phone: '0570379999'
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        .print-contract, .print-contract * { visibility: visible; }
        .print-contract { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border: 1px solid #ddd;
        }
        .contract-section {
            border: 1px solid #ddd;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
        }
        .no-print { display: none !important; }
        body { background: white; }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    const fetchLoan = async () => {
      if (!loanId) {
        message.error('رقم السلفة غير صحيح');
        navigate('/my-requests');
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('employee_loans')
          .select(`*, profile:profiles!employee_loans_employee_id_fkey(name_ar, email, phone, national_id)`)
          .eq('id', loanId)
          .single();
        
        if (error) throw error;
        
        if (data.employee_id !== user?.id) {
          message.error('ليس لديك صلاحية لعرض هذه الصفحة');
          navigate('/my-requests');
          return;
        }
        
        setLoan(data);
        setPhoneNumber(data.profile?.phone || '');
      } catch (error) {
        console.error('Error fetching loan:', error);
        message.error('فشل في جلب بيانات السلفة');
      } finally {
        setLoading(false);
      }
    };
    
    if (user) fetchLoan();
  }, [loanId, user]);

  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSendCode = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      message.error('يرجى إدخال رقم جوال صحيح');
      return;
    }
    
    setSendingCode(true);
    
    try {
      const code = generateCode();
      
      const { error: updateError } = await supabase
        .from('employee_loans')
        .update({
          verification_phone: phoneNumber,
          verification_code: code,
          verification_sent_at: new Date().toISOString()
        })
        .eq('id', loanId);
      
      if (updateError) throw updateError;
      
      // SMS notification
      try {
        await fetch('https://api.oursms.com/api-a/msgs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            token: 'n68E8CISvil58edsg-RE',
            src: 'MTS',
            dests: phoneNumber.startsWith('966') ? phoneNumber : '966' + phoneNumber.replace(/^0/, ''),
            body: `كود توثيق عقد السلفة: ${code}\nصالح لمدة 10 دقائق\nMTS`
          })
        });
      } catch (smsError) {
        console.error('SMS send error:', smsError);
      }

      // WhatsApp notification
      try {
        await fetch('https://api.ultramsg.com/instance157134/messages/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            token: '8cmlm9zr0ildffsu',
            to: phoneNumber.startsWith('966') ? phoneNumber : '966' + phoneNumber.replace(/^0/, ''),
            body: `🔐 كود توثيق عقد السلفة

الكود: ${code}

صالح لمدة 10 دقائق
MTS - الحلول الفنية المتعددة`
          })
        });
      } catch (waError) {
        console.error('WhatsApp send error:', waError);
      }
      
      setCodeSent(true);
      message.success(`تم إرسال كود التوثيق إلى ${phoneNumber}`);
      
    } catch (error) {
      console.error('Error sending code:', error);
      message.error('فشل في إرسال الكود');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      message.error('يرجى إدخال كود مكون من 6 أرقام');
      return;
    }
    
    if (!agreed) {
      message.error('يرجى الموافقة على شروط العقد');
      return;
    }
    
    setVerifying(true);
    
    try {
      const { data: loanData, error: fetchError } = await supabase
        .from('employee_loans')
        .select('verification_code, verification_sent_at')
        .eq('id', loanId)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (loanData.verification_code !== verificationCode) {
        message.error('كود التوثيق غير صحيح');
        setVerifying(false);
        return;
      }
      
      const sentAt = new Date(loanData.verification_sent_at + 'Z');
      const now = new Date();
      if ((now - sentAt) > 10 * 60 * 1000) {
        message.error('انتهت صلاحية الكود. يرجى طلب كود جديد');
        setVerifying(false);
        return;
      }
      
      const { error: updateError } = await supabase
        .from('employee_loans')
        .update({
          status: 'active',
          verified_at: new Date().toISOString()
        })
        .eq('id', loanId);
      
      if (updateError) throw updateError;
      
      const installments = [];
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() + 1);
      startDate.setDate(1);
      
      for (let i = 0; i < loan.installments; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        
        installments.push({
          loan_request_id: loanId,
          user_id: loan.employee_id,
          installment_number: i + 1,
          installment_amount: loan.monthly_deduction,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'pending'
        });
      }
      
      await supabase.from('loan_installments').insert(installments);

      // SMS confirmation
      try {
        await fetch('https://api.oursms.com/api-a/msgs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            token: 'n68E8CISvil58edsg-RE',
            src: 'MTS',
            dests: phoneNumber.startsWith('966') ? phoneNumber : '966' + phoneNumber.replace(/^0/, ''),
            body: `تم توثيق عقد السلفة بنجاح\nرقم العقد: ${loan.loan_number}\nالمبلغ: ${loan.amount} ريال\nالقسط الشهري: ${loan.monthly_deduction} ريال\nعدد الأقساط: ${loan.installments}\nتاريخ التوثيق: ${new Date().toLocaleDateString('ar-SA')}\nMTS`
          })
        });
      } catch (smsError) {
        console.error('SMS confirmation error:', smsError);
      }

      // WhatsApp confirmation
      try {
        await fetch('https://api.ultramsg.com/instance157134/messages/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            token: '8cmlm9zr0ildffsu',
            to: phoneNumber.startsWith('966') ? phoneNumber : '966' + phoneNumber.replace(/^0/, ''),
            body: `✅ تم توثيق عقد السلفة بنجاح

📋 بيانات العقد:
━━━━━━━━━━━━━━
رقم العقد: ${loan.loan_number}
المبلغ: ${parseFloat(loan.amount).toLocaleString()} ريال
القسط الشهري: ${parseFloat(loan.monthly_deduction).toLocaleString()} ريال
عدد الأقساط: ${loan.installments} شهر
━━━━━━━━━━━━━━

📅 تاريخ التوثيق: ${new Date().toLocaleDateString('ar-SA')}
📱 رقم الجوال: ${phoneNumber}

هذا العقد موثق إلكترونياً وفقاً لنظام التعاملات الإلكترونية

MTS - الحلول الفنية المتعددة`
          })
        });
      } catch (waError) {
        console.error('WhatsApp confirmation error:', waError);
      }
      
      message.success('✅ تم توثيق العقد بنجاح!');
      setLoan({ ...loan, status: 'active', verified_at: new Date().toISOString() });
      
    } catch (error) {
      console.error('Error verifying:', error);
      message.error('فشل في التوثيق');
    } finally {
      setVerifying(false);
    }
  };

  const handlePrintContract = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="container mx-auto p-6 text-center">
        <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
        <h1 className="text-xl font-bold">السلفة غير موجودة</h1>
        <Button onClick={() => navigate('/my-requests')} className="mt-4">
          العودة لطلباتي
        </Button>
      </div>
    );
  }

  const isVerified = loan.verified_at || loan.status === 'active';

  return (
    <>
      <Helmet><title>توثيق عقد السلفة</title></Helmet>
      <div className="container mx-auto p-6 max-w-3xl">
        <div className="text-center mb-6 no-print">
          <div className="inline-flex items-center justify-center p-4 bg-green-100 rounded-full mb-4">
            <FileText className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">عقد سلفة على الراتب</h1>
          <p className="text-gray-500">رقم العقد: {loan.loan_number}</p>
        </div>

        {isVerified && (
          <Card className="mb-6 bg-green-50 border-green-200 no-print">
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-600 mb-4" />
              <h2 className="text-xl font-bold text-green-800 mb-2">تم التوثيق بنجاح ✅</h2>
              <p className="text-green-700 mb-4">
                تم تفعيل عقد السلفة وسيبدأ الخصم من راتب الشهر القادم
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => navigate('/my-requests')}>
                  العودة لطلباتي
                </Button>
                {isVerified && (
                  <Button onClick={handlePrintContract} variant="outline" className="no-print">
                    <Download className="h-4 w-4 ml-2" />
                    طباعة / حفظ PDF
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Print Contract Container */}
        <div className="print-contract bg-white rounded-lg shadow-sm border p-6 md:p-8">
            {/* 1. Header with Company Info & Logo */}
            <div className="flex justify-between items-start mb-8 border-b pb-6">
                 <div className="text-right space-y-1">
                    <h2 className="text-lg font-bold text-gray-900">{companyInfo.name}</h2>
                    <p className="text-sm text-gray-600">السجل التجاري: {companyInfo.cr}</p>
                    <p className="text-sm text-gray-600">الرقم الضريبي: {companyInfo.tax_number}</p>
                    <p className="text-sm text-gray-600">العنوان: {companyInfo.address}</p>
                    <p className="text-sm text-gray-600">الهاتف: {companyInfo.phone}</p>
                 </div>
                 <div className="text-left">
                     <img 
                        src="https://horizons-cdn.hostinger.com/7f70f011-64fe-4b0e-986f-58e20162a8c4/ba4c4e9d27851aa4fcdbda74ce6a9887.png" 
                        alt="MTS Logo" 
                        className="h-16 object-contain"
                     />
                 </div>
            </div>

            {/* 2. Contract Title & Number */}
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">عقد سلفة مالية</h1>
                <div className="inline-block bg-gray-100 px-4 py-1 rounded text-sm font-mono border">
                    رقم العقد: {loan.loan_number}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                    تاريخ الإنشاء: {new Date(loan.created_at).toLocaleDateString('ar-SA')}
                </p>
            </div>

            {/* 3. Parties */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="contract-section bg-gray-50 p-4 rounded border">
                    <h3 className="font-bold border-b pb-2 mb-3 text-gray-800">الطرف الأول (صاحب العمل)</h3>
                    <div className="text-sm space-y-2">
                        <p><span className="font-semibold">الاسم:</span> {companyInfo.name}</p>
                        <p><span className="font-semibold">السجل التجاري:</span> {companyInfo.cr}</p>
                        <p><span className="font-semibold">يمثله:</span> {companyInfo.representative}</p>
                    </div>
                </div>

                <div className="contract-section bg-gray-50 p-4 rounded border">
                    <h3 className="font-bold border-b pb-2 mb-3 text-gray-800">الطرف الثاني (الموظف)</h3>
                    <div className="text-sm space-y-2">
                        <p><span className="font-semibold">الاسم:</span> {loan.profile?.name_ar}</p>
                        <p><span className="font-semibold">رقم الهوية:</span> {loan.profile?.national_id || '-'}</p>
                        <p><span className="font-semibold">رقم الجوال:</span> {loan.profile?.phone}</p>
                    </div>
                </div>
            </div>

            {/* 4. Loan Financial Details */}
            <div className="contract-section mb-8">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    تفاصيل السلفة المالية
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-3 bg-gray-50 rounded border">
                        <span className="block text-gray-500 text-xs mb-1">مبلغ السلفة</span>
                        <span className="font-bold text-lg text-blue-700">
                            {parseFloat(loan.amount).toLocaleString()} ر.س
                        </span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded border">
                        <span className="block text-gray-500 text-xs mb-1">عدد الأقساط</span>
                        <span className="font-bold text-lg">
                            {loan.installments} شهر
                        </span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded border">
                        <span className="block text-gray-500 text-xs mb-1">القسط الشهري</span>
                        <span className="font-bold text-lg text-green-700">
                            {parseFloat(loan.monthly_deduction).toLocaleString()} ر.س
                        </span>
                    </div>
                     <div className="p-3 bg-gray-50 rounded border">
                        <span className="block text-gray-500 text-xs mb-1">حالة العقد</span>
                        <span className={`font-bold text-lg ${isVerified ? 'text-green-600' : 'text-orange-500'}`}>
                            {isVerified ? 'موثق ومعتمد' : 'قيد الانتظار'}
                        </span>
                    </div>
                </div>
            </div>

            {/* 5. Terms */}
            <div className="mb-8">
                <h3 className="font-bold text-lg mb-3">الشروط والأحكام:</h3>
                <div className="text-sm space-y-3 leading-relaxed text-gray-700 bg-gray-50 p-6 rounded border">
                    <p>1. يقر الطرف الثاني باستلام مبلغ السلفة الموضح أعلاه فور توقيع هذا العقد أو إيداعه في حسابه البنكي.</p>
                    <p>2. يفوض الطرف الثاني الطرف الأول بخصم قيمة القسط الشهري من راتبه ومستحقاته الشهرية اعتباراً من الشهر التالي لتاريخ الصرف.</p>
                    <p>3. في حال انتهاء خدمة الطرف الثاني لأي سبب، يحق للطرف الأول خصم كامل المبلغ المتبقي من مستحقات نهاية الخدمة أو أي مستحقات أخرى.</p>
                    <p>4. يقر الطرف الثاني بأن هذا الخصم لا يتعارض مع التزاماته المالية الأخرى، وأنه يقع ضمن حدود النسبة النظامية للخصم (10%) وفقاً للمادة 92 و 93 من نظام العمل.</p>
                    <p>5. يعتبر هذا العقد سنداً تنفيذياً في حال تعثر الطرف الثاني عن السداد.</p>
                </div>
            </div>

            {/* 6. Electronic Verification Footer */}
            {isVerified && (
                <div className="mt-12 border-t pt-6 bg-blue-50/50 p-6 rounded-lg border-blue-100">
                    <h4 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        المصادقة والتوثيق الإلكتروني
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500">تاريخ التوثيق:</p>
                            <p className="font-mono font-bold text-gray-800">
                                {new Date(loan.verified_at).toLocaleString('ar-SA')}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-500">تم التوثيق بواسطة الجوال:</p>
                            <p className="font-mono font-bold text-gray-800">
                                {loan.verification_phone || loan.profile?.phone}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-blue-200">
                        <p className="text-xs text-blue-700 text-center font-semibold">
                            تم توثيق هذا العقد إلكترونياً واعتماده وفقاً لنظام التعاملات الإلكترونية السعودي، ولا يحتاج إلى توقيع خطي.
                        </p>
                    </div>
                </div>
            )}
        </div>

        {/* Verification UI - Only shown if not verified */}
        {!isVerified && loan.status === 'approved' && (
              <div className="no-print mt-6 bg-white p-6 rounded-lg shadow border-2 border-blue-100">
                <h3 className="font-bold mb-3 flex items-center gap-2 text-blue-800 text-lg">
                  <Shield className="h-5 w-5" />
                  التوثيق الإلكتروني
                </h3>
                
                <Alert className="mb-6 bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    لإتمام العقد، أدخل رقم جوالك. سيصلك كود تحقق لتوثيق موافقتك.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4 max-w-md mx-auto">
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الجوال</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Phone className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="05XXXXXXXX"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="pr-10"
                          disabled={codeSent}
                          dir="ltr"
                        />
                      </div>
                      <Button
                        onClick={handleSendCode}
                        disabled={sendingCode || codeSent}
                      >
                        {sendingCode ? (
                          <Spin size="small" />
                        ) : codeSent ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            تم الإرسال
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Send className="h-4 w-4" />
                            إرسال الكود
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>

                  {codeSent && (
                    <div className="space-y-2">
                      <Label htmlFor="code">كود التوثيق</Label>
                      <div className="relative">
                        <Lock className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="code"
                          type="text"
                          placeholder="أدخل الكود المكون من 6 أرقام"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="pr-10 text-center text-2xl tracking-widest"
                          maxLength={6}
                          dir="ltr"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        الكود صالح لمدة 10 دقائق. 
                        <button 
                          className="text-blue-600 hover:underline mr-2"
                          onClick={() => {
                            setCodeSent(false);
                            setVerificationCode('');
                          }}
                        >
                          إرسال كود جديد؟
                        </button>
                      </p>
                    </div>
                  )}

                  {codeSent && (
                    <div className="flex items-start space-x-3 space-x-reverse bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <Checkbox
                        id="agree"
                        checked={agreed}
                        onCheckedChange={setAgreed}
                        className="mt-1"
                      />
                      <label htmlFor="agree" className="text-sm cursor-pointer leading-relaxed">
                        أقر بأنني قرأت وفهمت شروط العقد أعلاه، وأوافق على خصم الأقساط من راتبي الشهري.
                        هذه الموافقة الإلكترونية تعادل التوقيع الخطي وفقاً لنظام التعاملات الإلكترونية.
                      </label>
                    </div>
                  )}

                  {codeSent && (
                    <Button
                      onClick={handleVerify}
                      disabled={verifying || !agreed || verificationCode.length !== 6}
                      className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg font-bold shadow-lg shadow-green-200 transition-all hover:scale-[1.02]"
                    >
                      {verifying ? (
                        <span className="flex items-center gap-2">
                          <Spin size="small" />
                          جاري التوثيق...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="h-6 w-6" />
                          توثيق واعتماد العقد
                        </span>
                      )}
                    </Button>
                  )}
                </div>
              </div>
        )}
      </div>
    </>
  );
};

export default LoanVerification;
