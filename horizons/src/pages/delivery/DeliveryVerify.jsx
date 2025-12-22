// src/pages/delivery/DeliveryVerify.jsx
// صفحة التحقق من رمز OTP للمندوبين

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Smartphone, Loader2, ArrowRight, RefreshCw, CheckCircle, Truck } from 'lucide-react';

export default function DeliveryVerify() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [staff, setStaff] = useState(null);

  useEffect(() => {
    const pendingDelivery = sessionStorage.getItem('pendingDelivery');
    if (!pendingDelivery) {
      navigate('/delivery/login');
      return;
    }
    setStaff(JSON.parse(pendingDelivery));
    inputRef.current?.focus();

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      setError('رمز التحقق يجب أن يكون 6 أرقام');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: otpRecord, error: otpError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('phone', staff.phone)
        .eq('otp_code', otp)
        .eq('user_type', 'delivery')
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (otpError || !otpRecord) {
        setError('رمز التحقق غير صحيح أو منتهي الصلاحية');
        setLoading(false);
        return;
      }

      await supabase
        .from('otp_codes')
        .update({ is_used: true })
        .eq('id', otpRecord.id);

      // تحديث آخر دخول للمندوب
      await supabase
        .from('delivery_staff')
        .update({ last_login: new Date().toISOString() })
        .eq('id', staff.id);

      const deliverySession = {
        id: staff.id,
        name: staff.name,
        phone: staff.phone,
        code: staff.code,
        loginTime: new Date().toISOString()
      };
      
      sessionStorage.setItem('deliverySession', JSON.stringify(deliverySession));
      sessionStorage.removeItem('pendingDelivery');

      navigate('/delivery/dashboard');

    } catch (err) {
      console.error('Verify error:', err);
      setError('حدث خطأ أثناء التحقق');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setResending(true);
    setError('');

    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await supabase.from('otp_codes').insert({
        phone: staff.phone,
        otp_code: otp,
        user_type: 'delivery',
        expires_at: expiresAt.toISOString()
      });

      await fetch('https://api.oursms.com/api-a/msgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: 'n68E8CISvil58edsg-RE',
          src: 'MTS',
          dests: staff.phone,
          body: `رمز الدخول الجديد: ${otp}\nصالح لمدة 10 دقائق\nMTS`
        })
      });

      setCountdown(60);
      setCanResend(false);
      setOtp('');
      inputRef.current?.focus();

    } catch (err) {
      setError('فشل في إعادة إرسال الرمز');
    } finally {
      setResending(false);
    }
  };

  if (!staff) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-6 text-center">
          <div className="w-16 h-16 bg-white/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold mb-2">تحقق من رمز الدخول</h1>
          <p className="text-sm opacity-90">تم إرسال رمز التحقق إلى جوالك</p>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* معلومات المندوب */}
          <div className="bg-slate-50 border rounded-lg p-4 mb-6 text-center border-r-4 border-r-slate-600">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Truck className="w-4 h-4 text-slate-600" />
              <span className="font-semibold text-gray-800">{staff.name}</span>
            </div>
            <p className="text-sm text-gray-500 font-mono" dir="ltr">+966{staff.phone}</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleVerify}>
            <div className="mb-6">
              <input
                ref={inputRef}
                type="tel"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-4 border-2 rounded-lg text-center font-mono text-3xl tracking-[0.5em] focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                disabled={loading}
                autoComplete="one-time-code"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-slate-700 hover:bg-slate-800 text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري التحقق...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  تأكيد الدخول
                </>
              )}
            </button>
          </form>

          {/* إعادة الإرسال */}
          <div className="mt-6 text-center">
            {canResend ? (
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-slate-600 hover:text-slate-800 text-sm font-medium flex items-center justify-center gap-2 mx-auto"
              >
                {resending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    إعادة إرسال الرمز
                  </>
                )}
              </button>
            ) : (
              <p className="text-sm text-gray-500">
                إعادة الإرسال بعد {countdown} ثانية
              </p>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t px-6 py-4 text-center">
          <a 
            href="/delivery/login" 
            className="text-sm text-gray-500 hover:text-slate-700 flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            العودة لتسجيل الدخول
          </a>
        </div>

      </div>
    </div>
  );
}