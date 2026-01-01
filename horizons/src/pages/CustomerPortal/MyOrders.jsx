
import React, { useState, useEffect } from 'react';
import CustomerLayout from '@/components/CustomerPortal/CustomerLayout';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Package, Eye, Calendar, Clock, MapPin, Truck } from 'lucide-react';

const MyOrders = () => {
  const { customer } = useCustomerAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    if (customer) {
      fetchOrders();
    }
  }, [customer]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('supply_orders')
        .select(`
           *,
           customers:external_customers(customer_name),
           delivery_staff:external_staff!supply_orders_delivery_staff_id_fkey(staff_name),
           vehicle:fleet_vehicles(plate_number, brand, model),
           items:supply_order_items(
             *,
             product:inventory_products(product_name, product_code, unit)
           )
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      approved: "bg-blue-100 text-blue-800 border-blue-200",
      preparing: "bg-orange-100 text-orange-800 border-orange-200",
      ready: "bg-cyan-100 text-cyan-800 border-cyan-200",
      dispatched: "bg-purple-100 text-purple-800 border-purple-200",
      delivered: "bg-green-100 text-green-800 border-green-200",
      returned: "bg-gray-100 text-gray-800 border-gray-200",
      cancelled: "bg-red-100 text-red-800 border-red-200"
    };
    
    const labels = {
      pending: "قيد المراجعة",
      approved: "تم الاعتماد",
      preparing: "جاري التجهيز",
      ready: "جاهز للتوصيل",
      dispatched: "في الطريق",
      delivered: "تم الاستلام",
      returned: "تم الإرجاع",
      cancelled: "ملغي"
    };

    return (
      <Badge variant="outline" className={`${styles[status] || 'bg-gray-100'} px-3 py-1`}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <CustomerLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="text-teal-600" />
            طلباتي السابقة
          </h1>
        </div>

        {loading ? (
          <div className="text-center py-12">جاري التحميل...</div>
        ) : orders.length === 0 ? (
          <Card className="text-center py-16 bg-gray-50 border-dashed">
            <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">لا توجد طلبات سابقة</h3>
            <p className="text-gray-500 mb-6">لم تقم بإنشاء أي طلبات توريد حتى الآن</p>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => window.location.href='/customer-portal/new-order'}>
              إنشاء طلب جديد
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {orders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow cursor-pointer border-r-4 border-r-teal-500"
                onClick={() => {
                  setSelectedOrder(order);
                  setIsDetailsOpen(true);
                }}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono font-bold text-lg text-teal-700">{order.order_number}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <h3 className="font-bold text-gray-900 text-lg mb-1">{order.event_name}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {format(new Date(order.event_date), 'dd/MM/yyyy')}</span>
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {format(new Date(order.created_at), 'HH:mm')}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {order.stadium || order.city}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-center px-4 py-2 bg-gray-50 rounded-lg">
                        <span className="block text-xs text-gray-500">الأصناف</span>
                        <span className="font-bold text-gray-900 text-lg">{order.items?.length || 0}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="text-gray-400">
                        <Eye className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Order Details Modal */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedOrder && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex justify-between items-center text-xl">
                    <span>تفاصيل الطلب: {selectedOrder.order_number}</span>
                    {getStatusBadge(selectedOrder.status)}
                  </DialogTitle>
                  <DialogDescription>
                    تم الإنشاء في {format(new Date(selectedOrder.created_at), 'PPP pp', { locale: ar })}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                   <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                      <p className="font-bold text-gray-900 mb-2 border-b pb-2">معلومات الفعالية</p>
                      <div className="flex justify-between"><span className="text-gray-500">الاسم:</span> <span>{selectedOrder.event_name}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">التاريخ:</span> <span>{format(new Date(selectedOrder.event_date), 'dd/MM/yyyy')}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">الوقت:</span> <span>{selectedOrder.event_time || '-'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">المدينة:</span> <span>{selectedOrder.city}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">الملعب:</span> <span>{selectedOrder.stadium}</span></div>
                   </div>
                   
                   <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                      <p className="font-bold text-gray-900 mb-2 border-b pb-2">معلومات التواصل</p>
                      <div className="flex justify-between"><span className="text-gray-500">المشرف:</span> <span>{selectedOrder.supervisor_name || '-'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">الجوال:</span> <span dir="ltr">{selectedOrder.supervisor_phone || '-'}</span></div>
                      
                      {selectedOrder.delivery_staff_id && (
                         <div className="mt-4 pt-4 border-t">
                            <p className="font-bold text-teal-700 flex items-center gap-1"><Truck className="w-4 h-4"/> معلومات التوصيل</p>
                            <p className="mt-1 text-gray-600">
                              {selectedOrder.delivery_staff?.staff_name ? `المندوب: ${selectedOrder.delivery_staff.staff_name}` : 'طلبك في الطريق إليك!'}
                            </p>
                         </div>
                      )}
                   </div>
                </div>

                <div>
                   <h3 className="font-bold mb-3">الأصناف المطلوبة</h3>
                   <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-gray-50">
                          <TableRow>
                            <TableHead className="text-right">المنتج</TableHead>
                            <TableHead className="text-right">الكمية</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedOrder.items?.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{item.product?.product_name}</TableCell>
                              <TableCell>{item.quantity_requested} {item.product?.unit}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                   </div>
                </div>

                {selectedOrder.notes && (
                  <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800 mt-2">
                    <strong>ملاحظات:</strong> {selectedOrder.notes}
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </CustomerLayout>
  );
};

export default MyOrders;
