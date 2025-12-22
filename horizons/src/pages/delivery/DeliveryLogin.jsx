
// src/pages/delivery/DeliveryLogin.jsx
// صفحة تسجيل دخول مندوبي التوصيل بنظام OTP

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Truck, Phone, Loader2, ArrowLeft, Shield } from 'lucide-react';

export default function DeliveryLogin() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let cleanMobile = mobile.replace(/\D/g, '');
    
    // التحقق من الطول 12 خانة ويبدأ بـ 966
    if (cleanMobile.length !== 12 || !cleanMobile.startsWith('966')) {
      setError('رقم الجوال يجب أن يبدأ بـ 966 ويتكون من 12 رقم');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // البحث عن المندوب - الرقم مخزن في القاعدة 12 رقم مع 966
      const { data: staff, error: searchError } = await supabase
        .from('delivery_staff')
        .select('*')
        .eq('phone', cleanMobile)
        .eq('is_active', true)
        .single();

      if (searchError || !staff) {
        setError('رقم الجوال غير مسجل كمندوب توصيل');
        setLoading(false);
        return;
      }

      // توليد OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // حفظ OTP
      await supabase.from('otp_codes').insert({
        phone: staff.phone, // حفظ الرقم كما هو في قاعدة الموظفين (9 أرقام)
        otp_code: otp,
        user_type: 'delivery',
        expires_at: expiresAt.toISOString()
      });

      // إرسال SMS باستخدام الرقم الكامل (12 خانة)
      await fetch('https://api.oursms.com/api-a/msgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: 'n68E8CISvil58edsg-RE',
          src: 'MTS',
          dests: cleanMobile, // إرسال للرقم الدولي الكامل
          body: `رمز دخول المندوب: ${otp}\nصالح لمدة 10 دقائق\nMTS`
        })
      });

      // حفظ بيانات المندوب للانتقال لصفحة التحقق
      sessionStorage.setItem('pendingDelivery', JSON.stringify({
        id: staff.id,
        name: staff.staff_name,
        phone: staff.phone,
        code: staff.staff_code
      }));

      navigate('/delivery/verify');

    } catch (err) {
      console.error('Error:', err);
      setError('حدث خطأ أثناء إرسال رمز التحقق');
    } finally {
      setLoading(false);
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

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline ml-2" />
                رقم الجوال
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="966xxxxxxxxx"
                  className="w-full px-4 py-3 border rounded-lg text-left font-mono text-lg tracking-wider focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  dir="ltr"
                  disabled={loading}
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">أدخل رقم الجوال المسجل في النظام</p>
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
          <a href="/login" className="text-xs text-slate-600 hover:underline mt-2 inline-block">
            دخول الموظفين
          </a>
        </div>

      </div>
    </div>
  );
}
