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
import { Warehouse, Trash2, ShoppingCart, CheckCircle2, Calendar, User, Send, Loader2, Package, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const WarehouseOrder = () => {
  const { customer } = useCustomerAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [formData, setFormData] = useState({ event_name: '', event_date: '', event_time: '', city: '', stadium: '', supervisor_name: '', supervisor_phone: '', notes: '' });
  const [cart, setCart] = useState([]);
  const [showOTP, setShowOTP] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('inventory_products').select('*').eq('is_active', true).order('category');
      if (error) throw error;
      setProducts(data || []);
      setCategories(['All', ...new Set(data.map(p => p.category).filter(Boolean))]);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const handleQuantityChange = (product, quantity) => {
    const qty = parseInt(quantity) || 0;
    if (qty <= 0) { setCart(prev => prev.filter(item => item.product_id !== product.id)); return; }
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) return prev.map(item => item.product_id === product.id ? { ...item, quantity: qty } : item);
      return [...prev, { product_id: product.id, product_name: product.product_name, unit: product.unit, quantity: qty }];
    });
  };

  const removeFromCart = (productId) => setCart(prev => prev.filter(item => item.product_id !== productId));
  const getCartQuantity = (productId) => cart.find(i => i.product_id === productId)?.quantity || '';

  const sendOTP = async () => {
    if (!formData.event_name || !formData.event_date || cart.length === 0) { toast({ variant: 'destructive', title: 'بيانات ناقصة' }); return; }
    if (!formData.supervisor_name || !formData.supervisor_phone) { toast({ variant: 'destructive', title: 'أدخل بيانات المشرف' }); return; }
    setOtpLoading(true);
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await supabase.from('otp_codes').insert({ phone: customer.phone, otp_code: otp, user_type: 'order_confirm', expires_at: new Date(Date.now() + 600000).toISOString() });
      await fetch('https://api.oursms.com/api-a/msgs', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: 'n68E8CISvil58edsg-RE', src: 'MTS', dests: customer.phone, body: `رمز تأكيد الطلب: ${otp}\nMTS` }) });
      setShowOTP(true);
      toast({ title: 'تم إرسال رمز التأكيد' });
    } catch (e) { toast({ variant: 'destructive', title: 'خطأ' }); }
    finally { setOtpLoading(false); }
  };

  const handleSubmit = async () => {
    if (otpCode.length !== 6) { toast({ variant: 'destructive', title: 'رمز التأكيد 6 أرقام' }); return; }
    setSubmitting(true);
    try {
      const { data: otpRecord } = await supabase.from('otp_codes').select('*').eq('phone', customer.phone).eq('otp_code', otpCode).eq('user_type', 'order_confirm').eq('is_used', false).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1).single();
      if (!otpRecord) { toast({ variant: 'destructive', title: 'رمز خاطئ أو منتهي' }); setSubmitting(false); return; }
      await supabase.from('otp_codes').update({ is_used: true }).eq('id', otpRecord.id);
      
      const { data: orderData, error } = await supabase.from('supply_orders').insert([{ customer_id: customer.id, order_type: 'warehouse', ...formData, status: 'pending', total_items: cart.reduce((s, i) => s + i.quantity, 0) }]).select().single();
      if (error) throw error;
      
      await supabase.from('supply_order_items').insert(cart.map(item => ({ order_id: orderData.id, product_id: item.product_id, product_name: item.product_name, unit: item.unit, quantity_requested: item.quantity })));
      
      const msg = `📦 طلب مستودع جديد\n${customer.customer_name}\n${orderData.order_number}\n${formData.event_name}\n${formData.event_date}`;
      await fetch('https://api.oursms.com/api-a/msgs', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: 'n68E8CISvil58edsg-RE', src: 'MTS', dests: '966539755999', body: msg }) });
      
      toast({ title: '✅ تم إرسال الطلب', description: orderData.order_number });
      navigate('/customer-portal/my-orders');
    } catch (e) { toast({ variant: 'destructive', title: 'خطأ', description: e.message }); }
    finally { setSubmitting(false); }
  };

  const filteredProducts = selectedCategory === 'All' ? products : products.filter(p => p.category === selectedCategory);

  return (
    <CustomerLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center"><Warehouse className="w-6 h-6 text-teal-600" /></div>
          <div><h1 className="text-2xl font-bold">طلب من المستودع</h1><p className="text-gray-500">اختر المنتجات وحدد تفاصيل الفعالية</p></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-teal-600" />بيانات الفعالية</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>اسم الفعالية *</Label><Input value={formData.event_name} onChange={(e) => setFormData({...formData, event_name: e.target.value})} /></div>
                <div><Label>التاريخ *</Label><Input type="date" value={formData.event_date} onChange={(e) => setFormData({...formData, event_date: e.target.value})} /></div>
                <div><Label>الوقت</Label><Input type="time" value={formData.event_time} onChange={(e) => setFormData({...formData, event_time: e.target.value})} /></div>
                <div><Label>المدينة</Label><Input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} /></div>
                <div className="col-span-full"><Label>الملعب</Label><Input value={formData.stadium} onChange={(e) => setFormData({...formData, stadium: e.target.value})} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-teal-600" />بيانات المشرف</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>اسم المشرف *</Label><Input value={formData.supervisor_name} onChange={(e) => setFormData({...formData, supervisor_name: e.target.value})} /></div>
                <div><Label>رقم الجوال *</Label><Input value={formData.supervisor_phone} onChange={(e) => setFormData({...formData, supervisor_phone: e.target.value})} dir="ltr" /></div>
                <div className="col-span-full"><Label>ملاحظات</Label><Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} /></div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><Package className="w-5 h-5 text-teal-600" />المنتجات</h2>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map(cat => (<Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} onClick={() => setSelectedCategory(cat)} className={selectedCategory === cat ? "bg-teal-600" : ""} size="sm">{cat === 'All' ? 'الكل' : cat}</Button>))}
              </div>
              {loading ? <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-600" /></div> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredProducts.map(product => (
                    <Card key={product.id} className={getCartQuantity(product.id) ? 'ring-2 ring-teal-500 bg-teal-50/30' : ''}>
                      <CardContent className="p-4">
                        <div className="flex justify-between mb-3"><div><h3 className="font-bold">{product.product_name}</h3><p className="text-xs text-gray-500">{product.category}</p></div><span className="text-xs bg-gray-100 px-2 py-1 rounded">{product.unit}</span></div>
                        <div className="flex items-center gap-2">
                          <Input type="number" min="0" placeholder="الكمية" value={getCartQuantity(product.id)} onChange={(e) => handleQuantityChange(product, e.target.value)} />
                          {getCartQuantity(product.id) > 0 && <div className="bg-teal-100 text-teal-700 p-2 rounded-lg"><CheckCircle2 className="w-5 h-5" /></div>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-4 shadow-lg">
              <CardHeader className="bg-teal-600 text-white rounded-t-lg"><CardTitle className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" />ملخص الطلب</CardTitle></CardHeader>
              <CardContent className="p-4 max-h-[50vh] overflow-y-auto">
                {cart.length === 0 ? <div className="text-center py-8 text-gray-400"><ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" /><p>السلة فارغة</p></div> : (
                  <div className="space-y-3">{cart.map((item, i) => (<div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"><div><p className="font-medium text-sm">{item.product_name}</p><p className="text-xs text-gray-500">{item.quantity} {item.unit}</p></div><Button variant="ghost" size="icon" className="text-red-400 h-8 w-8" onClick={() => removeFromCart(item.product_id)}><Trash2 className="w-4 h-4" /></Button></div>))}</div>
                )}
              </CardContent>
              {cart.length > 0 && (
                <div className="p-4 border-t space-y-4">
                  <div className="flex justify-between text-sm"><span>عدد الأصناف:</span><span className="font-bold text-teal-600">{cart.length}</span></div>
                  <div className="flex justify-between text-sm"><span>إجمالي القطع:</span><span className="font-bold text-teal-600">{cart.reduce((s, i) => s + i.quantity, 0)}</span></div>
                  {!showOTP ? (
                    <Button className="w-full bg-teal-600 hover:bg-teal-700 h-12" onClick={sendOTP} disabled={otpLoading}>{otpLoading ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Send className="w-5 h-5 ml-2" />}{otpLoading ? 'جاري الإرسال...' : 'تأكيد وإرسال'}</Button>
                  ) : (
                    <div className="space-y-3">
                      <Alert className="bg-amber-50 border-amber-200"><AlertCircle className="h-4 w-4 text-amber-600" /><AlertDescription className="text-amber-700 text-sm">تم إرسال رمز التأكيد</AlertDescription></Alert>
                      <Input type="tel" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="رمز التأكيد" className="text-center font-mono text-xl h-12" maxLength={6} />
                      <Button className="w-full bg-green-600 hover:bg-green-700 h-12" onClick={handleSubmit} disabled={submitting || otpCode.length !== 6}>{submitting ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <CheckCircle2 className="w-5 h-5 ml-2" />}{submitting ? 'جاري الإرسال...' : 'تأكيد الطلب'}</Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default WarehouseOrder;