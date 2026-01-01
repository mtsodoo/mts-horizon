import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerLayout from '@/components/CustomerPortal/CustomerLayout';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Users, Send, Loader2, Minus, Plus, Flag, Award, Scroll, Shirt, HardHat, Mic, Drum, Battery, Droplets } from 'lucide-react';

const PRODUCTS = [
  // شالات
  { id: 1, name: 'شال أحمر', category: 'شالات', icon: Award, color: '#dc3545', image: null },
  { id: 2, name: 'شال أصفر', category: 'شالات', icon: Award, color: '#ffc107', image: null },
  { id: 26, name: 'شال VIP', category: 'شالات', icon: Award, color: '#5bc0de', image: null },
  // أعلام
  { id: 3, name: 'أعلام حمراء', category: 'أعلام', icon: Flag, color: '#dc3545', image: null },
  { id: 4, name: 'أعلام صفراء', category: 'أعلام', icon: Flag, color: '#ffc107', image: null },
  { id: 5, name: 'أعلام يابانية', category: 'أعلام', icon: Flag, color: '#dc3545', image: null },
  // بنرات
  { id: 6, name: 'بانر عريض إنجليزي', category: 'بنرات', icon: Scroll, color: '#5bc0de', image: null },
  { id: 7, name: 'بانر عريض عربي', category: 'بنرات', icon: Scroll, color: '#5bc0de', image: null },
  // تيشيرتات
  { id: 8, name: 'تيشيرتات صفراء', category: 'تيشيرتات', icon: Shirt, color: '#ffc107', image: null },
  { id: 9, name: 'تيشيرتات حمراء', category: 'تيشيرتات', icon: Shirt, color: '#dc3545', image: null },
  { id: 10, name: 'تيشيرت مشرفين', category: 'تيشيرتات', icon: Shirt, color: '#5bc0de', image: null },
  // قبعات
  { id: 11, name: 'قبعات صفراء', category: 'قبعات', icon: HardHat, color: '#ffc107', image: null },
  { id: 12, name: 'قبعات حمراء', category: 'قبعات', icon: HardHat, color: '#dc3545', image: null },
  // مايكات
  { id: 14, name: 'مايك لاسلكي صغير', category: 'مايكات', icon: Mic, color: '#5bc0de', image: null },
  // طبول
  { id: 17, name: 'طبل صغير', category: 'طبول', icon: Drum, color: '#5bc0de', image: null },
  { id: 18, name: 'طبل متوسط', category: 'طبول', icon: Drum, color: '#5bc0de', image: null },
  // بطاريات
  { id: 20, name: 'بطاريات صغيرة AA', category: 'بطاريات', icon: Battery, color: '#5bc0de', image: null },
  // مياه
  { id: 23, name: 'مياه صغيرة 250 مل', category: 'مياه شرب', icon: Droplets, color: '#5bc0de', image: null },
];

const CITIES = ['الرياض','جدة','الدمام','مكة المكرمة','المدينة المنورة','الخبر','الطائف','بريدة','تبوك','خميس مشيط','حائل','الجبيل','نجران','ينبع','الأحساء'];

const FansOrder = () => {
  const { customer } = useCustomerAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [submitting, setSubmitting] = useState(false);
  const [cart, setCart] = useState({});
  const [form, setForm] = useState({ match_info: '', delivery_date: '', delivery_time: '', city: '', stadium: '', supervisor_phone: '' });

  const categories = [...new Set(PRODUCTS.map(p => p.category))];
  const updateQty = (id, delta) => setCart(prev => {
    const qty = Math.max(0, Math.min(7000, (prev[id] || 0) + delta));
    if (qty === 0) { const {[id]: _, ...rest} = prev; return rest; }
    return { ...prev, [id]: qty };
  });
  const totalItems = Object.values(cart).reduce((s, q) => s + q, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.delivery_date || !form.delivery_time || !form.city || !form.stadium || !form.supervisor_phone) {
      toast({ variant: 'destructive', title: 'أكمل جميع الحقول المطلوبة' }); return;
    }
    if (totalItems === 0) { toast({ variant: 'destructive', title: 'اختر منتج واحد على الأقل' }); return; }

    setSubmitting(true);
    try {
      const orderNumber = 'FS' + Date.now() + Math.floor(Math.random() * 1000);
      const items = Object.entries(cart).map(([id, qty]) => {
        const p = PRODUCTS.find(x => x.id === parseInt(id));
        return { product_id: parseInt(id), product_name: p.name, category: p.category, quantity: qty };
      });

      // حفظ الطلب
      const { data: order, error } = await supabase.from('fans_orders').insert([{
        order_number: orderNumber,
        customer_id: customer?.id,
        customer_name: customer?.customer_name,
        customer_phone: customer?.phone,
        match_info: form.match_info,
        delivery_date: form.delivery_date,
        delivery_time: form.delivery_time,
        city: form.city,
        stadium: form.stadium,
        supervisor_phone: form.supervisor_phone,
        total_items: totalItems,
        status: 'pending'
      }]).select().single();

      if (error) throw error;

      // حفظ التفاصيل
      await supabase.from('fans_order_items').insert(items.map(item => ({ order_id: order.id, ...item })));

      // SMS
      const msg = `🎯 طلب أدوات تشجيع\n📋 ${orderNumber}\n👤 ${customer?.customer_name}\n📅 ${form.delivery_date} ${form.delivery_time}\n🏟️ ${form.stadium}\n📦 ${totalItems} قطعة`;
      await fetch('https://api.oursms.com/api-a/msgs', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: 'n68E8CISvil58edsg-RE', src: 'MTS', dests: '539755999', body: msg }) });
      await fetch('https://api.oursms.com/api-a/msgs', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: 'n68E8CISvil58edsg-RE', src: 'MTS', dests: '506940117', body: msg }) });

      toast({ title: '✅ تم إرسال الطلب بنجاح', description: `رقم الطلب: ${orderNumber}` });
      navigate('/customer-portal/my-orders');
    } catch (e) { toast({ variant: 'destructive', title: 'خطأ', description: e.message }); }
    finally { setSubmitting(false); }
  };

  return (
    <CustomerLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center"><Users className="w-6 h-6 text-amber-600" /></div>
          <div><h1 className="text-2xl font-bold">طلب أدوات التشجيع</h1><p className="text-gray-500">للمباريات والفعاليات</p></div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader><CardTitle>بيانات التسليم</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><Label>معلومات المباراة</Label><Input placeholder="السعودية vs اليابان" value={form.match_info} onChange={e => setForm({...form, match_info: e.target.value})} /></div>
              <div><Label className="text-red-600">تاريخ التسليم *</Label><Input type="date" min={new Date().toISOString().split('T')[0]} value={form.delivery_date} onChange={e => setForm({...form, delivery_date: e.target.value})} required /></div>
              <div><Label className="text-red-600">وقت التسليم *</Label><Input type="time" value={form.delivery_time} onChange={e => setForm({...form, delivery_time: e.target.value})} required /></div>
              <div><Label className="text-red-600">المدينة *</Label>
                <select className="w-full h-10 px-3 border rounded-md" value={form.city} onChange={e => setForm({...form, city: e.target.value})} required>
                  <option value="">اختر</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><Label className="text-red-600">الملعب/المكان *</Label><Input placeholder="ملعب الملك فهد" value={form.stadium} onChange={e => setForm({...form, stadium: e.target.value})} required /></div>
              <div><Label className="text-red-600">رقم المستلم *</Label><Input type="tel" placeholder="05xxxxxxxx" dir="ltr" value={form.supervisor_phone} onChange={e => setForm({...form, supervisor_phone: e.target.value})} required /></div>
            </CardContent>
          </Card>

          {categories.map(cat => (
            <div key={cat} className="mb-6">
              <h3 className="text-lg font-bold mb-3 bg-gray-100 p-3 rounded-lg">{cat}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {PRODUCTS.filter(p => p.category === cat).map(p => (
                  <Card key={p.id} className={cart[p.id] ? 'ring-2 ring-amber-500 bg-amber-50' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.color }}><p.icon className="w-5 h-5 text-white" /></div>
                        )}
                        <span className="font-medium text-sm">{p.name}</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(p.id, -1)}><Minus className="w-4 h-4" /></Button>
                        <Input type="number" className="w-16 text-center h-8" value={cart[p.id] || ''} onChange={e => setCart(prev => ({...prev, [p.id]: Math.max(0, parseInt(e.target.value) || 0)}))} placeholder="0" />
                        <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(p.id, 1)}><Plus className="w-4 h-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 flex justify-between items-center">
              <span className="font-bold text-lg">إجمالي: {totalItems} قطعة</span>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={submitting || totalItems === 0}>
                {submitting ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Send className="w-5 h-5 ml-2" />}
                إرسال الطلب
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </CustomerLayout>
  );
};

export default FansOrder;