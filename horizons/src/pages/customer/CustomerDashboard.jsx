import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

// Odoo API URL
const ODOO_API = 'https://ycbplbsrzsuefeqlhxsx.supabase.co/functions/v1/odoo-sync';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  
  const [customer, setCustomer] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState('');
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // OTP للموافقة
  const [approvalModal, setApprovalModal] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => {
    const session = sessionStorage.getItem('customerSession');
    if (!session) {
      navigate('/customer/login');
      return;
    }
    
    const customerData = JSON.parse(session);
    setCustomer(customerData);
    fetchData(customerData);
  }, [navigate]);

  // جلب البيانات من Odoo
  const fetchData = async (customerData) => {
    setLoading(true);
    try {
      // جلب المنتجات
      const productsRes = await fetch(ODOO_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_products' })
      });
      const productsData = await productsRes.json();
      if (productsData.success) {
        setProducts(productsData.data || []);
      }

      // جلب الطلبات
      const ordersRes = await fetch(ODOO_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'get_customer_orders',
          params: { customer_id: customerData.odoo_id }
        })
      });
      const ordersData = await ordersRes.json();
      if (ordersData.success) {
        setOrders(ordersData.data || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('فشل في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('customerSession');
    navigate('/customer/login');
  };

  // إضافة للسلة
  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.list_price * item.quantity), 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // إرسال الطلب لـ Odoo
  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      setError('السلة فارغة');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(ODOO_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_order',
          params: {
            customer_id: customer.odoo_id,
            products: cart.map(item => ({
              id: item.id,
              quantity: item.quantity
            })),
            notes: notes
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // إرسال SMS للمدير
        await fetch('https://api.oursms.com/api-a/msgs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            token: 'n68E8CISvil58edsg-RE',
            src: 'MTS',
            dests: '966539755999',
            body: `طلب جديد من ${customer.name}\nرقم الطلب: ${data.data.name}\nالمبلغ: ${data.data.amount_total} ريال`
          })
        });

        setSuccess(`تم إرسال الطلب بنجاح! رقم الطلب: ${data.data.name}`);
        setCart([]);
        setNotes('');
        fetchData(customer);
        setCurrentPage('orders');
      } else {
        setError(data.error || 'فشل في إرسال الطلب');
      }
    } catch (err) {
      setError('حدث خطأ أثناء إرسال الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  // عرض تفاصيل الطلب
  const viewOrderDetails = async (orderId) => {
    setLoadingDetails(true);
    setSelectedOrder(orderId);
    
    try {
      const response = await fetch(ODOO_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_order_details',
          params: { order_id: orderId }
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setOrderDetails(data.data);
      }
    } catch (err) {
      setError('فشل في جلب تفاصيل الطلب');
    } finally {
      setLoadingDetails(false);
    }
  };

  // إرسال OTP للموافقة
  const sendApprovalOTP = async (order) => {
    setOtpLoading(true);
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // حفظ OTP
      await supabase.from('otp_codes').insert({
        phone: customer.phone,
        otp_code: otp,
        user_type: 'customer_approval',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      });

      // إرسال SMS
      await fetch('https://api.oursms.com/api-a/msgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: 'n68E8CISvil58edsg-RE',
          src: 'MTS',
          dests: customer.phone,
          body: `رمز الموافقة على الطلب ${order.name}: ${otp}\nصالح لمدة 10 دقائق`
        })
      });

      setOtpSent(true);
      setApprovalModal(order);
    } catch (err) {
      setError('فشل في إرسال رمز التحقق');
    } finally {
      setOtpLoading(false);
    }
  };

  // تأكيد الموافقة بـ OTP
  const confirmApproval = async () => {
    if (otpCode.length !== 6) {
      setError('الرمز يجب أن يكون 6 أرقام');
      return;
    }

    setOtpLoading(true);
    try {
      // التحقق من OTP
      const { data: otpRecord } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('phone', customer.phone)
        .eq('otp_code', otpCode)
        .eq('user_type', 'customer_approval')
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!otpRecord) {
        setError('رمز التحقق غير صحيح أو منتهي');
        setOtpLoading(false);
        return;
      }

      // تحديث OTP
      await supabase.from('otp_codes').update({ is_used: true }).eq('id', otpRecord.id);

      // تأكيد الطلب في Odoo
      const response = await fetch(ODOO_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_order',
          params: { order_id: approvalModal.id }
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('تم تأكيد الموافقة على الطلب بنجاح!');
        setApprovalModal(null);
        setOtpCode('');
        setOtpSent(false);
        fetchData(customer);
      } else {
        setError('فشل في تأكيد الطلب');
      }
    } catch (err) {
      setError('حدث خطأ');
    } finally {
      setOtpLoading(false);
    }
  };

  // حالات الطلبات
  const getStatusBadge = (state) => {
    const statuses = {
      draft: { label: 'مسودة', class: 'bg-yellow-100 text-yellow-800' },
      sent: { label: 'مرسل', class: 'bg-blue-100 text-blue-800' },
      sale: { label: 'مؤكد', class: 'bg-green-100 text-green-800' },
      done: { label: 'مكتمل', class: 'bg-gray-100 text-gray-800' },
      cancel: { label: 'ملغي', class: 'bg-red-100 text-red-800' }
    };
    return statuses[state] || { label: state, class: 'bg-gray-100 text-gray-800' };
  };

  if (!customer) return null;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/15 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="font-bold">بوابة العملاء</h1>
                <p className="text-xs opacity-75">{customer.name}</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {['dashboard', 'products', 'orders'].map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  {page === 'dashboard' ? 'الرئيسية' : page === 'products' ? 'طلب منتجات' : 'طلباتي'}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              {cart.length > 0 && (
                <button
                  onClick={() => setCurrentPage('products')}
                  className="relative bg-white/20 hover:bg-white/30 p-2 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                </button>
              )}
              <Button 
                variant="ghost" 
                onClick={handleLogout} 
                className="bg-white/10 hover:bg-white/20 text-white hover:text-white"
              >
                خروج
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden border-t border-white/20 flex">
          {['dashboard', 'products', 'orders'].map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`flex-1 py-3 text-xs font-medium ${currentPage === page ? 'bg-white/20' : ''}`}
            >
              {page === 'dashboard' ? 'الرئيسية' : page === 'products' ? 'طلب منتجات' : 'طلباتي'}
            </button>
          ))}
        </div>
      </header>

      {/* Messages */}
      {(error || success) && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError('')}>&times;</button>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
              <span>{success}</span>
              <button onClick={() => setSuccess('')}>&times;</button>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Dashboard */}
            {currentPage === 'dashboard' && (
              <div className="space-y-6">
                <Card className="border-t-4 border-blue-600 shadow-sm">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">مرحباً {customer.name} </h2>
                    <p className="text-gray-600">يمكنك طلب منتجات التشجيع ومتابعة طلباتك</p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-3 gap-4">
                  <Card className="border-t-4 border-blue-600 shadow-sm text-center">
                    <CardContent className="p-4">
                      <div className="text-3xl font-bold text-blue-600">{orders.length}</div>
                      <div className="text-sm text-gray-500">إجمالي الطلبات</div>
                    </CardContent>
                  </Card>
                  <Card className="border-t-4 border-blue-600 shadow-sm text-center">
                    <CardContent className="p-4">
                      <div className="text-3xl font-bold text-blue-600">{products.length}</div>
                      <div className="text-sm text-gray-500">المنتجات المتاحة</div>
                    </CardContent>
                  </Card>
                  <Card className="border-t-4 border-green-600 shadow-sm text-center">
                    <CardContent className="p-4">
                      <div className="text-3xl font-bold text-green-600">
                        {orders.filter(o => ['sale', 'done'].includes(o.state)).length}
                      </div>
                      <div className="text-sm text-gray-500">طلبات مؤكدة</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setCurrentPage('products')}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-6 text-right transition-colors"
                  >
                    <svg className="w-10 h-10 mb-3 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <h3 className="text-lg font-bold mb-1">طلب منتجات</h3>
                    <p className="text-sm opacity-80">اختر من قائمة المنتجات المتاحة</p>
                  </button>
                  <button
                    onClick={() => setCurrentPage('orders')}
                    className="bg-white hover:bg-gray-50 text-gray-800 rounded-xl p-6 text-right shadow-sm border"
                  >
                    <svg className="w-10 h-10 mb-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-lg font-bold mb-1">طلباتي</h3>
                    <p className="text-sm text-gray-500">متابعة حالة طلباتك</p>
                  </button>
                </div>
              </div>
            )}

            {/* Products Page */}
            {currentPage === 'products' && (
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card className="border-t-4 border-blue-600 shadow-sm">
                    <CardHeader>
                      <CardTitle>المنتجات المتاحة ({products.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {products.map(product => {
                          const inCart = cart.find(item => item.id === product.id);
                          return (
                            <div 
                              key={product.id}
                              className={`border rounded-lg p-4 transition-all ${
                                inCart ? 'border-blue-600 bg-blue-50' : 'hover:border-gray-300'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-medium text-gray-800">{product.name}</h4>
                                  <p className="text-xs text-gray-500">{product.default_code}</p>
                                </div>
                                <span className="text-blue-600 font-bold">{product.list_price} ر.س</span>
                              </div>
                              
                              {inCart ? (
                                <div className="flex items-center justify-between mt-3">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => updateQuantity(product.id, -1)}
                                    className="w-8 h-8 rounded-full"
                                  >-</Button>
                                  <span className="font-bold text-lg">{inCart.quantity}</span>
                                  <Button
                                    size="icon"
                                    onClick={() => updateQuantity(product.id, 1)}
                                    className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700"
                                  >+</Button>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  onClick={() => addToCart(product)}
                                  className="w-full mt-3 hover:bg-blue-600 hover:text-white"
                                >
                                  إضافة للسلة
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Cart */}
                <div className="lg:col-span-1">
                  <Card className="border-t-4 border-blue-600 shadow-sm sticky top-24">
                    <CardHeader>
                      <CardTitle>سلة الطلب</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {cart.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <p>السلة فارغة</p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                            {cart.map(item => (
                              <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{item.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {item.quantity} × {item.list_price} ر.س
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-blue-600">
                                    {(item.quantity * item.list_price).toFixed(2)} ر.س
                                  </span>
                                  <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                  >×</button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="mb-4 space-y-2">
                            <Label>ملاحظات</Label>
                            <Textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              rows={2}
                              placeholder="أي ملاحظات إضافية..."
                            />
                          </div>

                          <div className="border-t pt-4 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>عدد الأصناف:</span>
                              <span className="font-medium">{cartItemsCount} قطعة</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>المجموع:</span>
                              <span className="font-medium">{cartTotal.toFixed(2)} ر.س</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>الضريبة (15%):</span>
                              <span className="font-medium">{(cartTotal * 0.15).toFixed(2)} ر.س</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold pt-2 border-t">
                              <span>الإجمالي:</span>
                              <span className="text-blue-600">{(cartTotal * 1.15).toFixed(2)} ر.س</span>
                            </div>
                          </div>

                          <Button
                            onClick={handleSubmitOrder}
                            disabled={submitting}
                            className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                          >
                            {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Orders Page */}
            {currentPage === 'orders' && (
              <div className="space-y-4">
                <Card className="border-t-4 border-blue-600 shadow-sm">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-gray-800">طلباتي ({orders.length})</h3>
                  </CardContent>
                </Card>

                {orders.length === 0 ? (
                  <Card className="shadow-sm">
                    <CardContent className="p-12 text-center">
                      <p className="text-gray-500 mb-4">لا توجد طلبات</p>
                      <Button onClick={() => setCurrentPage('products')}>
                        طلب منتجات
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {orders.map(order => (
                      <Card key={order.id} className="shadow-sm overflow-hidden">
                        <div className="p-4 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-gray-800">{order.name}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(order.date_order).toLocaleDateString('ar-SA')}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-blue-600">
                              {Number(order.amount_total).toFixed(2)} ر.س
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.state).class}`}>
                              {getStatusBadge(order.state).label}
                            </span>
                          </div>
                        </div>
                        
                        <div className="border-t px-4 py-3 bg-gray-50 flex gap-2">
                          <Button 
                            variant="link"
                            onClick={() => viewOrderDetails(order.id)}
                            className="text-blue-600 hover:text-blue-800 p-0 h-auto"
                          >
                            عرض التفاصيل
                          </Button>
                          {(order.state === 'draft' || order.state === 'sent') && (
                            <Button
                              variant="link"
                              onClick={() => sendApprovalOTP(order)}
                              disabled={otpLoading}
                              className="text-green-600 hover:text-green-800 mr-4 p-0 h-auto"
                            >
                              الموافقة على الطلب
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Order Details Modal */}
      {selectedOrder && orderDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg max-h-[80vh] overflow-y-auto border-t-4 border-blue-600">
            <div className="bg-blue-600 text-white p-4 sticky top-0 flex items-center justify-between">
                <h2 className="font-bold">{orderDetails.name}</h2>
                <button onClick={() => { setSelectedOrder(null); setOrderDetails(null); }} className="text-2xl">&times;</button>
            </div>
            <CardContent className="p-4">
              <div className="mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(orderDetails.state).class}`}>
                  {getStatusBadge(orderDetails.state).label}
                </span>
              </div>
              
              <h4 className="font-medium mb-2">المنتجات:</h4>
              <div className="space-y-2">
                {orderDetails.lines?.map((line, idx) => (
                  <div key={idx} className="flex justify-between bg-gray-50 p-3 rounded-lg">
                    <span>{line.name}</span>
                    <span>{line.product_uom_qty} × {line.price_unit} = {line.price_subtotal} ر.س</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t text-left font-bold text-lg">
                الإجمالي: {Number(orderDetails.amount_total).toFixed(2)} ر.س
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Approval OTP Modal */}
      {approvalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md border-t-4 border-blue-600">
            <div className="bg-blue-600 text-white p-4 text-center">
              <h2 className="font-bold">تأكيد الموافقة</h2>
              <p className="text-sm opacity-90">{approvalModal.name}</p>
            </div>
            <CardContent className="p-6">
              {!otpSent ? (
                <div className="text-center space-y-4">
                  <p>سيتم إرسال رمز التحقق لجوالك</p>
                  <Button
                    onClick={() => sendApprovalOTP(approvalModal)}
                    disabled={otpLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {otpLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                    {otpLoading ? 'جاري الإرسال...' : 'إرسال الرمز'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-center">أدخل رمز التحقق</p>
                  <Input
                    type="tel"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="text-center font-mono text-2xl tracking-widest"
                    maxLength={6}
                  />
                  <Button
                    onClick={confirmApproval}
                    disabled={otpLoading || otpCode.length !== 6}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {otpLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                    {otpLoading ? 'جاري التأكيد...' : 'تأكيد الموافقة'}
                  </Button>
                </div>
              )}
              <Button
                variant="ghost"
                onClick={() => { setApprovalModal(null); setOtpCode(''); setOtpSent(false); }}
                className="w-full mt-3"
              >
                إلغاء
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <footer className="bg-white border-t mt-8 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          نظام طلبات الجماهير - MTS © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}