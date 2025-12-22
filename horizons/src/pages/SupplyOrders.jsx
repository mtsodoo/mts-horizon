
// src/pages/SupplyOrders.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Search, Filter, Calendar, MapPin, Truck, CheckCircle2, 
  XCircle, Clock, User, Building, Phone, AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function SupplyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deliveryStaff, setDeliveryStaff] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
    fetchDeliveryStaff();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('delivery_orders')
        .select(`
          *,
          customers (
            customer_name,
            phone,
            city
          ),
          delivery_staff (
            staff_name,
            phone
          )
        `)
        .order('event_date', { ascending: true });

      if (statusFilter !== 'all') {
        query = query.eq('order_status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        variant: "destructive",
        title: "خطأ في جلب الطلبات",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_staff')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      setDeliveryStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('delivery_orders')
        .update({ order_status: newStatus, updated_at: new Date() })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "تم تحديث الحالة",
        description: `تم تغيير حالة الطلب إلى ${getStatusLabel(newStatus)}`,
      });

      fetchOrders();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: error.message
      });
    }
  };

  const handleAssignStaff = async () => {
    if (!selectedOrder || !selectedStaff) return;

    try {
      const { error } = await supabase
        .from('delivery_orders')
        .update({ 
          assigned_to: selectedStaff,
          order_status: 'assigned',
          assigned_at: new Date(),
          updated_at: new Date()
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      toast({
        title: "تم تعيين المندوب",
        description: "تم إسناد الطلب للمندوب بنجاح",
      });

      setIsAssignDialogOpen(false);
      setSelectedOrder(null);
      setSelectedStaff('');
      fetchOrders();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: error.message
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'assigned': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'assigned': return 'جاري التوصيل';
      case 'delivered': return 'تم التسليم';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  const filteredOrders = orders.filter(order => {
    const searchLower = searchQuery.toLowerCase();
    return (
      order.order_number?.toLowerCase().includes(searchLower) ||
      order.customers?.customer_name?.toLowerCase().includes(searchLower) ||
      order.event_name?.toLowerCase().includes(searchLower) ||
      order.stadium?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">إدارة طلبات التموين</h1>
          <p className="text-slate-500 mt-1">متابعة وتوزيع طلبات العملاء للملاعب والفعاليات</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="بحث برقم الطلب، العميل، أو الملعب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 w-full sm:w-64"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(val) => {
            setStatusFilter(val);
            // Re-fetch logic is inside useEffect dependent on nothing but here we trigger manual re-fetch if needed or let filtered array handle it? 
            // Better to re-fetch or filter client side. Current useEffect logic doesn't watch statusFilter for auto re-fetch to avoid loops if not careful, but let's add it to dep array or manually call.
            // Actually let's just trigger fetchOrders manually after state update or add to useEffect dependency.
            // For simplicity, let's add statusFilter to useEffect dependency in real app, but here I'll just refetch.
            setTimeout(fetchOrders, 0); 
          }}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="تصفية حسب الحالة" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="pending">قيد الانتظار</SelectItem>
              <SelectItem value="assigned">جاري التوصيل</SelectItem>
              <SelectItem value="delivered">تم التسليم</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed">
          <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">لا توجد طلبات</h3>
          <p className="text-gray-500 mt-1">لم يتم العثور على طلبات مطابقة لمعايير البحث</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className={`h-2 w-full ${
                order.order_status === 'pending' ? 'bg-amber-500' :
                order.order_status === 'assigned' ? 'bg-blue-500' :
                order.order_status === 'delivered' ? 'bg-green-500' :
                'bg-red-500'
              }`} />
              
              <CardHeader className="pb-3 pt-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">#{order.order_number}</div>
                    <h3 className="font-bold text-lg text-slate-900">{order.event_name}</h3>
                  </div>
                  <Badge variant="outline" className={`${getStatusColor(order.order_status)} border-0`}>
                    {getStatusLabel(order.order_status)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4 text-sm pb-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="font-medium">{order.customers?.customer_name || 'عميل غير معروف'}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>{order.event_date ? format(new Date(order.event_date), 'dd/MM/yyyy') : '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span>{order.event_time || '--:--'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                  <span>{order.city} - {order.stadium}</span>
                </div>

                {order.delivery_staff && (
                  <div className="bg-slate-50 p-3 rounded-md flex items-center gap-3 mt-2">
                    <div className="bg-white p-2 rounded-full shadow-sm">
                      <Truck className="h-4 w-4 text-slate-700" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">مندوب التوصيل</div>
                      <div className="font-medium text-slate-900">{order.delivery_staff.staff_name}</div>
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="bg-slate-50 p-3 flex gap-2 border-t">
                {order.order_status === 'pending' && (
                  <>
                    <Button 
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" 
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsAssignDialogOpen(true);
                      }}
                    >
                      <Truck className="ml-2 h-4 w-4" />
                      تعيين مندوب
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleStatusChange(order.id, 'cancelled')}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {order.order_status === 'assigned' && (
                  <>
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white" 
                      size="sm"
                      onClick={() => handleStatusChange(order.id, 'delivered')}
                    >
                      <CheckCircle2 className="ml-2 h-4 w-4" />
                      تأكيد التسليم
                    </Button>
                    <Button 
                      variant="outline"
                      className="text-amber-600 border-amber-200 hover:bg-amber-50" 
                      size="sm"
                      onClick={() => handleStatusChange(order.id, 'pending')}
                    >
                      <AlertCircle className="ml-2 h-4 w-4" />
                      إعادة
                    </Button>
                  </>
                )}

                {(order.order_status === 'delivered' || order.order_status === 'cancelled') && (
                  <div className="w-full text-center text-xs text-gray-500 font-medium py-1">
                    {order.order_status === 'delivered' ? 'تم اكتمال الطلب' : 'تم إلغاء الطلب'}
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعيين مندوب توصيل</DialogTitle>
            <DialogDescription>
              اختر مندوب التوصيل المسؤول عن توصيل طلب {selectedOrder?.event_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">اختر المندوب</label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر من القائمة..." />
                </SelectTrigger>
                <SelectContent>
                  {deliveryStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.staff_name} ({staff.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleAssignStaff} disabled={!selectedStaff}>تأكيد التعيين</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
