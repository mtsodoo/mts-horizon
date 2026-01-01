
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
import { MoreHorizontal, Calendar, Send, Loader2, FileText, Sparkles, Wrench, Megaphone, Printer } from 'lucide-react';

const OtherOrders = () => {
  const { customer } = useCustomerAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [submitting, setSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [formData, setFormData] = useState({ event_name: '', event_date: '', description: '', special_requirements: '', contact_name: '', contact_phone: '' });

  const requestTypes = [
    { id: 'printing', title: 'طباعة وتصميم', description: 'بنرات، لوحات، ملصقات', icon: Printer, color: 'bg-blue-100 text-blue-600' },
    { id: 'event_setup', title: 'تجهيز فعاليات', description: 'ديكورات، مسرح، إضاءة', icon: Sparkles, color: 'bg-purple-100 text-purple-600' },
    { id: 'technical', title: 'خدمات فنية', description: 'صوتيات، شاشات، كاميرات', icon: Wrench, color: 'bg-orange-100 text-orange-600' },
    { id: 'marketing', title: 'تسويق وإعلان', description: 'حملات، محتوى', icon: Megaphone, color: 'bg-green-100 text-green-600' },
    { id: 'other', title: 'أخرى', description: 'طلبات خاصة', icon: FileText, color: 'bg-gray-100 text-gray-600' }
  ];

  const handleSubmit = async () => {
    if (!selectedType || !formData.description) { toast({ variant: 'destructive', title: 'بيانات ناقصة', description: 'اختر النوع واكتب الوصف' }); return; }
    setSubmitting(true);
    try {
      const { data: orderData, error } = await supabase.from('supply_orders').insert([{ customer_id: customer.id, order_type: 'special_request', request_subtype: selectedType, event_name: formData.event_name || `طلب ${requestTypes.find(t => t.id === selectedType)?.title}`, event_date: formData.event_date || null, notes: formData.description, special_requirements: formData.special_requirements, supervisor_name: formData.contact_name, supervisor_phone: formData.contact_phone, status: 'pending' }]).select().single();
      if (error) throw error;

      const msg = `📝 طلب خاص جديد\n${customer.customer_name}\n${orderData.order_number}\nالنوع: ${requestTypes.find(t => t.id === selectedType)?.title}\n\n${formData.description}`;
      await fetch('https://api.oursms.com/api-a/msgs', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: 'n68E8CISvil58edsg-RE', src: 'MTS', dests: '966539755999', body: msg }) });

      toast({ title: '✅ تم إرسال الطلب', description: orderData.order_number });
      navigate('/customer-portal/my-orders');
    } catch (e) { toast({ variant: 'destructive', title: 'خطأ', description: e.message }); }
    finally { setSubmitting(false); }
  };

  return (
    <CustomerLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center"><MoreHorizontal className="w-6 h-6 text-purple-600" /></div>
          <div><h1 className="text-2xl font-bold">طلبات أخرى</h1><p className="text-gray-500">خدمات خاصة وطلبات مخصصة</p></div>
        </div>

        <Card>
          <CardHeader><CardTitle>اختر نوع الخدمة</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {requestTypes.map(type => (
                <button key={type.id} onClick={() => setSelectedType(type.id)} className={`p-4 rounded-xl border-2 text-right transition-all ${selectedType === type.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className={`w-10 h-10 rounded-lg ${type.color} flex items-center justify-center mb-2`}><type.icon className="w-5 h-5" /></div>
                  <h3 className="font-bold text-gray-900">{type.title}</h3>
                  <p className="text-xs text-gray-500">{type.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedType && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-purple-600" />تفاصيل الطلب</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>اسم المشروع</Label><Input value={formData.event_name} onChange={(e) => setFormData({...formData, event_name: e.target.value})} /></div>
                <div><Label>التاريخ المطلوب</Label><Input type="date" value={formData.event_date} onChange={(e) => setFormData({...formData, event_date: e.target.value})} /></div>
              </div>
              <div><Label>وصف الطلب *</Label><Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="اشرح بالتفصيل..." rows={4} /></div>
              <div><Label>متطلبات خاصة</Label><Textarea value={formData.special_requirements} onChange={(e) => setFormData({...formData, special_requirements: e.target.value})} rows={2} /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>اسم المسؤول</Label><Input value={formData.contact_name} onChange={(e) => setFormData({...formData, contact_name: e.target.value})} /></div>
                <div><Label>رقم الجوال</Label><Input value={formData.contact_phone} onChange={(e) => setFormData({...formData, contact_phone: e.target.value})} dir="ltr" /></div>
              </div>
              <Button className="w-full bg-purple-600 hover:bg-purple-700 h-12" onClick={handleSubmit} disabled={submitting}>{submitting ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Send className="w-5 h-5 ml-2" />}{submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </CustomerLayout>
  );
};

export default OtherOrders;
