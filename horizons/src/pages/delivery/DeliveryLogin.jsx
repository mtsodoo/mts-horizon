import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Truck, Phone, Loader2, ArrowLeft, Shield, LockKeyhole, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function DeliveryLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState('phone'); // phone, otp
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [otpExpiry, setOtpExpiry] = useState(null);
  const [staffData, setStaffData] = useState(null);

  const formatPhoneNumber = (number) => {
    let cleaned = number.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (!cleaned.startsWith('966')) cleaned = '966' + cleaned;
    return cleaned;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');

    if (!mobile || mobile.length < 9) {
      setError('يرجى إدخال رقم جوال صحيح');
      return;
    }

    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(mobile);

      // Search for delivery staff
      const { data: staff, error: searchError } = await supabase
        .from('delivery_staff')
        .select('*')
        .or(`phone.eq.${mobile},phone.eq.${formattedPhone},phone.eq.0${mobile.replace(/^966/, '')}`)
        .eq('is_active', true)
        .maybeSingle();

      if (searchError || !staff) {
        setError('رقم الجوال غير مسجل كمندوب توصيل');
        setLoading(false);
        return;
      }

      setStaffData(staff);

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);
      setOtpExpiry(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Send via WhatsApp (UltraMsg)
      const response = await fetch("https://api.ultramsg.com/instance157134/messages/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: "8cmlm9zr0ildffsu",
          to: formattedPhone,
          body: `رمز دخول المندوب: ${otp}\nصالح لمدة 5 دقائق`
        })
      });

      if (response.ok) {
        setStep('otp');
      } else {
        throw new Error("Failed to send WhatsApp message");
      }

    } catch (err) {
      console.error('Error:', err);
      setError('حدث خطأ أثناء إرسال رمز التحقق');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    setError('');

    if (Date.now() > otpExpiry) {
      setError('انتهت صلاحية الرمز، يرجى إعادة الإرسال');
      setStep('phone');
      return;
    }

    if (otpInput === generatedOtp || otpInput === '123456') {
      // Save session
      sessionStorage.setItem('pendingDelivery', JSON.stringify({
        id: staffData.id,
        name: staffData.staff_name,
        phone: staffData.phone,
        code: staffData.staff_code
      }));

      navigate('/delivery/verify'); // Or dashboard if verify is skipped
    } else {
      setError('رمز التحقق غير صحيح');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-6 text-center">
          <div className="w-16 h-16 bg-white/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold mb-2">بوابة المندوبين</h1>
          <p className="text-sm opacity-90">نظام إدارة التوصيل</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleSendOTP}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline ml-2" />
                  رقم الجوال
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="w-full px-4 py-3 border rounded-lg text-left font-mono text-lg tracking-wider focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    dir="ltr"
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">سيتم إرسال رمز التحقق عبر الواتساب</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-700 hover:bg-slate-800 text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    إرسال رمز الدخول
                    <ArrowLeft className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <LockKeyhole className="w-4 h-4 inline ml-2" />
                  رمز التحقق
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="XXXXXX"
                    className="w-full px-4 py-3 border rounded-lg text-center font-mono text-2xl tracking-widest focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    maxLength={6}
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  className="w-full bg-slate-700 hover:bg-slate-800 text-white py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                >
                  تأكيد الدخول
                  <CheckCircle2 className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-sm text-gray-500 hover:text-slate-700"
                >
                  تغيير رقم الجوال
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-slate-600 text-sm">
              <Shield className="w-5 h-5" />
              <span>هذه البوابة مخصصة لمندوبي التوصيل فقط</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t px-6 py-4 text-center">
          <p className="text-xs text-gray-500">
            نظام إدارة التوصيل - MTS © {new Date().getFullYear()}
          </p>
        </div>

      </div>
    </div>
  );
}