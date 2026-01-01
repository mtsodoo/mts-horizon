import React, { useState } from 'react';
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
import { Package, Trash2, ShoppingCart, CheckCircle2, Calendar, Send, Loader2, AlertCircle, Phone, MapPin, User, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// المنتجات الثابتة
const PRODUCTS_DATA = [
  // شالات
  { id: 1, product_name: 'شال أحمر', product_code: 'SH-001', unit: 'قطعة', category: 'شالات' },
  { id: 2, product_name: 'شال أصفر', product_code: 'SH-002', unit: 'قطعة', category: 'شالات' },
  { id: 26, product_name: 'شال VIP', product_code: 'SH-003', unit: 'قطعة', category: 'شالات' },
  
  // أعلام
  { id: 3, product_name: 'أعلام حمراء', product_code: 'FL-001', unit: 'قطعة', category: 'أعلام' },
  { id: 4, product_name: 'أعلام صفراء', product_code: 'FL-002', unit: 'قطعة', category: 'أعلام' },
  { id: 5, product_name: 'أعلام يابانية', product_code: 'FL-003', unit: 'قطعة', category: 'أعلام' },
  
  // بنرات
  { id: 6, product_name: 'بانر عريض إنجليزي', product_code: 'BN-001', unit: 'قطعة', category: 'بنرات' },
  { id: 7, product_name: 'بانر عريض عربي', product_code: 'BN-002', unit: 'قطعة', category: 'بنرات' },
  
  // تيشيرتات
  { id: 8, product_name: 'تيشيرتات صفراء', product_code: 'TS-001', unit: 'قطعة', category: 'تيشيرتات' },
  { id: 9, product_name: 'تيشيرتات حمراء', product_code: 'TS-002', unit: 'قطعة', category: 'تيشيرتات' },
  { id: 10, product_name: 'تيشيرت مشرفين', product_code: 'TS-003', unit: 'قطعة', category: 'تيشيرتات' },
  
  // قبعات
  { id: 11, product_name: 'قبعات صفراء', product_code: 'CP-001', unit: 'قطعة', category: 'قبعات' },
  { id: 12, product_name: 'قبعات حمراء', product_code: 'CP-002', unit: 'قطعة', category: 'قبعات' },
  
  // إكسسوارات
  { id: 13, product_name: 'حقيبة', product_code: 'BG-001', unit: 'قطعة', category: 'إكسسوارات' },
  
  // مايكات
  { id: 14, product_name: 'مايك لاسلكي صغير', product_code: 'MC-001', unit: 'قطعة', category: 'مايكات' },
  
  // طبول
  { id: 17, product_name: 'طبل صغير', product_code: 'DR-001', unit: 'قطعة', category: 'طبول' },
  { id: 18, product_name: 'طبل متوسط', product_code: 'DR-002', unit: 'قطعة', category: 'طبول' },
  
  // بطاريات
  { id: 20, product_name: 'بطاريات صغيرة AA', product_code: 'BT-001', unit: 'علبة', category: 'بطاريات' },
  
  // مياه شرب
  { id: 23, product_name: 'مياه صغيرة 250 مل', product_code: 'WT-001', unit: 'كرتون', category: 'مياه شرب' },
];

// تجميع حسب الفئة
const groupProductsByCategory = (products) => {
  return products.reduce((acc, product) => {
    const category = product.category || 'أخرى';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {});
};

const WarehouseOrder = () => {
  const { customer } = useCustomerAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [submitting, setSubmitting] = useState(false);
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
  const [searchTerm, setSearchTerm] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  // فلترة المنتجات
  const filteredProducts = PRODUCTS_DATA.filter(product =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.product_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedProducts = groupProductsByCategory(filteredProducts);

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
      if (existing) {
        return prev.map(item =>
          item.product_id === product.id ? { ...item, quantity: qty } : item
        );
      }
      return [...prev, { product_id: product.id, product_name: product.product_name, unit: product.unit, quantity: qty }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const getCartQuantity = (productId) => {
    return cart.find(i => i.product_id === productId)?.quantity || '';
  };

  const sendOTP = async () => {
    if (!formData.event_name || !formData.event_date || cart.length === 0) {
      toast({ variant: 'destructive', title: 'بيانات ناقصة', description: 'الرجاء تعبئة اسم الفعالية، التاريخ، واختيار المنتجات.' });
      return;
    }
    if (!customer?.phone) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'رقم الجوال غير متوفر في ملف العميل.' });
      return;
    }

    setOtpLoading(true);
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();

      // حفظ OTP في Supabase
      const { error: dbError } = await supabase.from('otp_codes').insert({ 
        phone: customer.phone, 
        otp_code: otp, 
        user_type: 'warehouse_order', 
        expires_at: expiresAt 
      });

      if (dbError) throw dbError;

      const formattedPhone = formatPhoneNumber(customer.phone);

      // إرسال OTP عبر WhatsApp
      const response = await fetch("https://api.ultramsg.com/instance157134/messages/chat", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token: "8cmlm9zr0ildffsu",
          to: formattedPhone,
          body: `رمز تأكيد طلب التوريد: ${otp}\nصالح 10 دقائق\nMTS`
        })
      });

      if (response.ok) {
        setShowOTP(true);
        toast({ title: 'تم إرسال رمز التأكيد إلى الواتساب.' });
      } else {
        throw new Error('فشل إرسال رسالة الواتساب');
      }

    } catch (e) {
      console.error('OTP Error:', e);
      toast({ variant: 'destructive', title: 'خطأ في إرسال الرمز', description: 'حدث خطأ أثناء محاولة إرسال رمز التحقق.' });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (otpCode.length !== 6) {
      toast({ variant: 'destructive', title: 'رمز التأكيد غير صحيح', description: 'الرجاء إدخال الرمز المكون من 6 أرقام.' });
      return;
    }
    setSubmitting(true);
    try {
      // التحقق من OTP
      const { data: otpRecord, error: otpError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('phone', customer.phone)
        .eq('otp_code', otpCode)
        .eq('user_type', 'warehouse_order')
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (otpError || !otpRecord) {
        toast({ variant: 'destructive', title: 'رمز خاطئ أو منتهي', description: 'الرجاء التحقق من الرمز والمحاولة مرة أخرى.' });
        setSubmitting(false);
        return;
      }

      // تحديد OTP كمستخدم
      await supabase.from('otp_codes').update({ is_used: true }).eq('id', otpRecord.id);

      // إنشاء الطلب
      const { data: orderData, error } = await supabase
        .from('supply_orders')
        .insert([
          {
            customer_id: customer.id,
            order_type: 'warehouse_supply',
            ...formData,
            status: 'pending',
            total_items: cart.reduce((sum, item) => sum + item.quantity, 0),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // حفظ تفاصيل المنتجات في الملاحظات
      const itemsListText = cart.map(item => `- ${item.product_name} (${item.quantity} ${item.unit})`).join('\n');
      await supabase.from('supply_orders').update({
        notes: (formData.notes || '') + '\n\n--- المنتجات المطلوبة ---\n' + itemsListText
      }).eq('id', orderData.id);

      // إرسال SMS للمدير
      const msg = `طلب توريد مستودع جديد\nمن: ${customer.customer_name}\nرقم الطلب: ${orderData.order_number}\nالفعالية: ${formData.event_name}\nالتاريخ: ${formData.event_date}\n\nالمنتجات:\n${cart.map(i => `${i.product_name}: ${i.quantity}`).join(', ')}`;
      
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

      toast({
        title: 'تم إرسال الطلب بنجاح!',
        description: `رقم طلبك هو: ${orderData.order_number}. سيتم مراجعته والتواصل معك قريبا.`,
        className: "bg-green-50 border-green-200 text-green-800"
      });
      navigate('/customer-portal/my-orders');
    } catch (e) {
      console.error("Submission error:", e);
      toast({
        variant: 'destructive',
        title: 'خطأ في إرسال الطلب',
        description: e.message || 'حدث خطأ غير متوقع. الرجاء المحاولة لاحقا.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CustomerLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shadow-sm border border-blue-200">
              <Package className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">طلب توريد من المستودع</h1>
              <p className="text-gray-500 text-sm">طلب المنتجات والمعدات اللازمة لفعالياتك</p>
            </div>
          </div>
        </div>

        <Alert className="bg-blue-50 border-blue-200 text-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            الكميات المعروضة هي للطلب فقط وسيتم تأكيد توفرها بعد مراجعة الطلب من قبل إدارة المستودع.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* بيانات الفعالية */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg text-gray-800">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  بيانات الفعالية
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اسم الفعالية / المشروع <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <FileText className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    <Input 
                      className="pr-9" 
                      value={formData.event_name} 
                      onChange={(e) => setFormData({...formData, event_name: e.target.value})} 
                      placeholder="مثال: فعالية يوم الوطن" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>تاريخ التوريد المطلوب <span className="text-red-500">*</span></Label>
                  <Input 
                    type="date" 
                    value={formData.event_date} 
                    onChange={(e) => setFormData({...formData, event_date: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>وقت التوريد</Label>
                  <Input 
                    type="time" 
                    value={formData.event_time} 
                    onChange={(e) => setFormData({...formData, event_time: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>المدينة</Label>
                  <div className="relative">
                     <MapPin className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                     <Input 
                       className="pr-9"
                       value={formData.city} 
                       onChange={(e) => setFormData({...formData, city: e.target.value})} 
                       placeholder="الرياض"
                     />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>الموقع (الملعب، القاعة)</Label>
                  <Input value={formData.stadium} onChange={(e) => setFormData({...formData, stadium: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>اسم مسؤول الاستلام</Label>
                  <div className="relative">
                     <User className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                     <Input 
                       className="pr-9"
                       value={formData.supervisor_name} 
                       onChange={(e) => setFormData({...formData, supervisor_name: e.target.value})} 
                     />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>رقم جوال مسؤول الاستلام</Label>
                  <div className="relative">
                     <Phone className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                     <Input 
                       className="pr-9 text-left" 
                       dir="ltr"
                       value={formData.supervisor_phone} 
                       onChange={(e) => setFormData({...formData, supervisor_phone: e.target.value})} 
                       placeholder="05xxxxxxxx"
                     />
                  </div>
                </div>
                <div className="col-span-full space-y-2">
                  <Label>ملاحظات إضافية</Label>
                  <Textarea 
                    className="min-h-[80px]" 
                    value={formData.notes} 
                    onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                    placeholder="أي تعليمات خاصة بالتسليم أو المنتجات..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* المنتجات */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">المنتجات المطلوبة</h2>
                <div className="relative w-64">
                   <Input
                    type="text"
                    placeholder="بحث عن منتج..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>
              
              <div className="space-y-6">
                {Object.keys(groupedProducts).length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                      <p className="text-gray-500">لا توجد منتجات تطابق بحثك</p>
                    </div>
                ) : (
                  Object.entries(groupedProducts).map(([category, items]) => (
                    <div key={category} className="space-y-3">
                      <h3 className="font-bold text-gray-700 pr-2 border-r-4 border-blue-500">{category}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {items.map(product => (
                          <Card 
                            key={product.id} 
                            className={`transition-all duration-200 hover:shadow-md border ${getCartQuantity(product.id) ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/30' : 'border-gray-200 bg-white'}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3 mb-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Package className="w-5 h-5 text-gray-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-gray-900 text-sm truncate">{product.product_name}</h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">{product.product_code}</span>
                                    <span className="text-[10px] text-gray-500">{product.unit}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  className="h-9 text-center font-bold"
                                  value={getCartQuantity(product.id)}
                                  onChange={(e) => handleQuantityChange(product, e.target.value)}
                                />
                                {getCartQuantity(product.id) > 0 && (
                                  <div className="bg-blue-100 text-blue-700 p-2 rounded-lg flex-shrink-0 animate-in zoom-in duration-200">
                                    <CheckCircle2 className="w-5 h-5" />
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* السلة */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <Card className="shadow-lg border-t-4 border-t-blue-600">
                <CardHeader className="bg-white border-b pb-4">
                  <CardTitle className="flex items-center gap-2 text-gray-800">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                    ملخص الطلب
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full mr-auto">
                      {cart.reduce((a, b) => a + b.quantity, 0)} قطعة
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[40vh] overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">السلة فارغة. ابدأ بإضافة المنتجات.</p>
                      </div>
                    ) : (
                      cart.map((item, i) => (
                        <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100 group hover:border-blue-200 transition-colors">
                          <div>
                            <p className="font-bold text-sm text-gray-800">{item.product_name}</p>
                            <p className="text-xs text-blue-600 font-medium">{item.quantity} {item.unit}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-gray-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 rounded-full" 
                            onClick={() => removeFromCart(item.product_id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {cart.length > 0 && (
                    <div className="p-4 border-t bg-gray-50 rounded-b-lg">
                      {!showOTP ? (
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-bold shadow-sm" 
                          onClick={sendOTP} 
                          disabled={otpLoading}
                        >
                          {otpLoading ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Send className="w-5 h-5 ml-2" />}
                          {otpLoading ? 'جاري إرسال الرمز...' : 'إرسال الطلب'}
                        </Button>
                      ) : (
                        <div className="space-y-3 animate-in slide-in-from-bottom-2">
                          <div className="space-y-1 text-center">
                            <Label className="text-xs text-gray-500">تم إرسال رمز التحقق إلى الواتساب</Label>
                            <Input
                              type="tel"
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="000000"
                              className="text-center font-mono text-xl h-12 tracking-widest bg-white border-blue-200 focus:border-blue-500"
                              maxLength={6}
                              autoFocus
                            />
                          </div>
                          <Button 
                            className="w-full bg-green-600 hover:bg-green-700 h-12 text-base font-bold shadow-sm" 
                            onClick={handleSubmit} 
                            disabled={submitting || otpCode.length !== 6}
                          >
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <CheckCircle2 className="w-5 h-5 ml-2" />}
                            تأكيد الطلب
                          </Button>
                          <Button 
                            variant="ghost" 
                            className="w-full text-xs text-gray-400 hover:text-gray-600 h-8"
                            onClick={() => setShowOTP(false)}
                          >
                            تغيير رقم الجوال أو إعادة المحاولة
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default WarehouseOrder;