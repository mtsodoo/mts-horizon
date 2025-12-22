// src/pages/delivery/DeliveryDashboard.jsx
// لوحة تحكم المندوب - إدارة التوصيلات

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { 
  Truck, Package, Clock, CheckCircle, XCircle, 
  LogOut, MapPin, Phone, User, Calendar,
  Loader2, ChevronDown, ChevronUp, AlertCircle,
  Send, RefreshCw, ClipboardCheck, Navigation
} from 'lucide-react';

// حالات الطلبات
const ORDER_STATUS = {
  pending: { label: 'في الانتظار', color: 'bg-yellow-100 text-yellow-800', nextAction: 'استلام الطلب' },
  assigned: { label: 'تم الاستلام', color: 'bg-blue-100 text-blue-800', nextAction: 'بدء التجهيز' },
  picked: { label: 'جاري التجهيز', color: 'bg-purple-100 text-purple-800', nextAction: 'تم الوصول' },
  arrived: { label: 'وصلت للعميل', color: 'bg-orange-100 text-orange-800', nextAction: 'تأكيد التسليم' },
  delivered: { label: 'تم التسليم', color: 'bg-green-100 text-green-800', nextAction: null },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-800', nextAction: null }
};

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  
  const [staff, setStaff] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // pending, in-progress, delivered
  
  // حالة تأكيد التسليم
  const [confirmingOrder, setConfirmingOrder] = useState(null);
  const [confirmForm, setConfirmForm] = useState({
    recipient_name: '',
    recipient_phone: '',
    confirmation_code: ''
  });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const session = sessionStorage.getItem('deliverySession');
    if (!session) {
      navigate('/delivery/login');
      return;
    }
    
    const staffData = JSON.parse(session);
    setStaff(staffData);
    fetchOrders();

    // تحديث تلقائي كل 30 ثانية
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [navigate]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_orders')
        .select(`
          *,
          delivery_order_items (*),
          customers (customer_name, phone)
        `)
        .in('order_status', ['pending', 'assigned', 'picked', 'arrived', 'delivered'])
        .order('event_date', { ascending: true });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleLogout = () => {
    sessionStorage.removeItem('deliverySession');
    sessionStorage.removeItem('pendingDelivery');
    navigate('/delivery/login');
  };

  // تحديث حالة الطلب
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const updates = { order_status: newStatus };
      
      // إضافة التواريخ حسب الحالة
      if (newStatus === 'assigned') {
        updates.assigned_at = new Date().toISOString();
        updates.assigned_to = staff.id;
      } else if (newStatus === 'picked') {
        updates.picked_at = new Date().toISOString();
      } else if (newStatus === 'arrived') {
        updates.arrived_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('delivery_orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;

      setSuccess('تم تحديث حالة الطلب');
      fetchOrders();

      // إذا وصل للعميل، افتح نافذة التأكيد
      if (newStatus === 'arrived') {
        const order = orders.find(o => o.id === orderId);
        setConfirmingOrder(order);
      }

    } catch (err) {
      console.error('Update error:', err);
      setError('فشل في تحديث الحالة');
    }
  };

  // تأكيد التسليم
  const handleConfirmDelivery = async (e) => {
    e.preventDefault();
    
    if (!confirmForm.recipient_name || !confirmForm.recipient_phone || !confirmForm.confirmation_code) {
      setError('جميع الحقول مطلوبة');
      return;
    }

    if (confirmForm.confirmation_code.length !== 6) {
      setError('رمز التأكيد يجب أن يكون 6 أرقام');
      return;
    }

    setConfirmLoading(true);
    setError('');

    try {
      // تحديث الطلب
      const { error: updateError } = await supabase
        .from('delivery_orders')
        .update({
          order_status: 'delivered',
          delivered_at: new Date().toISOString(),
          recipient_name: confirmForm.recipient_name,
          recipient_phone: confirmForm.recipient_phone,
          confirmation_code: confirmForm.confirmation_code
        })
        .eq('id', confirmingOrder.id);

      if (updateError) throw updateError;

      // إضافة سجل التأكيد
      await supabase.from('delivery_confirmations').insert({
        order_id: confirmingOrder.id,
        delivered_by: staff.id,
        recipient_name: confirmForm.recipient_name,
        recipient_phone: confirmForm.recipient_phone,
        confirmation_code: confirmForm.confirmation_code
      });

      // إرسال رسالة تأكيد للمستلم
      const smsMessage = `تم تسليم طلبكم بنجاح ✅\n` +
        `رقم الطلب: ${confirmingOrder.order_number}\n` +
        `المستلم: ${confirmForm.recipient_name}\n` +
        `رمز التأكيد: ${confirmForm.confirmation_code}\n` +
        `شكراً لثقتكم - MTS`;

      let cleanPhone = confirmForm.recipient_phone.replace(/\D/g, '');
      if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);

      await fetch('https://api.oursms.com/api-a/msgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: 'n68E8CISvil58edsg-RE',
          src: 'MTS',
          dests: cleanPhone,
          body: smsMessage
        })
      });

      setSuccess('تم تأكيد التسليم بنجاح!');
      setConfirmingOrder(null);
      setConfirmForm({ recipient_name: '', recipient_phone: '', confirmation_code: '' });
      fetchOrders();

    } catch (err) {
      console.error('Confirm error:', err);
      setError('فشل في تأكيد التسليم');
    } finally {
      setConfirmLoading(false);
    }
  };

  // فلترة الطلبات حسب التاب
  const filteredOrders = orders.filter(order => {
    if (activeTab === 'pending') return order.order_status === 'pending';
    if (activeTab === 'in-progress') return ['assigned', 'picked', 'arrived'].includes(order.order_status);
    if (activeTab === 'delivered') return order.order_status === 'delivered';
    return true;
  });

  if (!staff) return null;

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/15 rounded-lg flex items-center justify-center">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold">بوابة المندوبين</h1>
                <p className="text-xs opacity-75">{staff.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleLogout}
                className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-16 z-40">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pending'
                  ? 'text-slate-700 border-slate-700'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <Clock className="w-4 h-4 inline ml-1" />
              جديد ({orders.filter(o => o.order_status === 'pending').length})
            </button>
            <button
              onClick={() => setActiveTab('in-progress')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'in-progress'
                  ? 'text-slate-700 border-slate-700'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <Package className="w-4 h-4 inline ml-1" />
              قيد التنفيذ ({orders.filter(o => ['assigned', 'picked', 'arrived'].includes(o.order_status)).length})
            </button>
            <button
              onClick={() => setActiveTab('delivered')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'delivered'
                  ? 'text-slate-700 border-slate-700'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <CheckCircle className="w-4 h-4 inline ml-1" />
              مكتمل ({orders.filter(o => o.order_status === 'delivered').length})
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {(error || success) && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
              <button onClick={() => setError('')} className="mr-auto">&times;</button>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              {success}
              <button onClick={() => setSuccess('')} className="mr-auto">&times;</button>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">لا توجد طلبات</h3>
            <p className="text-gray-500">
              {activeTab === 'pending' && 'لا توجد طلبات جديدة حالياً'}
              {activeTab === 'in-progress' && 'لا توجد طلبات قيد التنفيذ'}
              {activeTab === 'delivered' && 'لا توجد طلبات مكتملة'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(order => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Order Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ORDER_STATUS[order.order_status]?.color}`}>
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-800">{order.order_number}</div>
                        <div className="text-sm text-gray-500">{order.event_name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${ORDER_STATUS[order.order_status]?.color}`}>
                        {ORDER_STATUS[order.order_status]?.label}
                      </span>
                      {selectedOrder === order.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                {selectedOrder === order.id && (
                  <div className="border-t">
                    <div className="p-4 bg-gray-50 space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{order.event_date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{order.city} - {order.stadium}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="w-4 h-4" />
                          <span>{order.supervisor_name || order.customers?.customer_name}</span>
                        </div>
                        <a 
                          href={`tel:${order.supervisor_phone}`}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                        >
                          <Phone className="w-4 h-4" />
                          <span dir="ltr">{order.supervisor_phone}</span>
                        </a>
                      </div>

                      {/* Products */}
                      {order.delivery_order_items?.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            المنتجات ({order.total_items} قطعة)
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {order.delivery_order_items.map((item, idx) => (
                              <span key={idx} className="bg-white px-3 py-1 rounded-full text-sm border">
                                {item.product_name} ({item.quantity})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      {ORDER_STATUS[order.order_status]?.nextAction && (
                        <div className="pt-3 border-t">
                          {order.order_status === 'pending' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'assigned')}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                            >
                              <ClipboardCheck className="w-5 h-5" />
                              استلام الطلب
                            </button>
                          )}
                          {order.order_status === 'assigned' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'picked')}
                              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                            >
                              <Package className="w-5 h-5" />
                              بدء التجهيز
                            </button>
                          )}
                          {order.order_status === 'picked' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'arrived')}
                              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                            >
                              <Navigation className="w-5 h-5" />
                              وصلت للموقع
                            </button>
                          )}
                          {order.order_status === 'arrived' && (
                            <button
                              onClick={() => {
                                setConfirmingOrder(order);
                                setConfirmForm({ recipient_name: '', recipient_phone: '', confirmation_code: '' });
                              }}
                              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-5 h-5" />
                              تأكيد التسليم
                            </button>
                          )}
                        </div>
                      )}

                      {/* Delivery Info (if delivered) */}
                      {order.order_status === 'delivered' && (
                        <div className="pt-3 border-t bg-green-50 -mx-4 -mb-4 p-4">
                          <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                            <CheckCircle className="w-5 h-5" />
                            تم التسليم
                          </div>
                          <div className="text-sm text-green-600 space-y-1">
                            <p>المستلم: {order.recipient_name}</p>
                            <p dir="ltr" className="text-left">رقم المستلم: {order.recipient_phone}</p>
                            <p>وقت التسليم: {new Date(order.delivered_at).toLocaleString('ar-SA')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Confirm Delivery Modal */}
      {confirmingOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden">
            <div className="bg-green-600 text-white p-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CheckCircle className="w-6 h-6" />
                تأكيد التسليم
              </h2>
              <p className="text-sm opacity-90">طلب #{confirmingOrder.order_number}</p>
            </div>

            <form onSubmit={handleConfirmDelivery} className="p-4 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  اسم المستلم *
                </label>
                <input
                  type="text"
                  value={confirmForm.recipient_name}
                  onChange={(e) => setConfirmForm({...confirmForm, recipient_name: e.target.value})}
                  placeholder="اسم الشخص الذي استلم الطلب"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  رقم جوال المستلم *
                </label>
                <input
                  type="tel"
                  value={confirmForm.recipient_phone}
                  onChange={(e) => setConfirmForm({...confirmForm, recipient_phone: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                  placeholder="05xxxxxxxx"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  dir="ltr"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">سيتم إرسال رسالة تأكيد لهذا الرقم</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  رمز التأكيد من المستلم *
                </label>
                <input
                  type="tel"
                  value={confirmForm.confirmation_code}
                  onChange={(e) => setConfirmForm({...confirmForm, confirmation_code: e.target.value.replace(/\D/g, '').slice(0, 6)})}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 border-2 rounded-lg text-center font-mono text-2xl tracking-[0.3em] focus:ring-2 focus:ring-green-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">اطلب من المستلم رمز التأكيد المكون من 6 أرقام</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmingOrder(null)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={confirmLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {confirmLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      تأكيد
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t mt-8 py-4">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-500">
          نظام إدارة التوصيل - MTS © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}