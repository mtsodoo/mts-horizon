
// src/pages/customer/CustomerVerify.jsx
// صفحة التحقق من رمز OTP للعملاء

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Smartphone, Loader2, ArrowRight, RefreshCw, CheckCircle } from 'lucide-react';

export default function CustomerVerify() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    // جلب بيانات العميل من sessionStorage
    const pendingCustomer = sessionStorage.getItem('pendingCustomer');
    if (!pendingCustomer) {
      navigate('/customer/login');
      return;
    }
    setCustomer(JSON.parse(pendingCustomer));

    // التركيز على حقل الإدخال
    inputRef.current?.focus();

    // العد التنازلي لإعادة الإرسال
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

  // التحقق من OTP
  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      setError('رمز التحقق يجب أن يكون 6 أرقام');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // البحث عن OTP صالح
      const { data: otpRecord, error: otpError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('phone', customer.phone)
        .eq('otp_code', otp)
        .eq('user_type', 'customer')
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

      // تحديث OTP كمستخدم
      await supabase
        .from('otp_codes')
        .update({ is_used: true })
        .eq('id', otpRecord.id);

      // حفظ بيانات تسجيل الدخول
      const customerSession = {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        code: customer.code,
        odoo_id: customer.odoo_id, // Added odoo_id
        loginTime: new Date().toISOString()
      };
      
      sessionStorage.setItem('customerSession', JSON.stringify(customerSession));
      sessionStorage.removeItem('pendingCustomer');

      // إرسال إشعار للمدير
      try {
        await fetch('https://api.oursms.com/api-a/msgs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            token: 'n68E8CISvil58edsg-RE',
            src: 'MTS',
            dests: '539755999',
            body: `تسجيل دخول عميل: ${customer.name}`
          })
        });
      } catch (e) {
        console.log('SMS notification failed');
      }

      // الانتقال للوحة التحكم
      navigate('/customer/dashboard');

    } catch (err) {
      console.error('Verify error:', err);
      setError('حدث خطأ أثناء التحقق');
    } finally {
      setLoading(false);
    }
  };

  // إعادة إرسال OTP
  const handleResend = async () => {
    if (!canResend) return;

    setResending(true);
    setError('');

    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await supabase.from('otp_codes').insert({
        phone: customer.phone,
        otp_code: otp,
        user_type: 'customer',
        expires_at: expiresAt.toISOString()
      });

      await fetch('https://api.oursms.com/api-a/msgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: 'n68E8CISvil58edsg-RE',
          src: 'MTS',
          dests: customer.phone,
          body: `رمز التحقق الجديد: ${otp}\nصالح لمدة 10 دقائق\nMTS`
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

  if (!customer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#714b67] text-white p-6 text-center">
          <div className="w-16 h-16 bg-white/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold mb-2">تحقق من رمز OTP</h1>
          <p className="text-sm opacity-90">تم إرسال رمز التحقق إلى جوالك</p>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* معلومات العميل */}
          <div className="bg-gray-50 border rounded-lg p-4 mb-6 text-center border-r-4 border-r-[#714b67]">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Smartphone className="w-4 h-4 text-[#714b67]" />
              <span className="font-semibold text-gray-800 font-mono" dir="ltr">
                +966{customer.phone}
              </span>
            </div>
            {customer.name && (
              <p className="text-sm text-gray-500">مرحباً {customer.name}</p>
            )}
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
                className="w-full px-4 py-4 border-2 rounded-lg text-center font-mono text-3xl tracking-[0.5em] focus:ring-2 focus:ring-[#714b67] focus:border-[#714b67]"
                disabled={loading}
                autoComplete="one-time-code"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-[#714b67] hover:bg-[#875a7b] text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري التحقق...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  تأكيد الرمز
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
                className="text-[#714b67] hover:text-[#875a7b] text-sm font-medium flex items-center justify-center gap-2 mx-auto"
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
            href="/customer/login" 
            className="text-sm text-gray-500 hover:text-[#714b67] flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            العودة لتسجيل الدخول
          </a>
        </div>

      </div>
    </div>
  );
}
