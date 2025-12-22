
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar, 
  Bot, 
  Send, 
  RefreshCw,
  FileText,
  AlertTriangle,
  MessageSquare,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("attendance");
  const { toast } = useToast();
  
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0
  });
  
  const [attendanceData, setAttendanceData] = useState([]);
  const [absentData, setAbsentData] = useState([]);
  const [justifications, setJustifications] = useState([]);
  const [omarConversations, setOmarConversations] = useState([]);
  const [adminResponses, setAdminResponses] = useState([]);
  const [deductions, setDeductions] = useState([]);

  const today = new Date();
  const formattedDate = format(today, 'EEEE، d MMMM yyyy', { locale: ar });
  const dayOfWeek = today.getDay();
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

  const fetchData = async () => {
    setLoading(true);
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      
      // 1. Fetch Stats & Attendance Logic
      // Get all active employees
      const { data: allEmployees } = await supabase
        .from('profiles')
        .select('id, name_ar, employee_number, job_title')
        .eq('is_active', true);

      // Fetch Attendance Details
      const { data: attData } = await supabase
        .from('attendance_records')
        .select(`
          *,
          profiles:user_id (name_ar, employee_number, department, job_title)
        `)
        .eq('work_date', todayStr)
        .order('check_in', { ascending: true });
        
      setAttendanceData(attData || []);

      // Find employees without attendance record today (absent logic)
      const presentIds = attData?.map(r => r.user_id) || [];
      const presentCount = attData?.filter(r => r.status === 'present' || r.status === 'late').length || 0;
      const lateCount = attData?.filter(r => r.status === 'late').length || 0;

      // Calculate absent employees (only on working days)
      let absentEmployees = [];
      if (!isWeekend) {
        absentEmployees = allEmployees?.filter(emp => !presentIds.includes(emp.id)) || [];
      }
      
      setAbsentData(absentEmployees);
      
      setStats({
        totalEmployees: allEmployees?.length || 0,
        presentToday: presentCount,
        absentToday: isWeekend ? 0 : absentEmployees.length,
        lateToday: lateCount
      });

      // 3. Fetch Justifications
      const { data: justData } = await supabase
        .from('absence_justifications')
        .select(`
          *,
          profiles:user_id (name_ar)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
        
      setJustifications(justData || []);

      // 4. Fetch Omar Conversations (Using bot_messages instead of alert_conversations)
      const { data: botData } = await supabase
        .from('bot_messages')
        .select(`
          *,
          profiles:employee_id (name_ar)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
        
      setOmarConversations(botData || []);

      // 5. Fetch Admin Responses
      const { data: reqData } = await supabase
        .from('employee_requests')
        .select(`
          *,
          profiles:user_id (name_ar),
          reviewer:reviewed_by (name_ar)
        `)
        .not('reviewed_at', 'is', null)
        .order('reviewed_at', { ascending: false })
        .limit(100);

      setAdminResponses(reqData || []);

      // 6. Fetch Deductions
      const { data: deductionData } = await supabase
        .from('attendance_deductions')
        .select(`
          *,
          profiles:user_id (name_ar, employee_number)
        `)
        .order('deduction_date', { ascending: false })
        .limit(100);

      setDeductions(deductionData || []);

      toast({
        title: "تم تحديث البيانات",
        description: "تم تحميل أحدث التقارير بنجاح",
        duration: 3000,
      });

    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        variant: "destructive",
        title: "خطأ في التحميل",
        description: "فشل في جلب البيانات، يرجى المحاولة مرة أخرى",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };
  
  // Helper to round numbers in text
  const formatTextNumbers = (text) => {
    if (!text) return '-';
    // Regex matches decimal numbers (e.g. 123.456789) and replaces with 2 decimal places
    return text.replace(/(\d+\.\d+)/g, (match) => {
        return parseFloat(match).toFixed(2);
    });
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50/50" dir="rtl">
      <Helmet>
        <title>التقارير الشاملة | نظام إدارة الموارد</title>
      </Helmet>

      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              التقارير الشاملة
            </h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              {formattedDate}
            </p>
          </div>
          <Button 
            onClick={fetchData} 
            disabled={loading}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث البيانات
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white border-blue-100 shadow-sm hover:shadow-md transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">إجمالي الموظفين</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</h3>
                </div>
                <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-green-100 shadow-sm hover:shadow-md transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">حضور اليوم</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.presentToday}</h3>
                </div>
                <div className="h-12 w-12 bg-green-50 rounded-full flex items-center justify-center group-hover:bg-green-100 transition-colors">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-red-100 shadow-sm hover:shadow-md transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">غياب اليوم</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.absentToday}</h3>
                </div>
                <div className="h-12 w-12 bg-red-50 rounded-full flex items-center justify-center group-hover:bg-red-100 transition-colors">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-yellow-100 shadow-sm hover:shadow-md transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">تأخر اليوم</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.lateToday}</h3>
                </div>
                <div className="h-12 w-12 bg-yellow-50 rounded-full flex items-center justify-center group-hover:bg-yellow-100 transition-colors">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Content */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader className="pb-3 border-b">
            <CardTitle>تفاصيل البيانات</CardTitle>
            <CardDescription>عرض تفصيلي للبيانات والنشاطات الحديثة</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="attendance" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6 pt-4">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 bg-gray-100 p-1 h-auto">
                  <TabsTrigger value="attendance" className="py-2.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                    <Clock className="w-4 h-4 ml-2" />
                    حضور اليوم
                  </TabsTrigger>
                  <TabsTrigger value="justifications" className="py-2.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                    <FileText className="w-4 h-4 ml-2" />
                    أعذار الغياب
                  </TabsTrigger>
                  <TabsTrigger value="omar" className="py-2.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                    <Bot className="w-4 h-4 ml-2" />
                    محادثات عمر
                  </TabsTrigger>
                  <TabsTrigger value="responses" className="py-2.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                    <MessageSquare className="w-4 h-4 ml-2" />
                    ردود الإدارة
                  </TabsTrigger>
                  <TabsTrigger value="deductions" className="py-2.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                    <DollarSign className="w-4 h-4 ml-2" />
                    الخصومات
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6 bg-gray-50/30 min-h-[400px]">
                <TabsContent value="attendance" className="mt-0 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Present Column */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <h3 className="font-semibold text-gray-800">حضور ({attendanceData.filter(r => r.status === 'present').length})</h3>
                      </div>
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-3">
                          {attendanceData.filter(r => r.status === 'present').map((record, i) => (
                            <motion.div 
                              key={record.id}
                              variants={itemVariants}
                              initial="hidden"
                              animate="visible"
                              transition={{ delay: i * 0.05 }}
                              className="flex items-center justify-between p-3 bg-green-50/50 rounded-lg border border-green-100 hover:bg-green-50 transition-colors"
                            >
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{record.profiles?.name_ar || 'غير معروف'}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{record.profiles?.job_title}</p>
                              </div>
                              <Badge variant="outline" className="bg-white text-green-700 border-green-200 text-xs">
                                {format(new Date(record.check_in), 'HH:mm')}
                              </Badge>
                            </motion.div>
                          ))}
                          {attendanceData.filter(r => r.status === 'present').length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm">لا يوجد حضور مسجل اليوم</div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Late Column */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        <h3 className="font-semibold text-gray-800">تأخير ({attendanceData.filter(r => r.status === 'late').length})</h3>
                      </div>
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-3">
                          {attendanceData.filter(r => r.status === 'late').map((record, i) => (
                            <motion.div 
                              key={record.id}
                              variants={itemVariants}
                              initial="hidden"
                              animate="visible"
                              transition={{ delay: i * 0.05 }}
                              className="flex items-center justify-between p-3 bg-yellow-50/50 rounded-lg border border-yellow-100 hover:bg-yellow-50 transition-colors"
                            >
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{record.profiles?.name_ar || 'غير معروف'}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Clock className="w-3 h-3 text-yellow-600" />
                                  <span className="text-xs text-yellow-700 font-medium">{record.late_minutes} دقيقة</span>
                                </div>
                              </div>
                              <Badge variant="outline" className="bg-white text-yellow-700 border-yellow-200 text-xs">
                                {format(new Date(record.check_in), 'HH:mm')}
                              </Badge>
                            </motion.div>
                          ))}
                           {attendanceData.filter(r => r.status === 'late').length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm">لا يوجد تأخير مسجل اليوم</div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Absent Column - Updated to use absentData */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <h3 className="font-semibold text-gray-800">
                          {isWeekend ? 'غياب (عطلة نهاية الأسبوع)' : `غياب (${absentData.length})`}
                        </h3>
                      </div>
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-3">
                          {absentData.map((employee, i) => (
                            <motion.div 
                              key={employee.id}
                              variants={itemVariants}
                              initial="hidden"
                              animate="visible"
                              transition={{ delay: i * 0.05 }}
                              className="flex items-center justify-between p-3 bg-red-50/50 rounded-lg border border-red-100 hover:bg-red-50 transition-colors"
                            >
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{employee.name_ar || 'غير معروف'}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{employee.job_title}</p>
                              </div>
                              <Badge variant="outline" className="bg-white text-red-700 border-red-200 text-xs">
                                غائب
                              </Badge>
                            </motion.div>
                          ))}
                           {absentData.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm">لا يوجد غياب مسجل اليوم</div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="justifications" className="mt-0">
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <ScrollArea className="h-[500px]">
                      <table className="w-full text-right">
                        <thead className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
                          <tr>
                            <th className="p-4 font-medium">الموظف</th>
                            <th className="p-4 font-medium">تاريخ الغياب</th>
                            <th className="p-4 font-medium">السبب</th>
                            <th className="p-4 font-medium">الحالة</th>
                            <th className="p-4 font-medium">تاريخ الرفع</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {justifications.map((just) => (
                            <tr key={just.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="p-4 font-medium text-gray-900">{just.profiles?.name_ar || 'غير معروف'}</td>
                              <td className="p-4 text-gray-600 font-en">{format(new Date(just.absence_date), 'dd/MM/yyyy')}</td>
                              <td className="p-4 text-gray-600 max-w-xs truncate">{just.reason}</td>
                              <td className="p-4">
                                <Badge className={`
                                  ${just.status === 'approved' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 
                                    just.status === 'rejected' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 
                                    'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}
                                `}>
                                  {just.status === 'approved' ? 'مقبول' : just.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                                </Badge>
                              </td>
                              <td className="p-4 text-gray-500 text-sm font-en">{format(new Date(just.created_at), 'dd/MM/yyyy HH:mm')}</td>
                            </tr>
                          ))}
                          {justifications.length === 0 && (
                             <tr>
                               <td colSpan="5" className="p-8 text-center text-gray-400">لا توجد أعذار غياب حديثة</td>
                             </tr>
                          )}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="omar" className="mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {omarConversations.map((msg, i) => {
                      // Using bot_messages data structure:
                      const isWarning = msg.type === 'warning';
                      return (
                        <motion.div 
                          key={msg.id}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          transition={{ delay: i * 0.05 }}
                          className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full shrink-0 ${isWarning ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                              {isWarning ? <AlertTriangle className="w-5 h-5 text-yellow-600" /> : <Bot className="w-5 h-5 text-blue-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="font-semibold text-gray-900 text-sm truncate">{msg.profiles?.name_ar || 'مستخدم'}</h4>
                                <span className="text-xs text-gray-400 font-en whitespace-nowrap">{format(new Date(msg.created_at), 'dd/MM HH:mm')}</span>
                              </div>
                              <p className="text-sm font-bold text-gray-800 mb-1">{msg.title || 'تنبيه'}</p>
                              <p className="text-sm text-gray-600 leading-relaxed">{msg.message}</p>
                              
                              <div className="mt-3 flex items-center justify-end gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  عمر
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    {omarConversations.length === 0 && (
                      <div className="col-span-full p-12 text-center bg-white rounded-lg border border-dashed border-gray-300">
                        <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">لا توجد محادثات حديثة مع عمر</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="responses" className="mt-0">
                  <div className="space-y-4">
                    {adminResponses.map((res, i) => (
                      <motion.div 
                        key={res.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: i * 0.05 }}
                        className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm hover:border-primary/20 transition-colors"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full shrink-0 ${res.status === 'approved' ? 'bg-green-100' : 'bg-red-100'}`}>
                              {res.status === 'approved' ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-gray-900">{res.profiles?.name_ar}</h4>
                                <Badge variant="outline" className="text-xs font-normal">
                                  {res.request_type}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">{res.title || 'طلب بدون عنوان'}</p>
                              {res.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{res.description}</p>}
                            </div>
                          </div>

                          <div className="flex flex-col md:items-end gap-1 border-t md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0 md:pl-4 md:border-l md:border-gray-100">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">تم الرد بواسطة:</span>
                              <span className="text-sm font-medium text-gray-800">{res.reviewer?.name_ar || 'الإدارة'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400 font-en">
                              <Calendar className="w-3 h-3" />
                              {res.reviewed_at ? format(new Date(res.reviewed_at), 'dd/MM/yyyy HH:mm') : '-'}
                            </div>
                            {res.review_notes && (
                              <div className="mt-2 text-xs bg-gray-50 p-2 rounded text-gray-600 max-w-md w-full">
                                <span className="font-semibold">ملاحظة:</span> {res.review_notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {adminResponses.length === 0 && (
                      <div className="p-12 text-center bg-white rounded-lg border border-dashed border-gray-300">
                        <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">لا توجد ردود إدارية حديثة</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="deductions" className="mt-0">
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <ScrollArea className="h-[500px]">
                      <table className="w-full text-right">
                        <thead className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
                          <tr>
                            <th className="p-4 font-medium">الموظف</th>
                            <th className="p-4 font-medium">تاريخ الخصم</th>
                            <th className="p-4 font-medium">المبلغ</th>
                            <th className="p-4 font-medium">نوع المخالفة</th>
                            <th className="p-4 font-medium">السبب</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {deductions.map((ded) => (
                            <tr key={ded.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="p-4 font-medium text-gray-900">{ded.profiles?.name_ar || 'غير معروف'}</td>
                              <td className="p-4 text-gray-600 font-en">{format(new Date(ded.deduction_date), 'dd/MM/yyyy')}</td>
                              <td className="p-4">
                                <Badge className="bg-red-100 text-red-700">{Number(ded.amount).toFixed(2)} ريال</Badge>
                              </td>
                              <td className="p-4 text-gray-600">{ded.violation_type || ded.deduction_type || '-'}</td>
                              <td className="p-4 text-gray-600 max-w-xs truncate">{formatTextNumbers(ded.notes)}</td>
                            </tr>
                          ))}
                          {deductions.length === 0 && (
                            <tr>
                              <td colSpan="5" className="p-8 text-center text-gray-400">لا توجد خصومات</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Reports;
