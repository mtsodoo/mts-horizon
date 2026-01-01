import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerLayout from '@/components/CustomerPortal/CustomerLayout';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Users, Send, Loader2, Minus, Plus, ShoppingCart, RefreshCw, Calendar, Package, MapPin, Phone, FileText, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

// ✅ الشعار
const LOGO_URL = 'https://sys.mtserp.com/logo/b-logo.png';
const SUPABASE_URL = 'https://ycbplbsrzsuefeqlhxsx.supabase.co';

const CITIES = [
  'الرياض', 'جدة', 'الدمام', 'مكة المكرمة', 'المدينة المنورة', 
  'الخبر', 'الطائف', 'بريدة', 'تبوك', 'خميس مشيط', 
  'حائل', 'نجران', 'الأحساء'
];

const FansOrder = () => {
  const { customer } = useCustomerAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [form, setForm] = useState({ 
    match_info: '', 
    delivery_date: '', 
    delivery_time: '', 
    city: '', 
    stadium: '', 
    supervisor_phone: '' 
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/odoo-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_products' })
      });
      const data = await res.json();
      if (data.success) {
        setProducts(data.data || []);
      } else {
        setError(data.error || 'فشل جلب المنتجات');
      }
    } catch (e) {
      setError('خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const updateQty = (id, delta) => setCart(prev => {
    const qty = Math.max(0, (prev[id] || 0) + delta);
    if (qty === 0) { const { [id]: _, ...rest } = prev; return rest; }
    return { ...prev, [id]: qty };
  });

  const totalItems = Object.values(cart).reduce((s, q) => s + q, 0);
  const totalPrice = Object.entries(cart).reduce((s, [id, qty]) => {
    const p = products.find(x => x.id === parseInt(id));
    return s + (p?.list_price || 0) * qty;
  }, 0);

  const formatPhoneNumber = (number) => {
    let cleaned = number.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (!cleaned.startsWith('966')) cleaned = '966' + cleaned;
    return cleaned;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.delivery_date || !form.city || !form.stadium || !form.supervisor_phone) {
      toast({ variant: 'destructive', title: 'اكمل الحقول المطلوبة' });
      return;
    }
    if (totalItems === 0) {
      toast({ variant: 'destructive', title: 'اختر منتج واحد على الأقل' });
      return;
    }

    setSubmitting(true);
    try {
      const orderProducts = Object.entries(cart).map(([id, qty]) => ({ id: parseInt(id), quantity: qty }));
      const notes = `المباراة: ${form.match_info}\nالتاريخ: ${form.delivery_date} ${form.delivery_time}\nالمدينة: ${form.city}\nالملعب: ${form.stadium}\nالمستلم: ${form.supervisor_phone}`;
      
      const res = await fetch(`${SUPABASE_URL}/functions/v1/odoo-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_order',
          params: { customer_id: customer?.odoo_id || 38, products: orderProducts, notes }
        })
      });
      
      const data = await res.json();
      if (data.success) {
        const orderNumber = data.data.name;

        // إرسال إشعار للمدير
        const msgAdmin = `طلب جماهير جديد\nرقم: ${orderNumber}\nالعميل: ${customer?.customer_name}\nالملعب: ${form.stadium}\nالقطع: ${totalItems}`;
        await fetch('https://api.oursms.com/api-a/msgs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: 'n68E8CISvil58edsg-RE', src: 'MTS', dests: '539755999', body: msgAdmin })
        });

        // إرسال تأكيد للعميل
        if (customer?.phone) {
          const formattedCustomerPhone = formatPhoneNumber(customer.phone);
          const msgCustomer = `مرحباً ${customer.customer_name}،\nتم استلام طلبك رقم ${orderNumber} بنجاح.\nشكراً لثقتكم بنا.\nMTS`;
          
          await fetch('https://api.oursms.com/api-a/msgs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ 
              token: 'n68E8CISvil58edsg-RE', 
              src: 'MTS', 
              dests: formattedCustomerPhone, 
              body: msgCustomer 
            })
          });
        }

        toast({ title: 'تم ارسال الطلب بنجاح', description: `رقم الطلب: ${orderNumber}` });
        navigate('/customer-portal/my-orders');
      } else {
        throw new Error(data.error);
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CustomerLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        
        {/* ✅ Header مع الشعار */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <img 
              src={LOGO_URL} 
              alt="MTS Logo" 
              className="h-12 w-auto object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900">طلب توريد جماهير</h1>
              <p className="text-gray-500 text-sm">أدوات تشجيع للمباريات والفعاليات</p>
            </div>
          </div>
          
          {totalItems > 0 && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-3 bg-white border shadow-sm px-4 py-2 rounded-xl"
            >
              <div className="p-2 rounded-lg bg-teal-50">
                <ShoppingCart className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">ملخص السلة</p>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-teal-700">{totalItems} منتج</span>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="font-bold text-gray-900">{totalPrice.toFixed(2)} ر.س</span>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {loading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-white rounded-2xl shadow-sm border"
          >
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-teal-600 mb-4" />
            <p className="text-gray-500 font-medium">جاري تحميل المنتجات...</p>
          </motion.div>
        ) : error ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-white rounded-2xl shadow-sm border border-red-100"
          >
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-red-600 font-bold mb-2">حدث خطأ</p>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={fetchProducts} variant="outline" className="border-red-200 text-red-600">
              <RefreshCw className="w-4 h-4 ml-2" />
              إعادة المحاولة
            </Button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* ✅ بيانات التسليم */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="w-5 h-5 text-teal-600" />
                    بيانات التسليم
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      معلومات المباراة
                    </Label>
                    <Input 
                      placeholder="مثال: السعودية vs اليابان" 
                      value={form.match_info} 
                      onChange={(e) => setForm({...form, match_info: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">تاريخ التسليم <span className="text-red-500">*</span></Label>
                    <Input 
                      type="date" 
                      min={new Date().toISOString().split('T')[0]} 
                      value={form.delivery_date} 
                      onChange={(e) => setForm({...form, delivery_date: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">وقت التسليم</Label>
                    <Input 
                      type="time" 
                      value={form.delivery_time} 
                      onChange={(e) => setForm({...form, delivery_time: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      المدينة <span className="text-red-500">*</span>
                    </Label>
                    <select 
                      className="flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" 
                      value={form.city} 
                      onChange={(e) => setForm({...form, city: e.target.value})} 
                      required
                    >
                      <option value="">اختر المدينة</option>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">الملعب <span className="text-red-500">*</span></Label>
                    <Input 
                      placeholder="مثال: ملعب الأول بارك" 
                      value={form.stadium} 
                      onChange={(e) => setForm({...form, stadium: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      جوال المستلم <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      type="tel" 
                      placeholder="05xxxxxxxx" 
                      dir="ltr" 
                      className="text-right"
                      value={form.supervisor_phone} 
                      onChange={(e) => setForm({...form, supervisor_phone: e.target.value})} 
                      required 
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ✅ قائمة المنتجات */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="w-5 h-5 text-teal-600" />
                    المنتجات
                    <span className="text-sm font-normal text-gray-500">({products.length} متاح)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {products.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                      لا توجد منتجات متاحة
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {products.map(p => (
                        <motion.div 
                          key={p.id}
                          whileHover={{ scale: 1.01 }}
                          className={`rounded-xl p-4 border transition-all ${
                            cart[p.id] 
                              ? 'ring-2 ring-teal-500 border-teal-500 bg-teal-50/30' 
                              : 'bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                {p.default_code}
                              </span>
                              <h3 className="font-bold text-gray-900 text-sm mt-1 line-clamp-2">{p.name}</h3>
                              <p className="text-teal-700 font-bold text-sm mt-1">{p.list_price} ر.س</p>
                            </div>
                            {cart[p.id] > 0 && (
                              <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                ✓
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-1 border">
                            <Button 
                              type="button" 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50" 
                              onClick={() => updateQty(p.id, -1)}
                              disabled={!cart[p.id]}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className={`font-bold w-8 text-center ${cart[p.id] ? 'text-teal-700' : 'text-gray-400'}`}>
                              {cart[p.id] || 0}
                            </span>
                            <Button 
                              type="button" 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-gray-500 hover:text-teal-600 hover:bg-teal-50" 
                              onClick={() => updateQty(p.id, 1)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* ✅ زر الإرسال */}
            {totalItems > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="sticky bottom-4 z-10"
              >
                <Card className="bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-xl border-none">
                  <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-white/10 p-3 rounded-full hidden sm:block">
                        <ShoppingCart className="w-6 h-6 text-teal-400" />
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">إجمالي الطلب</p>
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-2xl">{totalPrice.toFixed(2)}</span>
                          <span className="text-sm text-gray-400">ر.س</span>
                          <span className="text-gray-500 mx-2">|</span>
                          <span className="text-teal-400 font-medium">{totalItems} قطعة</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full sm:w-auto min-w-[180px] h-12 text-base font-bold bg-teal-600 hover:bg-teal-500"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin ml-2" />
                          جاري الإرسال...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 ml-2" />
                          تأكيد الطلب
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </form>
        )}
      </div>
    </CustomerLayout>
  );
};

export default FansOrder;