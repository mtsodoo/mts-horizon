
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
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
  Users, 
  FileText, 
  AlertTriangle, 
  Activity, 
  Calendar, 
  Filter, 
  Download,
  Ban,
  CheckCircle2,
  Clock,
  DollarSign,
  MessageSquare
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function SystemReports() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attendance');
  
  // Data States
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [justifications, setJustifications] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [botMessages, setBotMessages] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [quickStats, setQuickStats] = useState({
    activeEmployees: 0,
    pendingJustifications: 0,
    unreadMessages: 0,
    totalDeductions: 0
  });

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [justificationFilter, setJustificationFilter] = useState('all');
  const [messageFilter, setMessageFilter] = useState('all');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'attendance') fetchAttendanceData();
    if (activeTab === 'justifications') fetchJustifications();
    if (activeTab === 'deductions') fetchDeductions();
    if (activeTab === 'bot_messages') fetchBotMessages();
    if (activeTab === 'activity') fetchActivityLogs();
  }, [activeTab, selectedMonth, selectedEmployee, justificationFilter, messageFilter]);

  const fetchInitialData = async () => {
    try {
      // Fetch Employees
      const { data: empData } = await supabase
        .from('profiles')
        .select('id, name_ar, employee_number')
        .eq('is_active', true)
        .order('name_ar');
      
      setEmployees(empData || []);

      // Fetch Quick Stats
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());

      const [
        { count: activeCount },
        { count: pendingCount },
        { count: unreadCount },
        { data: deductionData }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('absence_justifications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('bot_messages').select('*', { count: 'exact', head: true }).eq('is_read', false),
        supabase.from('attendance_deductions')
          .select('amount')
          .gte('deduction_date', start.toISOString())
          .lte('deduction_date', end.toISOString())
      ]);

      const totalDed = deductionData?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;

      setQuickStats({
        activeEmployees: activeCount || 0,
        pendingJustifications: pendingCount || 0,
        unreadMessages: unreadCount || 0,
        totalDeductions: totalDed
      });

    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const start = startOfMonth(parseISO(selectedMonth));
      const end = endOfMonth(parseISO(selectedMonth));

      let query = supabase
        .from('attendance_records')
        .select(`
          *,
          profiles:user_id (name_ar)
        `)
        .gte('work_date', start.toISOString())
        .lte('work_date', end.toISOString());

      if (selectedEmployee !== 'all') {
        query = query.eq('user_id', selectedEmployee);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAttendanceData(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJustifications = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('absence_justifications')
        .select(`
          *,
          profiles:user_id (name_ar)
        `)
        .order('created_at', { ascending: false });

      if (justificationFilter !== 'all') {
        query = query.eq('status', justificationFilter);
      }
      if (selectedEmployee !== 'all') {
        query = query.eq('user_id', selectedEmployee);
      }

      const { data, error } = await query;
      if (error) throw error;
      setJustifications(data || []);
    } catch (error) {
      console.error('Error fetching justifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeductions = async () => {
    setLoading(true);
    try {
      const start = startOfMonth(parseISO(selectedMonth));
      const end = endOfMonth(parseISO(selectedMonth));

      let query = supabase
        .from('attendance_deductions')
        .select(`
          *,
          profiles:user_id (name_ar)
        `)
        .gte('deduction_date', start.toISOString())
        .lte('deduction_date', end.toISOString())
        .order('deduction_date', { ascending: false });

      if (selectedEmployee !== 'all') {
        query = query.eq('user_id', selectedEmployee);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDeductions(data || []);
    } catch (error) {
      console.error('Error fetching deductions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBotMessages = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('bot_messages')
        .select(`
          *,
          profiles:employee_id (name_ar)
        `)
        .order('created_at', { ascending: false });

      if (messageFilter !== 'all') {
        query = query.eq('type', messageFilter);
      }
      if (selectedEmployee !== 'all') {
        query = query.eq('employee_id', selectedEmployee);
      }

      const { data, error } = await query;
      if (error) throw error;
      setBotMessages(data || []);
    } catch (error) {
      console.error('Error fetching bot messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          profiles:user_id (name_ar)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (selectedEmployee !== 'all') {
        query = query.eq('user_id', selectedEmployee);
      }

      const { data, error } = await query;
      if (error) throw error;
      setActivityLogs(data || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Process Attendance Stats
  const processedAttendanceStats = useMemo(() => {
    const stats = {};
    
    // Initialize for all employees
    employees.forEach(emp => {
      stats[emp.id] = {
        name: emp.name_ar,
        present: 0,
        absent: 0,
        late: 0,
        total: 0
      };
    });

    // Populate with data
    attendanceData.forEach(record => {
      if (stats[record.user_id]) {
        stats[record.user_id].total++;
        if (record.status === 'present') stats[record.user_id].present++;
        if (record.status === 'absent') stats[record.user_id].absent++;
        if (record.status === 'late' || (record.late_minutes && record.late_minutes > 0)) stats[record.user_id].late++;
      }
    });

    // If filtering by specific employee, only return that one
    if (selectedEmployee !== 'all') {
      return [stats[selectedEmployee]].filter(Boolean);
    }

    return Object.values(stats);
  }, [attendanceData, employees, selectedEmployee]);

  // Calculations for Deductions Summary
  const deductionSummary = useMemo(() => {
    const summary = {};
    deductions.forEach(d => {
      const uid = d.user_id;
      const name = d.profiles?.name_ar || 'غير معروف';
      if (!summary[uid]) {
        summary[uid] = { name, count: 0, totalAmount: 0 };
      }
      summary[uid].count++;
      summary[uid].totalAmount += Number(d.amount) || 0;
    });
    return Object.values(summary);
  }, [deductions]);

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">تقارير النظام الشاملة</h1>
          <p className="text-slate-500 mt-1">متابعة الأداء والحضور والعمليات في مكان واحد</p>
        </div>
        <div className="flex gap-2">
          {/* Global Filter for Employee */}
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="تصفية حسب الموظف" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الموظفين</SelectItem>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>{emp.name_ar}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">الموظفين النشطين</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{quickStats.activeEmployees}</div>
            <p className="text-xs text-slate-500 mt-1">موظف مسجل في النظام</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">تبريرات معلقة</CardTitle>
            <FileText className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{quickStats.pendingJustifications}</div>
            <p className="text-xs text-slate-500 mt-1">بانتظار المراجعة</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">رسائل غير مقروءة</CardTitle>
            <MessageSquare className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{quickStats.unreadMessages}</div>
            <p className="text-xs text-slate-500 mt-1">تنبيهات بوت النظام</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">خصومات هذا الشهر</CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{quickStats.totalDeductions.toLocaleString()} ريال</div>
            <p className="text-xs text-slate-500 mt-1">إجمالي الخصومات المسجلة</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white p-1 border">
          <TabsTrigger value="attendance" className="gap-2"><Calendar className="h-4 w-4" /> إحصائيات الحضور</TabsTrigger>
          <TabsTrigger value="justifications" className="gap-2"><FileText className="h-4 w-4" /> تبريرات الغياب</TabsTrigger>
          <TabsTrigger value="deductions" className="gap-2"><DollarSign className="h-4 w-4" /> الخصومات</TabsTrigger>
          <TabsTrigger value="bot_messages" className="gap-2"><AlertTriangle className="h-4 w-4" /> رسائل النظام</TabsTrigger>
          <TabsTrigger value="activity" className="gap-2"><Activity className="h-4 w-4" /> سجل العمليات</TabsTrigger>
        </TabsList>

        {/* --- ATTENDANCE TAB --- */}
        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>سجل الحضور والغياب</CardTitle>
                <CardDescription>ملخص شهري لحضور الموظفين</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  type="month" 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-[180px]"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الموظف</TableHead>
                    <TableHead className="text-center">أيام الحضور</TableHead>
                    <TableHead className="text-center">أيام الغياب</TableHead>
                    <TableHead className="text-center">مرات التأخير</TableHead>
                    <TableHead className="text-center">الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
                  ) : processedAttendanceStats.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">لا توجد بيانات</TableCell></TableRow>
                  ) : (
                    processedAttendanceStats.map((stat, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{stat.name}</TableCell>
                        <TableCell className="text-center text-green-600 font-bold">{stat.present}</TableCell>
                        <TableCell className="text-center text-red-600 font-bold">{stat.absent}</TableCell>
                        <TableCell className="text-center text-amber-600 font-bold">{stat.late}</TableCell>
                        <TableCell className="text-center font-bold">{stat.total}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- JUSTIFICATIONS TAB --- */}
        <TabsContent value="justifications" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>تبريرات الغياب</CardTitle>
                <CardDescription>سجل التبريرات المقدمة وحالتها</CardDescription>
              </div>
              <Select value={justificationFilter} onValueChange={setJustificationFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="pending">معلق</SelectItem>
                  <SelectItem value="approved">مقبول</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الموظف</TableHead>
                    <TableHead>تاريخ الغياب</TableHead>
                    <TableHead>السبب</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>ملاحظات المدير</TableHead>
                    <TableHead>تاريخ الطلب</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
                  ) : justifications.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">لا توجد تبريرات</TableCell></TableRow>
                  ) : (
                    justifications.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.profiles?.name_ar || 'غير معروف'}</TableCell>
                        <TableCell>{format(new Date(item.absence_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={item.reason}>{item.reason}</TableCell>
                        <TableCell>
                          <Badge variant={
                            item.status === 'approved' ? 'success' : 
                            item.status === 'rejected' ? 'destructive' : 'secondary'
                          } className={
                            item.status === 'approved' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 
                            item.status === 'rejected' ? 'bg-red-100 text-red-800 hover:bg-red-200' : 
                            'bg-slate-100 text-slate-800'
                          }>
                            {item.status === 'approved' ? 'مقبول' : 
                             item.status === 'rejected' ? 'مرفوض' : 'معلق'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={item.manager_notes}>{item.manager_notes || '-'}</TableCell>
                        <TableCell className="text-slate-500 text-sm">{format(new Date(item.created_at), 'dd/MM/yyyy')}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- DEDUCTIONS TAB --- */}
        <TabsContent value="deductions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>سجل الخصومات</CardTitle>
                  <CardDescription>تفاصيل الخصومات المسجلة للموظفين لشهر {format(parseISO(selectedMonth), 'MMMM yyyy', { locale: ar })}</CardDescription>
                </div>
                <Input 
                  type="month" 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-[160px]"
                />
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الموظف</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
                    ) : deductions.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">لا توجد خصومات</TableCell></TableRow>
                    ) : (
                      deductions.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.profiles?.name_ar || 'غير معروف'}</TableCell>
                          <TableCell>{format(new Date(item.deduction_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="text-red-600 font-bold">{item.amount} ر.س</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.violation_type || 'عام'}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-500 max-w-[200px] truncate">{item.notes}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle>ملخص الخصومات</CardTitle>
                <CardDescription>إجمالي الخصومات لكل موظف</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deductionSummary.length === 0 ? (
                     <div className="text-center py-4 text-slate-500">لا توجد بيانات</div>
                  ) : (
                    deductionSummary.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 border rounded-lg bg-slate-50">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{item.name}</span>
                          <span className="text-xs text-slate-500">{item.count} عمليات خصم</span>
                        </div>
                        <div className="text-red-600 font-bold">
                          {item.totalAmount.toLocaleString()} ر.س
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- BOT MESSAGES TAB --- */}
        <TabsContent value="bot_messages" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>رسائل البوت والتنبيهات</CardTitle>
                <CardDescription>سجل التنبيهات المرسلة من النظام للموظفين</CardDescription>
              </div>
              <Select value={messageFilter} onValueChange={setMessageFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="نوع الرسالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="warning">تحذير</SelectItem>
                  <SelectItem value="info">معلومة</SelectItem>
                  <SelectItem value="deduction">خصم</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الموظف</TableHead>
                    <TableHead>العنوان</TableHead>
                    <TableHead>الرسالة</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الوقت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
                  ) : botMessages.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">لا توجد رسائل</TableCell></TableRow>
                  ) : (
                    botMessages.map((msg) => (
                      <TableRow key={msg.id}>
                        <TableCell className="font-medium">{msg.profiles?.name_ar || 'غير معروف'}</TableCell>
                        <TableCell>{msg.title}</TableCell>
                        <TableCell className="max-w-[300px] truncate" title={msg.message}>{msg.message}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            msg.type === 'warning' ? 'border-amber-500 text-amber-700 bg-amber-50' : 
                            msg.type === 'deduction' ? 'border-red-500 text-red-700 bg-red-50' : 
                            'border-blue-500 text-blue-700 bg-blue-50'
                          }>
                            {msg.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {msg.is_read ? 
                            <span className="flex items-center text-xs text-green-600"><CheckCircle2 className="w-3 h-3 ml-1"/> مقروءة</span> : 
                            <span className="flex items-center text-xs text-slate-400"><Clock className="w-3 h-3 ml-1"/> غير مقروءة</span>
                          }
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {format(new Date(msg.created_at), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- ACTIVITY LOGS TAB --- */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>سجل العمليات</CardTitle>
              <CardDescription>آخر 50 عملية تم تسجيلها في النظام</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>نوع العملية</TableHead>
                    <TableHead>تفاصيل</TableHead>
                    <TableHead>الكيان</TableHead>
                    <TableHead>التوقيت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
                  ) : activityLogs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">لا توجد عمليات</TableCell></TableRow>
                  ) : (
                    activityLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.profiles?.name_ar || 'النظام'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{log.action_type}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px] text-sm text-slate-600">
                          {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">{log.entity_type}</TableCell>
                        <TableCell className="text-xs text-slate-500" dir="ltr">
                          {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
