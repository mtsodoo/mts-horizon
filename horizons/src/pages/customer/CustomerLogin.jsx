
// src/pages/customer/CustomerLogin.jsx
// صفحة تسجيل دخول العملاء بنظام OTP

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Phone, KeyRound, Loader2, Building2, FileText, Shield, Mail, ArrowLeft } from 'lucide-react';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('code'); // code, mobile, info
  const [customerCode, setCustomerCode] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // إرسال OTP بكود العميل
  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    if (!customerCode.trim()) {
      setError('يرجى إدخال كود العميل');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // البحث عن العميل بالكود
      const { data: customer, error: searchError } = await supabase
        .from('customers')
        .select('*')
        .eq('customer_code', customerCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (searchError || !customer) {
        setError('كود العميل غير موجود أو غير مفعل');
        setLoading(false);
        return;
      }

      // توليد OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 دقائق

      // حفظ OTP
      await supabase.from('otp_codes').insert({
        phone: customer.phone,
        otp_code: otp,
        user_type: 'customer',
        expires_at: expiresAt.toISOString()
      });

      // إرسال SMS
      const smsResponse = await fetch('https://api.oursms.com/api-a/msgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: 'n68E8CISvil58edsg-RE',
          src: 'MTS',
          dests: customer.phone,
          body: `رمز التحقق الخاص بك: ${otp}\nصالح لمدة 10 دقائق\nMTS`
        })
      });

      // حفظ بيانات العميل في sessionStorage للانتقال لصفحة التحقق
      sessionStorage.setItem('pendingCustomer', JSON.stringify({
        id: customer.id,
        name: customer.customer_name,
        phone: customer.phone,
        code: customer.customer_code,
        odoo_id: customer.odoo_id
      }));

      navigate('/customer/verify');

    } catch (err) {
      console.error('Error:', err);
      setError('حدث خطأ أثناء إرسال رمز التحقق');
    } finally {
      setLoading(false);
    }
  };

  // إرسال OTP برقم الجوال
  const handleMobileSubmit = async (e) => {
    e.preventDefault();
    
    let cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.startsWith('0')) {
      cleanMobile = cleanMobile.substring(1);
    }
    
    if (cleanMobile.length !== 9) {
      setError('رقم الجوال غير صحيح');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // البحث عن العميل برقم الجوال
      const { data: customer, error: searchError } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', cleanMobile)
        .eq('is_active', true)
        .single();

      if (searchError || !customer) {
        setError('رقم الجوال غير مسجل في النظام');
        setLoading(false);
        return;
      }

      // توليد OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // حفظ OTP
      await supabase.from('otp_codes').insert({
        phone: customer.phone,
        otp_code: otp,
        user_type: 'customer',
        expires_at: expiresAt.toISOString()
      });

      // إرسال SMS
      await fetch('https://api.oursms.com/api-a/msgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: 'n68E8CISvil58edsg-RE',
          src: 'MTS',
          dests: customer.phone,
          body: `رمز التحقق الخاص بك: ${otp}\nصالح لمدة 10 دقائق\nMTS`
        })
      });

      sessionStorage.setItem('pendingCustomer', JSON.stringify({
        id: customer.id,
        name: customer.customer_name,
        phone: customer.phone,
        code: customer.customer_code,
        odoo_id: customer.odoo_id
      }));

      navigate('/customer/verify');

    } catch (err) {
      console.error('Error:', err);
      setError('حدث خطأ أثناء إرسال رمز التحقق');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#714b67] text-white p-6 text-center">
          <div className="w-16 h-16 bg-white/15 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold mb-2">بوابة العملاء</h1>
          <p className="text-sm opacity-90">نظام إدارة طلبات الجماهير</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('code')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'code'
                ? 'text-[#714b67] border-b-2 border-[#714b67] bg-purple-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <KeyRound className="w-4 h-4 inline ml-2" />
            كود العميل
          </button>
          <button
            onClick={() => setActiveTab('mobile')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'mobile'
                ? 'text-[#714b67] border-b-2 border-[#714b67] bg-purple-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Phone className="w-4 h-4 inline ml-2" />
            رقم الجوال
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'info'
                ? 'text-[#714b67] border-b-2 border-[#714b67] bg-purple-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4 inline ml-2" />
            الشروط
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Code Tab */}
          {activeTab === 'code' && (
            <form onSubmit={handleCodeSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  كود العميل
                </label>
                <input
                  type="text"
                  value={customerCode}
                  onChange={(e) => setCustomerCode(e.target.value.toUpperCase())}
                  placeholder="QADISIYA"
                  maxLength={20}
                  className="w-full px-4 py-3 border rounded-lg text-center font-mono text-lg uppercase tracking-wider focus:ring-2 focus:ring-[#714b67] focus:border-transparent"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-2">أدخل الكود المخصص لك</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#714b67] hover:bg-[#875a7b] text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    إرسال رمز التحقق
                    <ArrowLeft className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Mobile Tab */}
          {activeTab === 'mobile' && (
            <form onSubmit={handleMobileSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الجوال
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="05xxxxxxxx"
                    className="w-full px-4 py-3 border rounded-lg text-left font-mono text-lg tracking-wider focus:ring-2 focus:ring-[#714b67] focus:border-transparent pr-16"
                    dir="ltr"
                    disabled={loading}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                    +966
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">أدخل رقم الجوال مع الصفر: 05xxxxxxxx</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#714b67] hover:bg-[#875a7b] text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    إرسال رمز التحقق
                    <ArrowLeft className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              {/* How it works */}
              <div className="bg-gray-50 border rounded-lg p-4">
                <h3 className="font-semibold text-[#714b67] mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  كيف يعمل النظام؟
                </h3>
                <ul className="text-sm text-gray-600 space-y-2 pr-4">
                  <li>• اختر طريقة الدخول (كود العميل أو رقم الجوال)</li>
                  <li>• أدخل البيانات وسيتم إرسال رمز التحقق عبر SMS</li>
                  <li>• أدخل رمز التحقق للوصول إلى حسابك</li>
                </ul>
              </div>

              {/* Terms */}
              <div className="bg-gray-50 border rounded-lg p-4 max-h-60 overflow-y-auto">
                <h3 className="font-semibold text-[#714b67] mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  شروط وأحكام الاستخدام
                </h3>
                <div className="text-sm text-gray-600 space-y-3">
                  <p><strong>1. القبول:</strong> باستخدام هذه البوابة، فإنك توافق على الالتزام بجميع الشروط والأحكام.</p>
                  <p><strong>2. التوثيق:</strong> جميع العمليات يتم توثيقها برسائل نصية (SMS) وتعتبر جزءاً من إثبات التعامل.</p>
                  <p><strong>3. الخصوصية:</strong> تلتزم الشركة بحماية خصوصية بياناتك وعدم مشاركتها مع أطراف ثالثة.</p>
                  <p><strong>4. المسؤولية:</strong> العميل مسؤول عن الحفاظ على سرية بيانات الدخول الخاصة به.</p>
                  <p><strong>5. التواصل:</strong> للاستفسارات: info@mtse.sa</p>
                </div>
              </div>

              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-center">
                <p className="text-sm text-teal-700 flex items-center justify-center gap-2">
                  <Shield className="w-4 h-4" />
                  هذه البوابة محمية ومشفرة لضمان أمان بياناتك
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t px-6 py-4 text-center">
          <p className="text-xs text-gray-500">
            نظام إدارة العملاء - جميع الحقوق محفوظة © {new Date().getFullYear()}
          </p>
          <a href="/login" className="text-xs text-[#714b67] hover:underline mt-2 inline-block">
            دخول الموظفين
          </a>
        </div>

      </div>
    </div>
  );
}
