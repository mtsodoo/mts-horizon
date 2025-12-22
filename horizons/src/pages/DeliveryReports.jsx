
// src/pages/DeliveryReports.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Download, 
  Filter, 
  Search, 
  Calendar, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  Clock,
  BarChart3,
  Users
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import * as XLSX from 'xlsx'; // Assuming xlsx is available or use CSV approach if not (package.json has xlsx)

export default function DeliveryReports() {
  const [orders, setOrders] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('all'); // all, thisMonth, lastMonth, thisYear

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch Orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('delivery_orders')
        .select(`
          *,
          customers (customer_name),
          delivery_staff (staff_name)
        `)
        .order('event_date', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch Staff
      const { data: staffData, error: staffError } = await supabase
        .from('delivery_staff')
        .select('*');

      if (staffError) throw staffError;

      setOrders(ordersData || []);
      setStaffList(staffData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Filtering Logic ---
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Status Filter
      if (statusFilter !== 'all' && order.order_status !== statusFilter) return false;

      // 2. Staff Filter
      if (staffFilter !== 'all' && order.assigned_to !== staffFilter) return false;

      // 3. Search Filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const orderNo = order.order_number?.toLowerCase() || '';
        const eventName = order.event_name?.toLowerCase() || '';
        const custName = order.customers?.customer_name?.toLowerCase() || '';
        const staffName = order.delivery_staff?.staff_name?.toLowerCase() || '';
        
        if (!orderNo.includes(query) && !eventName.includes(query) && !custName.includes(query) && !staffName.includes(query)) {
          return false;
        }
      }

      // 4. Date Filter
      if (dateRange !== 'all') {
        const orderDate = new Date(order.event_date);
        const today = new Date();
        
        if (dateRange === 'thisMonth') {
          if (orderDate.getMonth() !== today.getMonth() || orderDate.getFullYear() !== today.getFullYear()) return false;
        } else if (dateRange === 'lastMonth') {
          const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          if (orderDate.getMonth() !== lastMonth.getMonth() || orderDate.getFullYear() !== lastMonth.getFullYear()) return false;
        } else if (dateRange === 'thisYear') {
          if (orderDate.getFullYear() !== today.getFullYear()) return false;
        }
      }

      return true;
    });
  }, [orders, statusFilter, staffFilter, searchQuery, dateRange]);

  // --- Statistics ---
  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const completed = filteredOrders.filter(o => o.order_status === 'delivered').length;
    const cancelled = filteredOrders.filter(o => o.order_status === 'cancelled').length;
    // In Delivery includes: assigned, picked_up, arrived_at_location (basically active but not delivered)
    const inDelivery = filteredOrders.filter(o => ['assigned', 'picked_up', 'arrived'].includes(o.order_status)).length;
    const pending = filteredOrders.filter(o => o.order_status === 'pending').length;

    return { total, completed, cancelled, inDelivery, pending };
  }, [filteredOrders]);

  // --- Staff Performance ---
  const staffPerformance = useMemo(() => {
    return staffList.map(staff => {
      const staffOrders = orders.filter(o => o.assigned_to === staff.id); // Calculate based on ALL orders, or filtered? Usually performance is overall.
      // Let's use filteredOrders if we want to see performance within the selected date range, which is more useful.
      // However, filtering by "Staff Filter" would hide others. So let's filter orders only by date/search for this section, ignoring the specific staff filter if it's set to 'all', 
      // but if a specific staff is selected, we only show that one.
      
      // For the table, we want all staff rows unless filtered.
      // We will compute metrics based on the current date range filter.
      
      const relevantOrders = orders.filter(o => {
        if (dateRange === 'all') return true;
        const orderDate = new Date(o.event_date);
        const today = new Date();
        if (dateRange === 'thisMonth') return orderDate.getMonth() === today.getMonth() && orderDate.getFullYear() === today.getFullYear();
        if (dateRange === 'lastMonth') {
           const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
           return orderDate.getMonth() === lastMonth.getMonth() && orderDate.getFullYear() === lastMonth.getFullYear();
        }
        if (dateRange === 'thisYear') return orderDate.getFullYear() === today.getFullYear();
        return true;
      }).filter(o => o.assigned_to === staff.id);

      const totalAssigned = relevantOrders.length;
      const completedCount = relevantOrders.filter(o => o.order_status === 'delivered').length;
      const cancelledCount = relevantOrders.filter(o => o.order_status === 'cancelled').length;
      const activeCount = relevantOrders.filter(o => ['assigned', 'picked_up', 'arrived'].includes(o.order_status)).length;
      
      const completionRate = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;

      return {
        ...staff,
        totalAssigned,
        completedCount,
        cancelledCount,
        activeCount,
        completionRate
      };
    }).sort((a, b) => b.completedCount - a.completedCount); // Sort by top performers
  }, [orders, staffList, dateRange]);


  // --- Chart Data (Orders per Month) ---
  const chartData = useMemo(() => {
    const months = {};
    const monthsOrder = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    orders.forEach(order => {
      if (!order.event_date) return;
      const date = new Date(order.event_date);
      const monthIndex = date.getMonth();
      const monthName = monthsOrder[monthIndex];
      
      if (!months[monthName]) {
        months[monthName] = { name: monthName, total: 0, completed: 0, cancelled: 0 };
      }
      
      months[monthName].total += 1;
      if (order.order_status === 'delivered') months[monthName].completed += 1;
      if (order.order_status === 'cancelled') months[monthName].cancelled += 1;
    });

    // Convert object to array and sort by month index logic if needed, or just take existing. 
    // Since we initialized static array names, let's map them to ensure order.
    return monthsOrder.map(m => months[m] || { name: m, total: 0, completed: 0, cancelled: 0 });
  }, [orders]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
  const STATUS_COLORS = {
    pending: 'bg-amber-100 text-amber-800',
    assigned: 'bg-blue-100 text-blue-800',
    picked_up: 'bg-indigo-100 text-indigo-800',
    arrived: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };
  const STATUS_LABELS = {
    pending: 'قيد الانتظار',
    assigned: 'تم التعيين',
    picked_up: 'تم الاستلام',
    arrived: 'وصل للموقع',
    delivered: 'تم التسليم',
    cancelled: 'ملغي'
  };

  const handleExport = () => {
    const dataToExport = filteredOrders.map(o => ({
      'رقم الطلب': o.order_number,
      'اسم الفعالية': o.event_name,
      'العميل': o.customers?.customer_name || '-',
      'التاريخ': o.event_date,
      'المدينة': o.city,
      'الحالة': STATUS_LABELS[o.order_status] || o.order_status,
      'المندوب': o.delivery_staff?.staff_name || 'غير معين',
      'ملاحظات': o.delivery_notes || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Delivery Report");
    XLSX.writeFile(wb, `Delivery_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen" dir="rtl">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">تقارير التوصيل</h1>
          <p className="text-slate-500 mt-1">نظرة شاملة على أداء عمليات التوصيل والمندوبين</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="ml-2 h-4 w-4" />
            تصدير التقرير
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">إجمالي الطلبات</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            <p className="text-xs text-slate-500 mt-1">
              {dateRange === 'all' ? 'منذ البداية' : 'خلال الفترة المحددة'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">الطلبات المكتملة</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.completed}</div>
            <p className="text-xs text-green-600 mt-1 font-medium">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% نسبة الإنجاز
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">جاري التوصيل</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.inDelivery}</div>
            <p className="text-xs text-slate-500 mt-1">طلبات نشطة حالياً</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">الطلبات الملغاة</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.cancelled}</div>
            <p className="text-xs text-red-600 mt-1 font-medium">
              {stats.total > 0 ? Math.round((stats.cancelled / stats.total) * 100) : 0}% نسبة الإلغاء
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders" className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
          <TabsList>
            <TabsTrigger value="orders" className="gap-2">
              <Truck className="h-4 w-4" />
              سجل الطلبات
            </TabsTrigger>
            <TabsTrigger value="staff" className="gap-2">
              <Users className="h-4 w-4" />
              أداء المندوبين
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              الرسوم البيانية
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
             <div className="relative w-full sm:w-48">
              <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="بحث..."
                className="pr-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="الفترة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأوقات</SelectItem>
                <SelectItem value="thisMonth">هذا الشهر</SelectItem>
                <SelectItem value="lastMonth">الشهر الماضي</SelectItem>
                <SelectItem value="thisYear">هذا العام</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="delivered">مكتمل</SelectItem>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tab: Orders List */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الطلب</TableHead>
                    <TableHead>الفعالية / العميل</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الموقع</TableHead>
                    <TableHead>المندوب</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">جاري التحميل...</TableCell>
                    </TableRow>
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">لا توجد طلبات مطابقة</TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.order_number}</TableCell>
                        <TableCell>
                          <div className="font-medium">{order.event_name}</div>
                          <div className="text-xs text-slate-500">{order.customers?.customer_name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-slate-600">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(order.event_date), 'dd/MM/yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>{order.city}</TableCell>
                        <TableCell>
                          {order.delivery_staff ? (
                            <span className="text-slate-700">{order.delivery_staff.staff_name}</span>
                          ) : (
                            <span className="text-slate-400 italic">غير معين</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`${STATUS_COLORS[order.order_status]} border-0`}>
                            {STATUS_LABELS[order.order_status] || order.order_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Staff Performance */}
        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>أداء مناديب التوصيل</CardTitle>
              <CardDescription>إحصائيات الأداء للمناديب {dateRange !== 'all' ? 'للفترة المحددة' : 'الكلية'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">المندوب</TableHead>
                    <TableHead className="text-center">إجمالي المسند</TableHead>
                    <TableHead className="text-center">مكتمل</TableHead>
                    <TableHead className="text-center">جاري التنفيذ</TableHead>
                    <TableHead className="text-center">ملغي</TableHead>
                    <TableHead className="text-center">نسبة الإنجاز</TableHead>
                    <TableHead className="w-[200px]">مؤشر الأداء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffPerformance.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableRow>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                              {staff.staff_name.charAt(0)}
                            </div>
                            <div>
                              <div>{staff.staff_name}</div>
                              <div className="text-xs text-slate-400">{staff.phone}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold">{staff.totalAssigned}</TableCell>
                        <TableCell className="text-center text-green-600">{staff.completedCount}</TableCell>
                        <TableCell className="text-center text-amber-600">{staff.activeCount}</TableCell>
                        <TableCell className="text-center text-red-600">{staff.cancelledCount}</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold ${
                            staff.completionRate >= 90 ? 'text-green-600' :
                            staff.completionRate >= 70 ? 'text-blue-600' :
                            'text-amber-600'
                          }`}>
                            {staff.completionRate}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="w-full bg-slate-100 rounded-full h-2.5">
                            <div 
                              className={`h-2.5 rounded-full ${
                                staff.completionRate >= 90 ? 'bg-green-500' :
                                staff.completionRate >= 70 ? 'bg-blue-500' :
                                'bg-amber-500'
                              }`}
                              style={{ width: `${staff.completionRate}%` }}
                            ></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Analytics Chart */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الطلبات الشهرية</CardTitle>
              <CardDescription>توزيع الطلبات المكتملة والملغاة على مدار العام</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Legend />
                  <Bar dataKey="total" name="إجمالي الطلبات" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="completed" name="مكتمل" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="cancelled" name="ملغي" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
