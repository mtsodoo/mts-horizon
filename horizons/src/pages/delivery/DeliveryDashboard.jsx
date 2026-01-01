import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Truck, Package, Clock, CheckCircle, LogOut, MapPin, Phone, Calendar, Loader2, ChevronDown, ChevronUp, AlertCircle, RefreshCw, ClipboardCheck, Camera, RotateCcw, AlertTriangle, PackageCheck } from 'lucide-react';

const ORDER_STATUS = {
  pending: { label: 'في الانتظار', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'معتمد', color: 'bg-blue-100 text-blue-800' },
  preparing: { label: 'جاري التجهيز', color: 'bg-indigo-100 text-indigo-800' },
  dispatched: { label: 'في الطريق', color: 'bg-purple-100 text-purple-800' },
  delivered: { label: 'تم التسليم', color: 'bg-green-100 text-green-800' },
  returned: { label: 'تم الإرجاع', color: 'bg-gray-100 text-gray-800' }
};

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [staff, setStaff] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [photoModal, setPhotoModal] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [confirmForm, setConfirmForm] = useState({ recipient_name: '', confirmation_code: '' });
  const [returnModal, setReturnModal] = useState(null);
  const [returnForm, setReturnForm] = useState({ damaged_items: '', missing_items: '', notes: '' });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const session = sessionStorage.getItem('deliverySession');
    if (!session) { navigate('/delivery/login'); return; }
    setStaff(JSON.parse(session));
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [navigate]);

  const fetchOrders = async () => {
    try {
      const { data } = await supabase.from('supply_orders').select('*, supply_order_items(*), supply_order_photos(*)').in('status', ['approved', 'preparing', 'dispatched', 'delivered', 'returned']).order('event_date');
      setOrders(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleLogout = () => { sessionStorage.removeItem('deliverySession'); navigate('/delivery/login'); };

  const updateStatus = async (orderId, newStatus) => {
    try {
      await supabase.from('supply_orders').update({ status: newStatus, [`${newStatus}_at`]: new Date().toISOString() }).eq('id', orderId);
      setSuccess('تم تحديث الحالة');
      fetchOrders();
      if (newStatus === 'preparing') setPhotoModal({ orderId, type: 'loading' });
    } catch (e) { setError('فشل التحديث'); }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !photoModal) return;
    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        await supabase.from('supply_order_photos').insert({ order_id: photoModal.orderId, photo_type: photoModal.type, photo_url: reader.result, uploaded_by: staff.id });
        setSuccess('تم رفع الصورة');
        fetchOrders();
        setPhotoModal(null);
      };
      reader.readAsDataURL(file);
    } catch (e) { setError('فشل الرفع'); }
    finally { setUploadingPhoto(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const sendDeliveryOTP = async (order) => {
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await supabase.from('otp_codes').insert({ phone: order.supervisor_phone, otp_code: otp, user_type: 'delivery_confirm', expires_at: new Date(Date.now() + 1800000).toISOString() });
      await fetch('https://api.oursms.com/api-a/msgs', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: 'n68E8CISvil58edsg-RE', src: 'MTS', dests: order.supervisor_phone, body: `🔐 رمز تأكيد الاستلام: ${otp}\nطلب: ${order.order_number}\nMTS` }) });
      setSuccess('تم إرسال الرمز للمستلم');
      setConfirmModal(order);
      setConfirmForm({ recipient_name: order.supervisor_name || '', confirmation_code: '' });
    } catch (e) { setError('فشل إرسال الرمز'); }
  };

  const handleConfirmDelivery = async () => {
    if (!confirmForm.recipient_name || confirmForm.confirmation_code.length !== 6) { setError('أدخل البيانات'); return; }
    setConfirmLoading(true);
    try {
      const { data: otpRecord } = await supabase.from('otp_codes').select('*').eq('phone', confirmModal.supervisor_phone).eq('otp_code', confirmForm.confirmation_code).eq('user_type', 'delivery_confirm').eq('is_used', false).gt('expires_at', new Date().toISOString()).single();
      if (!otpRecord) { setError('رمز خاطئ'); setConfirmLoading(false); return; }
      await supabase.from('otp_codes').update({ is_used: true }).eq('id', otpRecord.id);
      await supabase.from('supply_orders').update({ status: 'delivered', delivered_at: new Date().toISOString(), recipient_name: confirmForm.recipient_name }).eq('id', confirmModal.id);
      await supabase.from('supply_order_confirmations').insert({ order_id: confirmModal.id, confirmation_type: 'delivery', confirmed_by: staff.id, recipient_name: confirmForm.recipient_name, confirmation_code: confirmForm.confirmation_code });
      setSuccess('تم تأكيد التسليم');
      setConfirmModal(null);
      fetchOrders();
      setPhotoModal({ orderId: confirmModal.id, type: 'delivery' });
    } catch (e) { setError('فشل التأكيد'); }
    finally { setConfirmLoading(false); }
  };

  const handleConfirmReturn = async () => {
    setConfirmLoading(true);
    try {
      await supabase.from('supply_orders').update({ status: 'returned', returned_at: new Date().toISOString(), damaged_items: returnForm.damaged_items, missing_items: returnForm.missing_items }).eq('id', returnModal.id);
      if (returnForm.damaged_items || returnForm.missing_items) {
        await fetch('https://api.oursms.com/api-a/msgs', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: 'n68E8CISvil58edsg-RE', src: 'MTS', dests: '966539755999', body: `⚠️ مرتجعات\n${returnModal.order_number}\nتالف: ${returnForm.damaged_items || 'لا'}\nناقص: ${returnForm.missing_items || 'لا'}` }) });
      }
      setSuccess('تم تأكيد الإرجاع');
      setReturnModal(null);
      fetchOrders();
      setPhotoModal({ orderId: returnModal.id, type: 'return' });
    } catch (e) { setError('فشل'); }
    finally { setConfirmLoading(false); }
  };

  const filteredOrders = orders.filter(o => activeTab === 'active' ? ['approved', 'preparing', 'dispatched'].includes(o.status) : activeTab === 'delivered' ? o.status === 'delivered' : o.status === 'returned');

  if (!staff) return null;

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <header className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3"><Truck className="w-8 h-8" /><div><h1 className="font-bold">بوابة المندوبين</h1><p className="text-xs opacity-75">{staff.name}</p></div></div>
          <div className="flex gap-2">
            <button onClick={fetchOrders} className="bg-white/10 p-2 rounded-lg"><RefreshCw className="w-5 h-5" /></button>
            <button onClick={handleLogout} className="bg-white/10 px-3 py-2 rounded-lg text-sm"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <div className="bg-white border-b sticky top-16 z-40">
        <div className="max-w-4xl mx-auto flex">
          {[{ key: 'active', label: 'النشطة' }, { key: 'delivered', label: 'المسلمة' }, { key: 'returned', label: 'المرتجعات' }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === tab.key ? 'border-slate-700 text-slate-700' : 'border-transparent text-gray-500'}`}>{tab.label}</button>
          ))}
        </div>
      </div>

      {(error || success) && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-2">{error}<button onClick={() => setError('')} className="mr-auto">✕</button></div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-2">{success}<button onClick={() => setSuccess('')} className="mr-auto">✕</button></div>}
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div> : filteredOrders.length === 0 ? <div className="text-center py-12 bg-white rounded-xl"><Package className="w-16 h-16 mx-auto text-gray-300 mb-4" /><p>لا توجد طلبات</p></div> : (
          <div className="space-y-4">
            {filteredOrders.map(order => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 cursor-pointer" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2"><span className="font-bold">#{order.order_number}</span><span className={`px-2 py-0.5 rounded-full text-xs ${ORDER_STATUS[order.status]?.color}`}>{ORDER_STATUS[order.status]?.label}</span></div>
                      <h3 className="font-bold">{order.event_name}</h3>
                      <div className="flex gap-3 mt-2 text-sm text-gray-500"><span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{order.event_date}</span><span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{order.stadium || order.city}</span></div>
                    </div>
                    {expandedOrder === order.id ? <ChevronUp /> : <ChevronDown />}
                  </div>
                </div>

                {expandedOrder === order.id && (
                  <div className="border-t px-4 py-4 bg-gray-50 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm"><div><span className="text-gray-500">المشرف:</span><p className="font-medium">{order.supervisor_name}</p></div><a href={`tel:${order.supervisor_phone}`} className="text-blue-600 flex items-center gap-1"><Phone className="w-4 h-4" />{order.supervisor_phone}</a></div>
                    
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => setPhotoModal({ orderId: order.id, type: 'loading' })} className="flex-1 bg-indigo-100 text-indigo-700 py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-2"><Camera className="w-4 h-4" />صور التحميل</button>
                      {['dispatched', 'delivered'].includes(order.status) && <button onClick={() => setPhotoModal({ orderId: order.id, type: 'delivery' })} className="flex-1 bg-green-100 text-green-700 py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-2"><Camera className="w-4 h-4" />صور التسليم</button>}
                      {['delivered', 'returned'].includes(order.status) && <button onClick={() => setPhotoModal({ orderId: order.id, type: 'return' })} className="flex-1 bg-orange-100 text-orange-700 py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-2"><Camera className="w-4 h-4" />صور المرتجعات</button>}
                    </div>

                    {order.status === 'approved' && <button onClick={() => updateStatus(order.id, 'preparing')} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"><ClipboardCheck className="w-5 h-5" />بدء التجهيز</button>}
                    {order.status === 'preparing' && <button onClick={() => updateStatus(order.id, 'dispatched')} className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"><Truck className="w-5 h-5" />انطلاق للتوصيل</button>}
                    {order.status === 'dispatched' && <button onClick={() => sendDeliveryOTP(order)} className="w-full bg-green-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" />تأكيد التسليم</button>}
                    {order.status === 'delivered' && <button onClick={() => setReturnModal(order)} className="w-full bg-orange-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"><RotateCcw className="w-5 h-5" />استلام المرتجعات</button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {photoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className={`p-4 text-white rounded-t-xl ${photoModal.type === 'loading' ? 'bg-indigo-600' : photoModal.type === 'delivery' ? 'bg-green-600' : 'bg-orange-600'}`}><h2 className="text-lg font-bold flex items-center gap-2"><Camera className="w-6 h-6" />{photoModal.type === 'loading' ? 'صور التحميل' : photoModal.type === 'delivery' ? 'صور التسليم' : 'صور المرتجعات'}</h2></div>
            <div className="p-4 space-y-4">
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto} className="w-full border-2 border-dashed rounded-xl p-8">
                {uploadingPhoto ? <Loader2 className="w-12 h-12 animate-spin mx-auto" /> : <><Camera className="w-12 h-12 mx-auto text-gray-400" /><p className="mt-2">اضغط لفتح الكاميرا</p></>}
              </button>
              <button onClick={() => setPhotoModal(null)} className="w-full bg-gray-200 py-3 rounded-lg">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="bg-green-600 text-white p-4 rounded-t-xl"><h2 className="text-lg font-bold">تأكيد التسليم - #{confirmModal.order_number}</h2></div>
            <div className="p-4 space-y-4">
              {error && <div className="bg-red-50 text-red-700 p-2 rounded text-sm">{error}</div>}
              <div><label className="block text-sm font-medium mb-1">اسم المستلم *</label><input type="text" value={confirmForm.recipient_name} onChange={(e) => setConfirmForm({...confirmForm, recipient_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">رمز التأكيد *</label><input type="tel" value={confirmForm.confirmation_code} onChange={(e) => setConfirmForm({...confirmForm, confirmation_code: e.target.value.replace(/\D/g, '').slice(0, 6)})} placeholder="000000" maxLength={6} className="w-full px-4 py-3 border-2 rounded-lg text-center font-mono text-2xl tracking-widest" /><p className="text-xs text-gray-500 mt-1">اطلب الرمز من المستلم</p></div>
              <div className="flex gap-3"><button onClick={() => setConfirmModal(null)} className="flex-1 bg-gray-200 py-3 rounded-lg">إلغاء</button><button onClick={handleConfirmDelivery} disabled={confirmLoading} className="flex-1 bg-green-600 text-white py-3 rounded-lg">{confirmLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'تأكيد'}</button></div>
            </div>
          </div>
        </div>
      )}

      {returnModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="bg-orange-600 text-white p-4 rounded-t-xl"><h2 className="text-lg font-bold">استلام المرتجعات - #{returnModal.order_number}</h2></div>
            <div className="p-4 space-y-4">
              <div><label className="block text-sm font-medium mb-1"><AlertTriangle className="w-4 h-4 inline ml-1 text-amber-500" />أصناف تالفة</label><textarea value={returnForm.damaged_items} onChange={(e) => setReturnForm({...returnForm, damaged_items: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows={2} placeholder="مثال: 5 شالات متسخة" /></div>
              <div><label className="block text-sm font-medium mb-1">أصناف مفقودة</label><textarea value={returnForm.missing_items} onChange={(e) => setReturnForm({...returnForm, missing_items: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows={2} /></div>
              <div className="flex gap-3"><button onClick={() => setReturnModal(null)} className="flex-1 bg-gray-200 py-3 rounded-lg">إلغاء</button><button onClick={handleConfirmReturn} disabled={confirmLoading} className="flex-1 bg-orange-600 text-white py-3 rounded-lg flex items-center justify-center gap-2">{confirmLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <PackageCheck className="w-5 h-5" />}تأكيد الإرجاع</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
