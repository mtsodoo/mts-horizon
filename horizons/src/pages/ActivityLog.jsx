import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/supabaseClient';
import PageTitle from '@/components/PageTitle';
import { 
  Activity, Search, Filter, Download, Clock, User, RefreshCw, FileText, 
  LogIn, CheckCircle, AlertTriangle, DollarSign, Wallet, MessageSquare,
  UserCog, ThumbsUp, ThumbsDown, FileCheck, Bot, CreditCard, Bell,
  LogOut, Plane, Package, Shield, Edit, Trash2, Plus, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('activity_logs')
        .select(`*, profiles:user_id (name_ar, employee_number, department, role, employee_photo_url)`)
        .order('created_at', { ascending: false })
        .limit(200);

      if (filterType !== 'ALL') query = query.ilike('action_type', `%${filterType}%`);

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const channel = supabase
      .channel('realtime_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => fetchLogs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [filterType]);

  // 🎨 تصنيف العمليات بالألوان والأيقونات
  const getActionStyle = (type) => {
    const t = (type || '').toUpperCase();
    
    // 🔐 الدخول والخروج من النظام
    if (t.includes('LOGIN')) return { bg: 'bg-green-100', text: 'text-green-700', label: 'دخول النظام', icon: LogIn };
    if (t.includes('LOGOUT')) return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'خروج من النظام', icon: LogOut };
    
    // ⏰ الحضور والانصراف
    if (t.includes('CHECK_IN')) return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'حضور', icon: CheckCircle };
    if (t.includes('CHECK_OUT')) return { bg: 'bg-rose-100', text: 'text-rose-700', label: 'انصراف', icon: Clock };
    
    // 📋 المهام
    if (t.includes('TASK_CREATE')) return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'مهمة جديدة', icon: Plus };
    if (t.includes('TASK_UPDATE')) return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'تحديث مهمة', icon: Edit };
    if (t.includes('TASK_COMPLETE')) return { bg: 'bg-teal-100', text: 'text-teal-700', label: 'إنجاز مهمة', icon: CheckCircle };
    if (t.includes('TASK')) return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'مهام', icon: FileText };
    
    // 📝 الطلبات
    if (t.includes('REQUEST_CREATE') || t.includes('CREATE_REQUEST')) return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'طلب جديد', icon: Plus };
    if (t.includes('REQUEST_APPROVE') || t.includes('APPROVE')) return { bg: 'bg-green-100', text: 'text-green-700', label: 'موافقة', icon: ThumbsUp };
    if (t.includes('REQUEST_REJECT') || t.includes('REJECT')) return { bg: 'bg-red-100', text: 'text-red-700', label: 'رفض', icon: ThumbsDown };
    if (t.includes('REQUEST')) return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'طلب', icon: FileText };
    
    // 💰 الخصومات والمالية
    if (t.includes('DEDUCTION')) return { bg: 'bg-red-100', text: 'text-red-700', label: 'خصم', icon: DollarSign };
    if (t.includes('PAYROLL')) return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'رواتب', icon: Wallet };
    if (t.includes('LOAN')) return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'سلفة', icon: CreditCard };
    
    // ⚠️ التنبيهات والإنذارات
    if (t.includes('ALERT') || t.includes('WARNING')) return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'تنبيه', icon: AlertTriangle };
    if (t.includes('NOTIFICATION')) return { bg: 'bg-sky-100', text: 'text-sky-700', label: 'إشعار', icon: Bell };
    
    // 📄 التبريرات
    if (t.includes('JUSTIFICATION')) return { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'تبرير', icon: FileCheck };
    
    // 🤖 عمر (البوت)
    if (t.includes('OMAR') || t.includes('BOT') || t.includes('CHAT_RESPONSE') || t.includes('INVESTIGATION')) return { bg: 'bg-violet-100', text: 'text-violet-700', label: 'عمر HR', icon: Bot };
    
    // 👤 الموظفين
    if (t.includes('EMPLOYEE_CREATE')) return { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'موظف جديد', icon: Plus };
    if (t.includes('EMPLOYEE_UPDATE') || t.includes('PROFILE_UPDATE')) return { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'تحديث بيانات', icon: UserCog };
    if (t.includes('EMPLOYEE_DELETE')) return { bg: 'bg-red-100', text: 'text-red-700', label: 'حذف موظف', icon: Trash2 };
    
    // 🛡️ الصلاحيات
    if (t.includes('PERMISSION')) return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'صلاحيات', icon: Shield };
    
    // ✈️ الإجازات
    if (t.includes('LEAVE')) return { bg: 'bg-sky-100', text: 'text-sky-700', label: 'إجازة', icon: Plane };
    
    // 📦 العهد
    if (t.includes('CUSTODY')) return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'عهدة', icon: Package };
    
    // 👁️ المشاهدة
    if (t.includes('VIEW')) return { bg: 'bg-gray-100', text: 'text-gray-600', label: 'مشاهدة', icon: Eye };
    
    // افتراضي
    return { bg: 'bg-slate-100', text: 'text-slate-700', label: type || 'نظام', icon: Activity };
  };

  // 🔥 المترجم الذكي للتفاصيل
  const renderDetails = (log) => {
    const d = log.details || {};
    const type = (log.action_type || '').toUpperCase();

    // 1. الحضور والانصراف
    if (type.includes('CHECK')) {
      const time = d.time ? format(new Date(d.time), 'hh:mm a', { locale: ar }) : '';
      if (type.includes('IN')) return <span className="text-emerald-700 font-bold">✅ تسجيل الحضور الساعة {time}</span>;
      if (type.includes('OUT')) return <span className="text-rose-700 font-bold">🏃 تسجيل الانصراف الساعة {time}</span>;
    }

    // 2. تسجيل الدخول
    if (type.includes('LOGIN')) {
      return <span className="text-green-700">🔐 {d.message || 'تسجيل دخول ناجح'}</span>;
    }

    // 3. المهام
    if (type.includes('TASK')) {
      return (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800">📋 {d.title || d.task_title || 'مهمة'}</span>
          {d.status && <span className="text-xs text-slate-500">الحالة: {d.status}</span>}
          {d.priority && <span className="text-xs text-orange-500">الأولوية: {d.priority}</span>}
        </div>
      );
    }

    // 4. الطلبات
    if (type.includes('REQUEST')) {
      const reqTypes = { 
        'leave': '✈️ إجازة', 
        'loan': '💰 سلفة', 
        'custody': '📦 عهدة', 
        'permission': '🚪 استئذان',
        'other': '📋 أخرى' 
      };
      return (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800">{reqTypes[d.type] || d.type || 'طلب جديد'}</span>
          {d.title && <span className="text-sm text-slate-600">{d.title}</span>}
          {d.amount && <span className="text-xs text-green-600 font-bold">{Number(d.amount).toLocaleString()} ريال</span>}
          {d.date && <span className="text-xs text-slate-500">📅 {d.date}</span>}
          {d.exit_time && <span className="text-xs text-slate-500">🚪 {d.exit_time} - {d.return_time}</span>}
        </div>
      );
    }

    // 5. الخصومات
    if (type.includes('DEDUCTION')) {
      return (
        <div className="flex flex-col">
          <span className="font-bold text-red-700">💸 خصم {d.amount ? `${Number(d.amount).toLocaleString()} ريال` : ''}</span>
          {d.reason && <span className="text-sm text-slate-600">{d.reason}</span>}
          {d.violation_type && <span className="text-xs text-red-500">النوع: {d.violation_type}</span>}
        </div>
      );
    }

    // 6. التنبيهات والإنذارات
    if (type.includes('ALERT') || type.includes('WARNING')) {
      return (
        <div className="flex flex-col">
          <span className="font-bold text-yellow-700">⚠️ {d.title || d.alert_type || 'تنبيه'}</span>
          {d.message && <span className="text-sm text-slate-600">{d.message}</span>}
          {d.level && <span className="text-xs text-orange-500">المستوى: {d.level}</span>}
        </div>
      );
    }

    // 7. التبريرات
    if (type.includes('JUSTIFICATION')) {
      return (
        <div className="flex flex-col">
          <span className="font-bold text-indigo-700">📄 تبرير غياب</span>
          {d.date && <span className="text-xs text-slate-500">التاريخ: {d.date}</span>}
          {d.reason && <span className="text-sm text-slate-600">{d.reason}</span>}
          {d.status && <span className={`text-xs font-bold ${d.status === 'approved' ? 'text-green-600' : d.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>
            {d.status === 'approved' ? '✅ مقبول' : d.status === 'rejected' ? '❌ مرفوض' : '⏳ قيد المراجعة'}
          </span>}
        </div>
      );
    }

    // 8. محادثات عمر
    if (type.includes('OMAR') || type.includes('BOT') || type.includes('CHAT') || type.includes('INVESTIGATION')) {
      return (
        <div className="flex flex-col">
          <span className="font-bold text-violet-700">🤖 محادثة مع عمر</span>
          {d.ticketId && <span className="text-xs text-slate-400">رقم الملف: {d.ticketId?.slice(0, 8)}</span>}
          {d.hasFile && <span className="text-xs text-blue-500">📎 يوجد مرفق</span>}
          {d.isFinalDecision && <span className="text-xs text-green-600 font-bold">✅ قرار نهائي</span>}
        </div>
      );
    }

    // 9. الرواتب
    if (type.includes('PAYROLL')) {
      return (
        <div className="flex flex-col">
          <span className="font-bold text-emerald-700">💵 عملية رواتب</span>
          {d.month && <span className="text-xs text-slate-500">الشهر: {d.month}</span>}
          {d.total && <span className="text-sm text-green-600 font-bold">{Number(d.total).toLocaleString()} ريال</span>}
          {d.status && <span className="text-xs text-slate-500">الحالة: {d.status}</span>}
        </div>
      );
    }

    // 10. الموظفين
    if (type.includes('EMPLOYEE') || type.includes('PROFILE')) {
      return (
        <div className="flex flex-col">
          <span className="font-bold text-cyan-700">👤 {d.action || 'تحديث بيانات'}</span>
          {d.employee_name && <span className="text-sm text-slate-600">{d.employee_name}</span>}
          {d.field && <span className="text-xs text-slate-500">الحقل: {d.field}</span>}
        </div>
      );
    }

    // 11. الموافقات والرفض
    if (type.includes('APPROVE')) {
      return <span className="text-green-700 font-bold">✅ تمت الموافقة {d.title ? `على: ${d.title}` : ''}</span>;
    }
    if (type.includes('REJECT')) {
      return <span className="text-red-700 font-bold">❌ تم الرفض {d.title ? `على: ${d.title}` : ''} {d.reason ? `- السبب: ${d.reason}` : ''}</span>;
    }

    // 12. الصلاحيات
    if (type.includes('PERMISSION')) {
      return (
        <div className="flex flex-col">
          <span className="font-bold text-amber-700">🛡️ تعديل صلاحيات</span>
          {d.role && <span className="text-xs text-slate-500">الدور: {d.role}</span>}
          {d.permission && <span className="text-xs text-slate-500">الصلاحية: {d.permission}</span>}
        </div>
      );
    }

    // افتراضي
    return d.message || d.title || d.action || (
      <span className="font-mono text-xs text-slate-500 truncate max-w-[300px] block" title={JSON.stringify(d)}>
        {Object.keys(d).length > 0 ? JSON.stringify(d) : 'بدون تفاصيل'}
      </span>
    );
  };

  const filteredLogs = logs.filter(log => 
    log.profiles?.name_ar?.includes(searchTerm) || 
    JSON.stringify(log.details).includes(searchTerm) ||
    log.action_type?.includes(searchTerm)
  );

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500">
      <Helmet><title>سجل العمليات</title></Helmet>
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <PageTitle title="سجل العمليات الحي" icon={Activity} description="مراقبة حية لجميع عمليات النظام" />
        <Button variant="outline" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {/* الإحصائيات السريعة */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'الكل', value: logs.length, color: 'bg-slate-100 text-slate-700' },
          { label: 'حضور/انصراف', value: logs.filter(l => l.action_type?.includes('CHECK')).length, color: 'bg-emerald-100 text-emerald-700' },
          { label: 'طلبات', value: logs.filter(l => l.action_type?.includes('REQUEST')).length, color: 'bg-orange-100 text-orange-700' },
          { label: 'خصومات', value: logs.filter(l => l.action_type?.includes('DEDUCTION')).length, color: 'bg-red-100 text-red-700' },
          { label: 'تنبيهات', value: logs.filter(l => l.action_type?.includes('ALERT') || l.action_type?.includes('WARNING')).length, color: 'bg-yellow-100 text-yellow-700' },
          { label: 'عمر', value: logs.filter(l => l.action_type?.includes('CHAT') || l.action_type?.includes('INVESTIGATION')).length, color: 'bg-violet-100 text-violet-700' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.color} rounded-lg p-3 text-center`}>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs">{stat.label}</div>
          </div>
        ))}
      </div>

      <Card className="border-t-4 border-t-blue-600 shadow-lg bg-slate-50/50">
        <CardHeader className="pb-4 border-b bg-white">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="بحث بالاسم أو التفاصيل..." 
                className="pr-10" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <Filter className="w-4 h-4 ml-2" />
                <SelectValue placeholder="فلترة حسب النوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">🔘 الكل</SelectItem>
                <SelectItem value="LOGIN">🔐 دخول النظام</SelectItem>
                <SelectItem value="CHECK">⏰ حضور/انصراف</SelectItem>
                <SelectItem value="TASK">📋 المهام</SelectItem>
                <SelectItem value="REQUEST">📝 الطلبات</SelectItem>
                <SelectItem value="DEDUCTION">💰 الخصومات</SelectItem>
                <SelectItem value="ALERT">⚠️ التنبيهات</SelectItem>
                <SelectItem value="JUSTIFICATION">📄 التبريرات</SelectItem>
                <SelectItem value="CHAT">🤖 محادثات عمر</SelectItem>
                <SelectItem value="PAYROLL">💵 الرواتب</SelectItem>
                <SelectItem value="EMPLOYEE">👤 الموظفين</SelectItem>
                <SelectItem value="APPROVE">✅ الموافقات</SelectItem>
                <SelectItem value="REJECT">❌ الرفض</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm text-right bg-white">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b sticky top-0 z-10">
                <tr>
                  <th className="p-4 w-[120px]">الوقت</th>
                  <th className="p-4 w-[150px]">الموظف</th>
                  <th className="p-4 w-[130px]">النوع</th>
                  <th className="p-4">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                      جاري التحميل...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-gray-500">
                      <Activity className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      لا توجد عمليات مسجلة
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const style = getActionStyle(log.action_type);
                    const Icon = style.icon;
                    return (
                      <tr key={log.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="p-4 text-slate-600" dir="ltr">
                          <div className="font-mono font-bold text-base">{format(new Date(log.created_at), 'HH:mm:ss')}</div>
                          <div className="text-xs text-slate-400">{format(new Date(log.created_at), 'yyyy-MM-dd')}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {log.profiles?.employee_photo_url ? (
                              <img src={log.profiles.employee_photo_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                <User className="w-4 h-4 text-slate-500" />
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-800">{log.profiles?.name_ar || 'النظام'}</div>
                              <div className="text-[10px] text-slate-500">{log.profiles?.department || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={`${style.bg} ${style.text} border-0 gap-1 px-2 py-1`}>
                            <Icon size={12} /> {style.label}
                          </Badge>
                        </td>
                        <td className="p-4 align-middle">
                          {renderDetails(log)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* عدد النتائج */}
      <div className="text-center text-sm text-slate-500">
        عرض {filteredLogs.length} من {logs.length} عملية
      </div>
    </div>
  );
}