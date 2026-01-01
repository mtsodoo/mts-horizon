
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { 
  Package, Search, Plus, Filter, Calendar, MapPin, 
  User, Phone, Truck, FileText, CheckCircle2, XCircle, 
  Clock, AlertTriangle, ArrowRight, Trash2, ListPlus,
  ChevronDown, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import PageTitle from '@/components/PageTitle';

const SupplyOrders = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  
  // Lookups
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [deliveryStaff, setDeliveryStaff] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // New Order Form State
  const [newOrder, setNewOrder] = useState({
    customer_id: '',
    event_name: '',
    event_date: '',
    event_time: '',
    city: '',
    stadium: '',
    supervisor_name: '',
    supervisor_phone: '',
    notes: ''
  });
  const [orderItems, setOrderItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({ product_id: '', quantity: '' });
  const [submitting, setSubmitting] = useState(false);

  // Assignment State
  const [assignData, setAssignData] = useState({
    delivery_staff_id: '',
    vehicle_id: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchQuery, statusFilter]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchOrders(),
        fetchLookups()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في تحميل البيانات'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
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
      .order('created_at', { ascending: false });

    if (error) throw error;
    setOrders(data || []);
  };

  const fetchLookups = async () => {
    // Customers
    const { data: custData } = await supabase
      .from('external_customers')
      .select('id, customer_name')
      .eq('is_active', true);
    setCustomers(custData || []);

    // Products
    const { data: prodData } = await supabase
      .from('inventory_products')
      .select('id, product_name, current_stock, unit')
      .eq('is_active', true)
      .order('product_name');
    setProducts(prodData || []);

    // Staff (Delivery & Drivers)
    const { data: staffData } = await supabase
      .from('external_staff')
      .select('id, staff_name, staff_type')
      .in('staff_type', ['delivery', 'warehouse_driver'])
      .eq('is_active', true);
    setDeliveryStaff(staffData || []);

    // Vehicles
    const { data: vehData } = await supabase
      .from('fleet_vehicles')
      .select('id, plate_number, brand, model')
      .eq('status', 'active'); // Assuming status field for active vehicles
    setVehicles(vehData || []);
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(o => 
        o.order_number?.toLowerCase().includes(q) ||
        o.customers?.customer_name?.toLowerCase().includes(q) ||
        o.event_name?.toLowerCase().includes(q)
      );
    }

    setFilteredOrders(filtered);
  };

  const handleAddItem = () => {
    if (!currentItem.product_id || !currentItem.quantity) return;
    
    const product = products.find(p => p.id === currentItem.product_id);
    if (!product) return;

    if (parseInt(currentItem.quantity) > product.current_stock) {
      toast({
        variant: 'destructive',
        title: 'تنبيه المخزون',
        description: `الكمية المطلوبة أكبر من المتوفر (${product.current_stock})`
      });
      return;
    }

    setOrderItems([...orderItems, {
      ...currentItem,
      product_name: product.product_name,
      unit: product.unit,
      current_stock: product.current_stock
    }]);
    setCurrentItem({ product_id: '', quantity: '' });
  };

  const handleRemoveItem = (index) => {
    const newItems = [...orderItems];
    newItems.splice(index, 1);
    setOrderItems(newItems);
  };

  const handleCreateOrder = async () => {
    if (!newOrder.customer_id || !newOrder.event_name || !newOrder.event_date || orderItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'بيانات ناقصة',
        description: 'يرجى تعبئة جميع الحقول المطلوبة وإضافة منتج واحد على الأقل'
      });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create Order
      const { data: orderData, error: orderError } = await supabase
        .from('supply_orders')
        .insert([{
          ...newOrder,
          status: 'pending'
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create Items
      const itemsToInsert = orderItems.map(item => ({
        order_id: orderData.id,
        product_id: item.product_id,
        quantity_requested: parseInt(item.quantity)
      }));

      const { error: itemsError } = await supabase
        .from('supply_order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: 'تم بنجاح',
        description: 'تم إنشاء طلب التوريد بنجاح',
        className: 'bg-green-50 text-green-800'
      });

      setIsCreateOpen(false);
      setNewOrder({
        customer_id: '',
        event_name: '',
        event_date: '',
        event_time: '',
        city: '',
        stadium: '',
        supervisor_name: '',
        supervisor_phone: '',
        notes: ''
      });
      setOrderItems([]);
      fetchOrders();

    } catch (error) {
      console.error('Create order error:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('supply_orders')
        .update({ status: newStatus })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      toast({
        title: 'تم التحديث',
        description: `تم تغيير حالة الطلب إلى ${getStatusLabel(newStatus)}`
      });
      
      fetchOrders();
      setIsDetailsOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      const updates = {};
      if (assignData.delivery_staff_id) updates.delivery_staff_id = assignData.delivery_staff_id;
      if (assignData.vehicle_id) updates.vehicle_id = assignData.vehicle_id;

      const { error } = await supabase
        .from('supply_orders')
        .update(updates)
        .eq('id', selectedOrder.id);

      if (error) throw error;

      toast({
        title: 'تم التحديث',
        description: 'تم تحديث بيانات التوصيل'
      });
      
      fetchOrders();
      // Don't close modal, just refresh data locally
      setSelectedOrder(prev => ({...prev, ...updates, 
        delivery_staff: deliveryStaff.find(s => s.id === assignData.delivery_staff_id) || prev.delivery_staff,
        vehicle: vehicles.find(v => v.id === assignData.vehicle_id) || prev.vehicle
      }));
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error.message
      });
    } finally {
      setSubmitting(false);
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
    return (
      <Badge variant="outline" className={`${styles[status] || 'bg-gray-100'} px-2 py-1`}>
        {getStatusLabel(status)}
      </Badge>
    );
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: "جديد",
      approved: "معتمد",
      preparing: "جاري التجهيز",
      ready: "جاهز",
      dispatched: "تم الإرسال",
      delivered: "تم التسليم",
      returned: "تم الإرجاع",
      cancelled: "ملغي"
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6 p-4 md:p-8 animate-in fade-in duration-500">
      <Helmet>
        <title>إدارة طلبات التوريد | MTS</title>
      </Helmet>

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <PageTitle title="إدارة طلبات التوريد" icon={Package} />
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          طلب جديد
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="بحث برقم الطلب أو العميل..." 
                  className="pr-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 ml-2" />
                  <SelectValue placeholder="تصفية بالحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="pending">جديد</SelectItem>
                  <SelectItem value="approved">معتمد</SelectItem>
                  <SelectItem value="preparing">جاري التجهيز</SelectItem>
                  <SelectItem value="ready">جاهز</SelectItem>
                  <SelectItem value="dispatched">تم الإرسال</SelectItem>
                  <SelectItem value="delivered">تم التسليم</SelectItem>
                  <SelectItem value="returned">تم الإرجاع</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الطلب</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">الفعالية</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">عدد الأصناف</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      لا توجد طلبات
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                      setSelectedOrder(order);
                      setAssignData({
                        delivery_staff_id: order.delivery_staff_id || '',
                        vehicle_id: order.vehicle_id || ''
                      });
                      setIsDetailsOpen(true);
                    }}>
                      <TableCell className="font-medium font-mono">{order.order_number}</TableCell>
                      <TableCell>{order.customers?.customer_name}</TableCell>
                      <TableCell>{order.event_name}</TableCell>
                      <TableCell>{format(new Date(order.event_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{order.items?.length || 0}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Order Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إنشاء طلب توريد جديد</DialogTitle>
            <DialogDescription>أدخل تفاصيل الطلب والأصناف المطلوبة</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>العميل <span className="text-red-500">*</span></Label>
              <Select 
                value={newOrder.customer_id} 
                onValueChange={(val) => setNewOrder({...newOrder, customer_id: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر العميل" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>اسم الفعالية <span className="text-red-500">*</span></Label>
              <Input 
                value={newOrder.event_name}
                onChange={(e) => setNewOrder({...newOrder, event_name: e.target.value})}
                placeholder="مثال: مباراة الهلال والنصر"
              />
            </div>

            <div className="space-y-2">
              <Label>تاريخ الفعالية <span className="text-red-500">*</span></Label>
              <Input 
                type="date"
                value={newOrder.event_date}
                onChange={(e) => setNewOrder({...newOrder, event_date: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>وقت الفعالية</Label>
              <Input 
                type="time"
                value={newOrder.event_time}
                onChange={(e) => setNewOrder({...newOrder, event_time: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>المدينة</Label>
              <Input 
                value={newOrder.city}
                onChange={(e) => setNewOrder({...newOrder, city: e.target.value})}
                placeholder="الرياض"
              />
            </div>

            <div className="space-y-2">
              <Label>الموقع / الملعب</Label>
              <Input 
                value={newOrder.stadium}
                onChange={(e) => setNewOrder({...newOrder, stadium: e.target.value})}
                placeholder="استاد الملك فهد"
              />
            </div>

            <div className="space-y-2">
              <Label>اسم المشرف</Label>
              <Input 
                value={newOrder.supervisor_name}
                onChange={(e) => setNewOrder({...newOrder, supervisor_name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>جوال المشرف</Label>
              <Input 
                value={newOrder.supervisor_phone}
                onChange={(e) => setNewOrder({...newOrder, supervisor_phone: e.target.value})}
                dir="ltr"
                className="text-right"
              />
            </div>

            <div className="col-span-full space-y-2">
              <Label>ملاحظات</Label>
              <Textarea 
                value={newOrder.notes}
                onChange={(e) => setNewOrder({...newOrder, notes: e.target.value})}
              />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <ListPlus className="w-5 h-5 text-blue-500" />
              إضافة الأصناف
            </h3>
            
            <div className="flex gap-2 items-end mb-4 bg-gray-50 p-3 rounded-lg border">
              <div className="flex-1 space-y-2">
                <Label>المنتج</Label>
                <Select 
                  value={currentItem.product_id} 
                  onValueChange={(val) => setCurrentItem({...currentItem, product_id: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المنتج" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.product_name} (متوفر: {p.current_stock} {p.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32 space-y-2">
                <Label>الكمية</Label>
                <Input 
                  type="number" 
                  min="1"
                  value={currentItem.quantity}
                  onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})}
                />
              </div>
              <Button onClick={handleAddItem} className="mb-[2px]">إضافة</Button>
            </div>

            {orderItems.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المنتج</TableHead>
                      <TableHead>الكمية</TableHead>
                      <TableHead>المتوفر</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{item.quantity} {item.unit}</TableCell>
                        <TableCell>
                          <span className={item.quantity > item.current_stock ? "text-red-500 font-bold" : "text-green-600"}>
                            {item.current_stock}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveItem(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreateOrder} disabled={submitting}>
              {submitting ? 'جاري الإنشاء...' : 'إنشاء الطلب'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="text-xl flex items-center gap-2">
                      طلب توريد #{selectedOrder.order_number}
                      {getStatusBadge(selectedOrder.status)}
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      {selectedOrder.customers?.customer_name} - {selectedOrder.event_name}
                    </DialogDescription>
                  </div>
                  <div className="text-sm text-muted-foreground text-left">
                    <div>{format(new Date(selectedOrder.created_at), 'dd/MM/yyyy HH:mm')}</div>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="details" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">التفاصيل والأصناف</TabsTrigger>
                  <TabsTrigger value="management">الإدارة والعمليات</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6 pt-4">
                  {/* Info Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-gray-50">
                      <CardContent className="pt-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">التاريخ:</span>
                          <span className="font-medium">{format(new Date(selectedOrder.event_date), 'dd/MM/yyyy')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">الوقت:</span>
                          <span className="font-medium">{selectedOrder.event_time || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">المدينة:</span>
                          <span className="font-medium">{selectedOrder.city}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">الموقع:</span>
                          <span className="font-medium">{selectedOrder.stadium}</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-50">
                      <CardContent className="pt-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">المشرف:</span>
                          <span className="font-medium">{selectedOrder.supervisor_name || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">الجوال:</span>
                          <span className="font-medium" dir="ltr">{selectedOrder.supervisor_phone || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">المندوب:</span>
                          <span className="font-medium text-blue-600">{selectedOrder.delivery_staff?.staff_name || 'غير معين'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">المركبة:</span>
                          <span className="font-medium">{selectedOrder.vehicle ? `${selectedOrder.vehicle.brand} (${selectedOrder.vehicle.plate_number})` : 'غير معين'}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Items Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead>المنتج</TableHead>
                          <TableHead>الكود</TableHead>
                          <TableHead>الكمية المطلوبة</TableHead>
                          <TableHead>المرسل</TableHead>
                          <TableHead>المرتجع</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.items?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.product?.product_name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">{item.product?.product_code}</TableCell>
                            <TableCell>{item.quantity_requested} {item.product?.unit}</TableCell>
                            <TableCell>{item.quantity_dispatched || '-'}</TableCell>
                            <TableCell>{item.quantity_returned || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {selectedOrder.notes && (
                    <div className="bg-yellow-50 p-3 rounded-md border border-yellow-100 text-sm text-yellow-800">
                      <strong>ملاحظات:</strong> {selectedOrder.notes}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="management" className="space-y-6 pt-4">
                  {/* Status Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">تغيير الحالة</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-2">
                        {selectedOrder.status === 'pending' && (
                          <Button onClick={() => handleUpdateStatus('approved')} className="w-full bg-blue-600 hover:bg-blue-700">
                            <CheckCircle2 className="w-4 h-4 ml-2" />
                            اعتماد الطلب
                          </Button>
                        )}
                        
                        {selectedOrder.status === 'approved' && (
                          <Button onClick={() => handleUpdateStatus('preparing')} className="w-full bg-orange-600 hover:bg-orange-700">
                            <Package className="w-4 h-4 ml-2" />
                            بدء التجهيز
                          </Button>
                        )}

                        {selectedOrder.status === 'preparing' && (
                          <Button onClick={() => handleUpdateStatus('ready')} className="w-full bg-cyan-600 hover:bg-cyan-700">
                            <CheckCircle2 className="w-4 h-4 ml-2" />
                            تم التجهيز (جاهز)
                          </Button>
                        )}

                        {selectedOrder.status === 'ready' && (
                          <div className="space-y-2">
                            {(!selectedOrder.delivery_staff_id || !selectedOrder.vehicle_id) && (
                              <div className="text-xs text-red-500 mb-2 font-medium">
                                * يجب تعيين مندوب ومركبة قبل الإرسال
                              </div>
                            )}
                            <Button 
                              onClick={() => handleUpdateStatus('dispatched')} 
                              className="w-full bg-purple-600 hover:bg-purple-700"
                              disabled={!selectedOrder.delivery_staff_id || !selectedOrder.vehicle_id}
                            >
                              <Truck className="w-4 h-4 ml-2" />
                              إرسال الطلب (خصم المخزون)
                            </Button>
                          </div>
                        )}

                        {selectedOrder.status === 'dispatched' && (
                          <Button onClick={() => handleUpdateStatus('delivered')} className="w-full bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="w-4 h-4 ml-2" />
                            تم التسليم للعميل
                          </Button>
                        )}

                        {['pending', 'approved', 'preparing', 'ready'].includes(selectedOrder.status) && (
                          <Button onClick={() => handleUpdateStatus('cancelled')} variant="destructive" className="w-full mt-2">
                            <XCircle className="w-4 h-4 ml-2" />
                            إلغاء الطلب
                          </Button>
                        )}
                      </CardContent>
                    </Card>

                    {/* Assignment Actions */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">تعيين التوصيل</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs">المندوب</Label>
                          <Select 
                            value={assignData.delivery_staff_id} 
                            onValueChange={(val) => setAssignData({...assignData, delivery_staff_id: val})}
                            disabled={['delivered', 'cancelled', 'returned'].includes(selectedOrder.status)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="اختر المندوب" />
                            </SelectTrigger>
                            <SelectContent>
                              {deliveryStaff.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.staff_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">المركبة</Label>
                          <Select 
                            value={assignData.vehicle_id} 
                            onValueChange={(val) => setAssignData({...assignData, vehicle_id: val})}
                            disabled={['delivered', 'cancelled', 'returned'].includes(selectedOrder.status)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="اختر المركبة" />
                            </SelectTrigger>
                            <SelectContent>
                              {vehicles.map(v => (
                                <SelectItem key={v.id} value={v.id}>
                                  {v.brand} {v.model} ({v.plate_number})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {!['delivered', 'cancelled', 'returned'].includes(selectedOrder.status) && (
                          <Button size="sm" onClick={handleAssign} disabled={submitting} className="w-full mt-2">
                            حفظ التعيين
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplyOrders;
