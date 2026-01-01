import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerLayout from '@/components/CustomerPortal/CustomerLayout';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Warehouse, Trash2, ShoppingCart, CheckCircle2, Calendar, User, Send, Loader2, Package, AlertCircle, MapPin, Phone, FileText, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion } from 'framer-motion';

// ✅ الشعار
const LOGO_URL = 'https://sys.mtserp.com/logo/b-logo.png';

const NewSupplyOrder = () => {
  const { customer } = useCustomerAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [formData, setFormData] = useState({ 
    event_name: '', 
    event_date: '', 
    event_time: '', 
    city: '', 
    stadium: '', 
    supervisor_name: '', 
    supervisor_phone: '', 
    notes: '' 
  });
  const [cart, setCart] = useState([]);
  const [showOTP, setShowOTP] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  // ✅ جلب المنتجات من قاعدة البيانات
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('warehouse_products')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (e) {
      console.error('Error fetching products:', e);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل جلب المنتجات' });
    } finally {
      setLoading(false);
    }
  };

  // ✅ الفئات من المنتجات
  const categories = ['All', ...new Set(products.map(p => p.category))];

  // ✅ فلترة المنتجات
  const filteredProducts = selectedCategory === 'All' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const formatPhoneNumber = (number) => {
    let cleaned = number.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (!cleaned.startsWith('966')) cleaned = '966' + cleaned;
    return cleaned;
  };

  const handleQuantityChange = (product, quantity) => {
    const qty = parseInt(quantity) || 0;
    if (qty <= 0) { 
      setCart(prev => prev.filter(item => item.product_id !== product.id)); 
      return; 
    }
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) return prev.map(item => item.product_id === product.id ? { ...item, quantity: qty } : item);
      return [...prev, { 
        product_id: product.id, 
        product_code: product.product_code,
        product_name: product.product_name, 
        unit: product.unit, 
        quantity: qty 
      }];
    });
  };

  const removeFromCart = (productId) => setCart(prev => prev.filter(item => item.product_id !== productId));
  const getCartQuantity = (productId) => cart.find(i => i.product_id === productId)?.quantity || '';
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  const sendOTP = async () => {
    if (!formData.event_name || !formData.event_date || cart.length === 0) { 
      toast({ variant: 'destructive', title: 'بيانات ناقصة', description: 'أكمل البيانات واختر المنتجات' }); 
      return; 
    }
    if (!formData.supervisor_name || !formData.supervisor_phone) { 
      toast({ variant: 'destructive', title: 'بيانات ناقصة', description: 'أدخل بيانات المشرف' }); 
      return; 
    }
    if (!customer?.phone) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'رقم الجوال غير متوفر' });
      return;
    }

    setOtpLoading(true);
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await supabase.from('otp_codes').insert({ 
        phone: customer.phone, 
        otp_code: otp, 
        user_type: 'order_confirm', 
        expires_at: new Date(Date.now() + 600000).toISOString() 
      });
      
      const formattedPhone = formatPhoneNumber(customer.phone);
      
      await fetch('https://api.ultramsg.com/instance157134/messages/chat', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, 
        body: new URLSearchParams({ 
          token: '8cmlm9zr0ildffsu',
          to: formattedPhone,
          body: `رمز تأكيد الطلب: ${otp}\nصالح 10 دقائق\nMTS` 
        }) 
      });
      
      setShowOTP(true);
      toast({ title: 'تم إرسال رمز التأكيد للواتساب' });
    } catch (e) { 
      console.error(e);
      toast({ variant: 'destructive', title: 'خطأ في إرسال الرمز' }); 
    }
    finally { setOtpLoading(false); }
  };

  const handleSubmit = async () => {
    if (otpCode.length !== 6) { 
      toast({ variant: 'destructive', title: 'رمز التأكيد 6 أرقام' }); 
      return; 
    }
    setSubmitting(true);
    try {
      const { data: otpRecord } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('phone', customer.phone)
        .eq('otp_code', otpCode)
        .eq('user_type', 'order_confirm')
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!otpRecord) { 
        toast({ variant: 'destructive', title: 'رمز خاطئ أو منتهي' }); 
        setSubmitting(false); 
        return; 
      }
      
      await supabase.from('otp_codes').update({ is_used: true }).eq('id', otpRecord.id);
      
      const itemsListText = cart.map(item => `- ${item.product_name} [${item.product_code}] (${item.quantity} ${item.unit})`).join('\n');
      
      const { data: orderData, error } = await supabase
        .from('supply_orders')
        .insert([{ 
          customer_id: customer.id, 
          order_type: 'warehouse', 
          ...formData, 
          notes: (formData.notes || '') + '\n\n--- المنتجات ---\n' + itemsListText,
          status: 'pending', 
          total_items: totalItems
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // إرسال SMS للمدير
      const msg = `طلب مستودع جديد\n${customer.customer_name}\n${orderData.order_number}\n${formData.event_name}\n${formData.event_date}\n\nالمنتجات:\n${cart.map(i => `${i.product_name}: ${i.quantity}`).join('\n')}`;
      await fetch('https://api.oursms.com/api-a/msgs', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, 
        body: new URLSearchParams({ 
          token: 'n68E8CISvil58edsg-RE', 
          src: 'MTS', 
          dests: '966539755999', 
          body: msg 
        }) 
      });
      
      toast({ title: 'تم إرسال الطلب بنجاح', description: `رقم الطلب: ${orderData.order_number}` });
      navigate('/customer-portal/my-orders');
    } catch (e) { 
      console.error(e);
      toast({ variant: 'destructive', title: 'خطأ', description: e.message }); 
    }
    finally { setSubmitting(false); }
  };

  return (
    <CustomerLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        
        {/* ✅ Header مع الشعار */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <img 
            src={LOGO_URL} 
            alt="MTS Logo" 
            className="h-12 w-auto object-contain"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div>
            <h1 className="text-xl font-bold text-gray-900">طلب من المستودع</h1>
            <p className="text-gray-500 text-sm">اختر المنتجات وحدد تفاصيل الفعالية</p>
          </div>
        </motion.div>

        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            الكميات للطلب فقط وسيتم تأكيد توفرها بعد المراجعة
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-teal-600 mb-4" />
            <p className="text-gray-500 font-medium">جاري تحميل المنتجات...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              
              {/* ✅ بيانات الفعالية */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Calendar className="w-5 h-5 text-teal-600" />
                      بيانات الفعالية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        اسم الفعالية <span className="text-red-500">*</span>
                      </Label>
                      <Input value={formData.event_name} onChange={(e) => setFormData({...formData, event_name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>التاريخ <span className="text-red-500">*</span></Label>
                      <Input type="date" value={formData.event_date} onChange={(e) => setFormData({...formData, event_date: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>الوقت</Label>
                      <Input type="time" value={formData.event_time} onChange={(e) => setFormData({...formData, event_time: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        المدينة
                      </Label>
                      <Input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
                    </div>
                    <div className="col-span-full space-y-2">
                      <Label>الملعب</Label>
                      <Input value={formData.stadium} onChange={(e) => setFormData({...formData, stadium: e.target.value})} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* ✅ بيانات المشرف */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card className="shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <User className="w-5 h-5 text-teal-600" />
                      بيانات المشرف
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم المشرف <span className="text-red-500">*</span></Label>
                      <Input value={formData.supervisor_name} onChange={(e) => setFormData({...formData, supervisor_name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        رقم الجوال <span className="text-red-500">*</span>
                      </Label>
                      <Input value={formData.supervisor_phone} onChange={(e) => setFormData({...formData, supervisor_phone: e.target.value})} dir="ltr" className="text-right" />
                    </div>
                    <div className="col-span-full space-y-2">
                      <Label>ملاحظات</Label>
                      <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* ✅ المنتجات */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold flex items-center gap-2">
                      <Package className="w-5 h-5 text-teal-600" />
                      المنتجات ({products.length})
                    </h2>
                    <Button variant="ghost" size="sm" onClick={fetchProducts}>
                      <RefreshCw className="w-4 h-4 ml-1" />
                      تحديث
                    </Button>
                  </div>
                  
                  {/* فلتر الفئات */}
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {categories.map(cat => (
                      <Button 
                        key={cat} 
                        variant={selectedCategory === cat ? "default" : "outline"} 
                        onClick={() => setSelectedCategory(cat)} 
                        className={selectedCategory === cat ? "bg-teal-600 hover:bg-teal-700" : ""} 
                        size="sm"
                      >
                        {cat === 'All' ? 'الكل' : cat}
                      </Button>
                    ))}
                  </div>
                  
                  {/* قائمة المنتجات */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredProducts.map(product => (
                      <motion.div 
                        key={product.id}
                        whileHover={{ scale: 1.01 }}
                        className={`rounded-xl p-4 border transition-all ${
                          getCartQuantity(product.id) 
                            ? 'ring-2 ring-teal-500 border-teal-500 bg-teal-50/30' 
                            : 'bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex gap-3 mb-3">
                          {/* صورة المنتج */}
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.product_name}
                              className="w-14 h-14 rounded-lg object-cover border flex-shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center border flex-shrink-0">
                              <ImageIcon className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-bold text-sm truncate">{product.product_name}</h3>
                                <p className="text-xs text-gray-500">{product.product_code} | {product.category}</p>
                              </div>
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded h-fit flex-shrink-0">{product.unit}</span>
                            </div>
                            
                            {/* حالة المخزون */}
                            {product.current_stock === 0 ? (
                              <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded mt-1 inline-block">غير متوفر</span>
                            ) : product.current_stock <= product.min_stock ? (
                              <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded mt-1 inline-block">كمية محدودة</span>
                            ) : (
                              <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded mt-1 inline-block">متوفر</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            min="0" 
                            placeholder="الكمية" 
                            value={getCartQuantity(product.id)} 
                            onChange={(e) => handleQuantityChange(product, e.target.value)} 
                            className="h-9"
                          />
                          {getCartQuantity(product.id) > 0 && (
                            <div className="bg-teal-100 text-teal-700 p-2 rounded-lg">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ✅ السلة */}
            <div className="lg:col-span-1">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                className="sticky top-4"
              >
                <Card className="shadow-lg border-t-4 border-t-teal-500">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ShoppingCart className="w-5 h-5 text-teal-600" />
                      ملخص الطلب
                      {totalItems > 0 && (
                        <span className="bg-teal-100 text-teal-700 text-xs px-2 py-0.5 rounded-full mr-auto">
                          {totalItems} قطعة
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 max-h-[40vh] overflow-y-auto">
                    {cart.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">السلة فارغة</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {cart.map((item, i) => (
                          <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                            <div>
                              <p className="font-medium text-sm">{item.product_name}</p>
                              <p className="text-xs text-teal-600">{item.quantity} {item.unit}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="text-red-400 h-8 w-8" onClick={() => removeFromCart(item.product_id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                  
                  {cart.length > 0 && (
                    <div className="p-4 border-t space-y-4">
                      <div className="flex justify-between text-sm">
                        <span>عدد الأصناف:</span>
                        <span className="font-bold text-teal-600">{cart.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>إجمالي القطع:</span>
                        <span className="font-bold text-teal-600">{totalItems}</span>
                      </div>
                      
                      {!showOTP ? (
                        <Button className="w-full bg-teal-600 hover:bg-teal-700 h-12" onClick={sendOTP} disabled={otpLoading}>
                          {otpLoading ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Send className="w-5 h-5 ml-2" />}
                          {otpLoading ? 'جاري الإرسال...' : 'تأكيد وإرسال'}
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          <Alert className="bg-amber-50 border-amber-200">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-amber-700 text-sm">تم إرسال رمز التأكيد للواتساب</AlertDescription>
                          </Alert>
                          <Input 
                            type="tel" 
                            value={otpCode} 
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                            placeholder="رمز التأكيد" 
                            className="text-center font-mono text-xl h-12" 
                            maxLength={6} 
                          />
                          <Button className="w-full bg-green-600 hover:bg-green-700 h-12" onClick={handleSubmit} disabled={submitting || otpCode.length !== 6}>
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <CheckCircle2 className="w-5 h-5 ml-2" />}
                            {submitting ? 'جاري الإرسال...' : 'تأكيد الطلب'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
};

export default NewSupplyOrder;