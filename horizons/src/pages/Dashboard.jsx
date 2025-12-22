
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, UserCheck, Wallet, Clock, ListTodo, CalendarDays, BarChart, LogIn, LogOut, User, Settings, FileText, AlertTriangle, Plane, Package, DoorOpen, BedDouble, FolderKanban, BadgeDollarSign, ArrowRight, ShieldCheck, Activity, Plus, Trophy, HelpCircle, MessageSquare, Shield, Truck, Store, BarChart3, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePermission } from '@/contexts/PermissionContext';
import PageTitle from '@/components/PageTitle';
import AttendanceCalendar from '@/components/AttendanceCalendar';
import TodayCard from '@/components/TodayCard';
import AdminMessagesWidget from '@/components/AdminMessagesWidget';
import OmarAssistant from '@/components/OmarAssistant';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';
import { format, getDay, startOfMonth, eachDayOfInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { getMonthlyDeductionSummary } from '@/utils/deductionUtils';
import dayjs from 'dayjs';
import { PERMISSION_CATEGORIES } from '@/utils/permissions';
import { logSystemActivity } from '@/utils/omarTools';

// ========================================
// 🎨 CALENDAR STYLING
// ========================================
const CalendarStyles = () => (
  <style>{`
    .calendar-wrapper {
      width: 100%;
    }
    .calendar-wrapper .react-calendar {
      width: 100% !important;
      border: none !important;
      font-family: inherit !important;
      background: transparent !important;
    }
    .calendar-wrapper .react-calendar__month-view__days {
      display: grid !important;
      grid-template-columns: repeat(7, 1fr) !important;
      gap: 6px !important;
    }
    .calendar-wrapper .react-calendar__tile {
      aspect-ratio: 1 !important;
      padding: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border-radius: 8px !important;
      font-size: 0.875rem !important;
      min-height: 64px !important;
      font-weight: 600 !important;
    }
    .calendar-wrapper .react-calendar__month-view__weekdays {
      text-align: center !important;
      font-weight: bold !important;
      font-size: 0.75rem !important;
      padding-bottom: 8px !important;
    }
    @media (max-width: 768px) {
      .calendar-wrapper .react-calendar__month-view__days {
        gap: 3px !important;
      }
      .calendar-wrapper .react-calendar__tile {
        font-size: 0.75rem !important;
        min-height: 48px !important;
      }
    }
    @media (max-width: 640px) {
      .calendar-wrapper .react-calendar__tile {
        min-height: 40px !important;
        font-size: 0.7rem !important;
      }
    }
  `}</style>
);

// ========================================
// 🎯 ACTION CONFIGURATION
// ========================================
const ALL_ACTIONS = [
// 👤 Personal Actions
{
  id: 'check_in',
  title: 'تسجيل الدخول',
  icon: LogIn,
  permission: 'dashboard',
  category: 'PERSONAL',
  special: 'check_in'
}, {
  id: 'check_out',
  title: 'تسجيل الخروج',
  icon: LogOut,
  permission: 'dashboard',
  category: 'PERSONAL',
  special: 'check_out'
}, {
  id: 'my_tasks',
  title: 'مهامي',
  icon: ListTodo,
  route: '/my-tasks',
  permission: 'my_tasks',
  category: 'PERSONAL'
}, {
  id: 'profile',
  title: 'ملفي الشخصي',
  icon: User,
  route: '/profile',
  permission: 'profile',
  category: 'PERSONAL'
},
// 📝 Requests (Using specialized pages now)
{
  id: 'req_leave',
  title: 'طلب إجازة',
  icon: Plane,
  route: '/request-leave',
  permission: 'my_requests',
  category: 'PERSONAL'
}, {
  id: 'req_custody',
  title: 'طلب عهدة',
  icon: Package,
  route: '/request-custody',
  permission: 'my_requests',
  category: 'PERSONAL'
}, {
  id: 'req_loan',
  title: 'طلب سلفة',
  icon: Wallet,
  route: '/request-loan',
  permission: 'my_requests',
  category: 'PERSONAL'
}, {
  id: 'req_permission',
  title: 'طلب استئذان',
  icon: DoorOpen,
  route: '/request-permission',
  permission: 'my_requests',
  category: 'PERSONAL'
}, {
  id: 'req_other',
  title: 'طلبات أخرى',
  icon: HelpCircle,
  route: '/request-other',
  permission: 'my_requests',
  category: 'PERSONAL'
}, {
  id: 'files',
  title: 'الملفات',
  icon: FolderKanban,
  route: '/files',
  permission: 'files',
  category: 'PERSONAL'
},
// ⚡ Operations
{
  id: 'approvals',
  title: 'الموافقات',
  icon: BedDouble,
  route: '/operations',
  permission: 'request_approvals',
  category: 'OPERATIONS'
}, {
  id: 'justifications',
  title: 'تبرير الغياب',
  icon: FileText,
  route: '/absence-justifications',
  permission: 'absence_justification_review',
  category: 'OPERATIONS'
}, {
  id: 'manager_alerts',
  title: 'تنبيهات إدارية',
  icon: AlertTriangle,
  route: '/manager-alerts',
  permission: 'manager_alerts',
  category: 'OPERATIONS'
},
// 👥 Management
{
  id: 'employees_dir',
  title: 'دليل الموظفين',
  icon: Users,
  route: '/employees',
  permission: 'employees',
  category: 'MANAGEMENT'
}, {
  id: 'emp_manage',
  title: 'إدارة الموظفين',
  icon: Users,
  route: '/employee-management',
  permission: 'employee_management',
  category: 'MANAGEMENT'
}, {
  id: 'attendance_mgmt',
  title: 'إدارة الحضور',
  icon: UserCheck,
  route: '/attendance-management',
  permission: 'attendance_management',
  category: 'MANAGEMENT'
}, {
  id: 'team_attendance',
  title: 'سجل الحضور الشهري',
  icon: CalendarDays,
  route: '/team-attendance',
  permission: 'attendance_management',
  category: 'MANAGEMENT'
}, {
  id: 'risk_dash',
  title: 'تحليل المخاطر',
  icon: Activity,
  route: '/risk-dashboard',
  permission: 'risk_dashboard',
  category: 'MANAGEMENT'
}, {
  id: 'perm_manage',
  title: 'إدارة الصلاحيات',
  icon: ShieldCheck,
  route: '/permission-management',
  permission: 'permission_management',
  category: 'MANAGEMENT'
},
{
  id: 'omar_conversations',
  title: 'محادثات عمر',
  icon: MessageCircle,
  route: '/omar-conversations',
  permission: 'omar_conversations_management',
  category: 'MANAGEMENT'
},
// 🏗️ Projects
{
  id: 'projects',
  title: 'إدارة المشاريع',
  icon: FolderKanban,
  route: '/projects',
  permission: 'projects',
  category: 'PROJECTS'
},
// 💰 Finance
{
  id: 'financial',
  title: 'الإدارة المالية',
  icon: BadgeDollarSign,
  route: '/financial-management',
  permission: 'financial_management',
  category: 'FINANCE'
}, {
  id: 'match_mgmt',
  title: 'إدارة المباريات',
  icon: Trophy,
  route: '/financial-management/match-management',
  permission: 'financial_management',
  category: 'FINANCE'
}, {
  id: 'match_data_entry',
  title: 'إدخال بيانات المباريات',
  icon: Trophy,
  route: '/financial-management/match-data-entry',
  permission: 'match_data_entry',
  category: 'FINANCE'
}, {
  id: 'payroll',
  title: 'مسير الرواتب',
  icon: Wallet,
  route: '/payroll',
  permission: 'payroll',
  category: 'FINANCE'
},
// 🚚 Delivery & Supply
{
  id: 'supply_orders',
  title: 'طلبات التوريد',
  icon: Package,
  route: '/supply-orders',
  permission: 'supply_orders_management',
  category: 'DELIVERY_SUPPLY'
},
{
  id: 'delivery_reports',
  title: 'تقارير التوصيل',
  icon: BarChart3,
  route: '/delivery-reports',
  permission: 'delivery_reports_management',
  category: 'DELIVERY_SUPPLY'
},
// 🔗 External Portals (New category)
{
  id: 'customer_portal',
  title: 'بوابة العملاء',
  icon: Users,
  route: '/customer/login',
  permission: 'customer_portal_access',
  category: 'EXTERNAL_PORTALS'
},
{
  id: 'delivery_portal',
  title: 'بوابة المندوبين',
  icon: Truck,
  route: '/delivery/login',
  permission: 'delivery_portal_access',
  category: 'EXTERNAL_PORTALS'
},
// ⚙️ System
{
  id: 'activity',
  title: 'سجل العمليات',
  icon: FileText,
  route: '/activity-log',
  permission: 'activity_log',
  category: 'SYSTEM'
}, {
  id: 'reports',
  title: 'التقارير',
  icon: BarChart,
  route: '/reports',
  permission: 'reports',
  category: 'SYSTEM'
}, {
  id: 'settings',
  title: 'الإعدادات',
  icon: Settings,
  route: '/settings',
  permission: 'settings',
  category: 'SYSTEM'
}, {
  id: 'gosi_integration',
  title: 'التأمينات (GOSI)',
  description: 'ربط التأمينات الاجتماعية',
  icon: Shield,
  route: '/gosi-integration',
  color: 'bg-teal-500',
  permission: 'gosi_integration',
  category: 'SYSTEM'
}];

// ========================================
// 🧱 COMPONENTS
// ========================================

const StatCard = ({
  title,
  value,
  icon,
  subtitle,
  colorClass
}) => <Card className={`border-l-4 ${colorClass} hover:shadow-md transition-shadow bg-white`}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </CardContent>
  </Card>;

const ActionCard = ({
  title,
  icon: Icon,
  onClick,
  className,
  disabled
}) => <motion.div whileHover={{
  scale: disabled ? 1 : 1.03,
  y: disabled ? 0 : -2
}} transition={{
  type: 'spring',
  stiffness: 400
}} className={`
      rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md border transition-all duration-200
      ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer bg-white hover:border-blue-200'}
      ${className || ''}
    `} onClick={disabled ? undefined : onClick}>
    <div className={`p-2.5 rounded-full mb-3 ${disabled ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'}`}>
      <Icon className="w-6 h-6" />
    </div>
    <span className="text-xs font-bold text-gray-700 line-clamp-1">{title}</span>
  </motion.div>;

const CheckInCard = ({
  title,
  icon: Icon,
  onClick,
  disabled,
  type
}) => {
  const isCheckIn = type === 'check_in';
  return <motion.div whileHover={{
    scale: disabled ? 1 : 1.02
  }} whileTap={{
    scale: disabled ? 1 : 0.98
  }} className={`
        col-span-1 md:col-span-2 rounded-xl p-4 flex items-center justify-between shadow-sm cursor-pointer border
        ${disabled ? 'opacity-60 bg-gray-50 border-gray-200 cursor-not-allowed' : isCheckIn ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 hover:border-emerald-300' : 'bg-gradient-to-r from-rose-50 to-orange-50 border-rose-200 hover:border-rose-300'}
      `} onClick={disabled ? undefined : onClick}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${isCheckIn ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex flex-col items-start">
          <span className={`font-bold text-sm ${isCheckIn ? 'text-emerald-900' : 'text-rose-900'}`}>{title}</span>
          <span className="text-[10px] text-muted-foreground">
            {isCheckIn ? 'سجل حضورك اليومي' : 'إنهاء يوم العمل'}
          </span>
        </div>
      </div>
      <div className={`text-xs font-bold px-2 py-1 rounded ${isCheckIn ? 'bg-white text-emerald-700' : 'bg-white text-rose-700'}`}>
        {isCheckIn ? 'الدخول' : 'الخروج'}
      </div>
    </motion.div>;
};

const CategorySection = ({
  title,
  icon: Icon,
  children
}) => <div className="mb-6 last:mb-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex items-center gap-2 mb-3 px-1">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      <div className="h-px flex-1 bg-gray-100 ml-2"></div>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {children}
    </div>
  </div>;

// 💰 SALARY PERFORMANCE CARD (DETAILED VERSION)
const SalaryPerformanceCard = ({
  profile,
  deductionTotal,
  lateMinutes,
  attendanceRating,
  totalWorkHours,
  leaveBalance,
  loanDeduction,
  loading
}) => {
  const [showSalary, setShowSalary] = useState(false);
  const gosiBase = (profile?.base_salary || 0) + (profile?.housing_allowance || 0);
  const gosiDeduction = gosiBase * 0.0975;
  const grossSalary = (profile?.base_salary || 0) + (profile?.housing_allowance || 0) + (profile?.transportation_allowance || 0);
  const salaryAfterGOSI = grossSalary - gosiDeduction;
  const netSalary = salaryAfterGOSI - deductionTotal - loanDeduction;
  const renderStars = rating => Array.from({
    length: 5
  }, (_, i) => <span key={i} className={`text-2xl ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}>
        ★
      </span>);
  const formatSalary = amount => showSalary ? amount.toLocaleString('ar-SA', {
    style: 'currency',
    currency: 'SAR'
  }) : '•••••••';
  return <Card className="bg-gradient-to-br from-white to-gray-50 border-t-4 border-t-emerald-500">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100 rounded-md">
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
            <span>الراتب والأداء</span>
          </div>
          <button onClick={() => setShowSalary(!showSalary)} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title={showSalary ? 'إخفاء الراتب' : 'إظهار الراتب'}>
            {showSalary ? <ArrowRight className="h-5 w-5 text-gray-600" /> : <Wallet className="h-5 w-5 text-gray-600" />}
          </button>
        </CardTitle>
        <CardDescription className="text-xs">ملخص راتبك وتقييم أدائك هذا الشهر</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <div className="text-center text-muted-foreground py-4">جاري التحميل...</div> : <div className="space-y-3">
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-muted-foreground mb-1">الراتب الصافي المتوقع بعد خصم التامينات </p>
              <p className="text-2xl font-bold text-green-600">{formatSalary(netSalary)}</p>
              {showSalary && <div className="mt-2 text-[10px] space-y-0.5 text-right border-t border-green-100 pt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">الإجمالي:</span>
                    <span className="font-bold">{grossSalary.toLocaleString('ar-SA')} ر.س</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">التأمينات:</span>
                    <span className="text-blue-600 font-bold">-{gosiDeduction.toLocaleString('ar-SA')} ر.س</span>
                  </div>
                  {deductionTotal > 0 && <div className="flex justify-between">
                      <span className="text-red-500">خصومات:</span>
                      <span className="text-red-500 font-bold">-{deductionTotal.toLocaleString('ar-SA')} ر.س</span>
                    </div>}
                  {loanDeduction > 0 && <div className="flex justify-between">
                      <span className="text-orange-500">سلفة:</span>
                      <span className="text-orange-500 font-bold">-{loanDeduction.toLocaleString('ar-SA')} ر.س</span>
                    </div>}
                </div>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col items-center p-2 bg-blue-50 rounded-lg border border-blue-200">
                <Clock className="h-4 w-4 text-blue-500 mb-1" />
                <span className="text-[10px] text-muted-foreground">ساعات العمل</span>
                <span className="text-sm font-bold text-blue-600">{Math.floor(totalWorkHours)} ساعة</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-purple-50 rounded-lg border border-purple-200">
                <Plane className="h-4 w-4 text-purple-500 mb-1" />
                <span className="text-[10px] text-muted-foreground">رصيد الإجازات</span>
                <span className="text-sm font-bold text-purple-600">{leaveBalance} يوم</span>
              </div>
            </div>
            <div className="flex justify-between items-center p-2 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-medium">ساعات التاخير</span>
              </div>
              <span className="text-sm font-bold text-orange-600" dir="ltr">
                {Math.floor(lateMinutes / 60)}:{(lateMinutes % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
              <p className="text-xs text-muted-foreground mb-1">التقييم الالكتروني</p>
              <div className="flex justify-center gap-0.5 mb-1">{renderStars(attendanceRating)}</div>
            </div>
          </div>}
      </CardContent>
    </Card>;
};

// ========================================
// 👥 TEAM DAILY OVERVIEW COMPONENT
// ========================================
const TeamDailyOverview = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const fetchTeamData = async () => {
      // Get all active employees except general_manager and ai_manager
      const { data: emps } = await supabase
        .from('profiles')
        .select('id, name_ar, employee_number')
        .eq('is_active', true)
        .not('role', 'in', '("general_manager","ai_manager")');

      // Get today's attendance
      const { data: attendance } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('work_date', todayStr);

      // Get today's bot messages (alerts)
      const { data: alerts } = await supabase
        .from('bot_messages')
        .select('*')
        .gte('created_at', todayStr);

      // Get active tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('assigned_to')
        .eq('status', 'in_progress');

      // Get today's requests
      const { data: requests } = await supabase
        .from('employee_requests')
        .select('user_id')
        .gte('created_at', todayStr);

      // Combine data for each employee
      const combined = (emps || []).map(emp => {
        const att = attendance?.find(a => a.user_id === emp.id);
        const hasAlert = alerts?.some(a => a.employee_id === emp.id);
        const hasResponse = alerts?.some(a => a.employee_id === emp.id && a.response);
        const hasTask = tasks?.some(t => t.assigned_to === emp.id);
        const hasRequest = requests?.some(r => r.user_id === emp.id);
        
        return {
          ...emp,
          check_in: att?.check_in,
          check_out: att?.check_out,
          hasAlert,
          hasResponse,
          hasTask,
          hasRequest
        };
      });

      setEmployees(combined);
      setLoading(false);
    };

    fetchTeamData();
  }, [todayStr]);

  if (loading) return <div className="text-center py-8">جاري التحميل...</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {employees.map(emp => (
        <div key={emp.id} className="bg-white border rounded-xl p-4 shadow-sm">
          <h4 className="font-bold text-sm mb-3 text-gray-800">{emp.name_ar}</h4>
          <div className="grid grid-cols-2 gap-2">
            {/* Row 1: Check in/out */}
            <div className={`p-2 rounded-lg text-center text-xs ${emp.check_in ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
              <LogIn className="w-4 h-4 mx-auto mb-1" />
              <span>{emp.check_in ? format(new Date(emp.check_in), 'HH:mm') : '--:--'}</span>
            </div>
            <div className={`p-2 rounded-lg text-center text-xs ${emp.check_out ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
              <LogOut className="w-4 h-4 mx-auto mb-1" />
              <span>{emp.check_out ? format(new Date(emp.check_out), 'HH:mm') : '--:--'}</span>
            </div>
            {/* Row 2: Alert/Response */}
            <div className={`p-2 rounded-lg text-center text-xs ${emp.hasAlert ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-400'}`}>
              <AlertTriangle className="w-4 h-4 mx-auto mb-1" />
              <span>{emp.hasAlert ? '✓' : '✗'}</span>
            </div>
            <div className={`p-2 rounded-lg text-center text-xs ${emp.hasResponse ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-400'}`}>
              <MessageSquare className="w-4 h-4 mx-auto mb-1" />
              <span>{emp.hasResponse ? '✓' : '✗'}</span>
            </div>
            {/* Row 3: Task/Request */}
            <div className={`p-2 rounded-lg text-center text-xs ${emp.hasTask ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-400'}`}>
              <ListTodo className="w-4 h-4 mx-auto mb-1" />
              <span>{emp.hasTask ? '✓' : '✗'}</span>
            </div>
            <div className={`p-2 rounded-lg text-center text-xs ${emp.hasRequest ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-400'}`}>
              <FileText className="w-4 h-4 mx-auto mb-1" />
              <span>{emp.hasRequest ? '✓' : '✗'}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ========================================
// 🏠 MAIN DASHBOARD PAGE
// ========================================
const DashboardPage = () => {
  const {
    user,
    profile
  } = useAuth();
  const {
    checkPermission,
    loading: permLoading
  } = usePermission();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState('checked_out');
  const [latestRecordId, setLatestRecordId] = useState(null);
  const [deductionSummary, setDeductionSummary] = useState({
    total: 0
  });
  const [lateMinutes, setLateMinutes] = useState(0);
  const [totalWorkHours, setTotalWorkHours] = useState(0);
  const [attendanceRating, setAttendanceRating] = useState(5);
  const [calculatedLeaveBalance, setCalculatedLeaveBalance] = useState(0);
  const [loanDeduction, setLoanDeduction] = useState(0);

  // New permissions variables
  const canClockInOut = checkPermission('can_clock_in_out') !== false;
  const canViewSalary = checkPermission('can_view_salary') !== false;
  const canViewAttendanceCalendar = checkPermission('can_view_attendance_calendar') !== false;

  const today = useMemo(() => new Date(), []);
  const todayDateString = today.toISOString().split('T')[0];
  const isWeekend = date => {
    const day = getDay(date);
    return day === 5 || day === 6;
  };
  const welcomeName = profile?.name_ar || user?.email?.split('@')[0] || 'المستخدم';
  const calculateAttendanceRating = useCallback((p, t, a) => {
    let r = 5;
    if (p < 90) r = 4;
    if (t > 60) r = 3;
    if (a > 0) r = 2;
    return r;
  }, []);
  const fetchDashboardData = useCallback(async () => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
      const [statusRes, deductionsRes, attendanceRes, leaveRes, loanRes] = await Promise.all([supabase.from('attendance_records').select('id').eq('user_id', user.id).eq('work_date', todayDateString).is('check_out', null).limit(1).maybeSingle(), getMonthlyDeductionSummary(user.id), supabase.from('attendance_records').select('*').eq('user_id', user.id).gte('work_date', monthStart), supabase.rpc('calculate_annual_leave_balance', {
        p_user_id: user.id
      }), supabase.rpc('get_monthly_loan_deduction', {
        p_user_id: user.id
      })]);
      if (statusRes.data) {
        setCurrentStatus('checked_in');
        setLatestRecordId(statusRes.data.id);
      } else {
        setCurrentStatus('checked_out');
        setLatestRecordId(null);
      }
      setDeductionSummary(deductionsRes);
      setCalculatedLeaveBalance(leaveRes.data || 0);
      setLoanDeduction(loanRes.data || 0);
      const monthlyAttendance = attendanceRes.data || [];
      const totalLate = monthlyAttendance.reduce((sum, r) => sum + (r.late_minutes || 0), 0);
      setLateMinutes(totalLate);
      const workMins = monthlyAttendance.reduce((sum, r) => {
        if (r.check_in && r.check_out) return sum + (new Date(r.check_out) - new Date(r.check_in)) / (1000 * 60);
        return sum;
      }, 0);
      setTotalWorkHours(workMins / 60);
      const workingDays = eachDayOfInterval({
        start: startOfMonth(today),
        end: today
      }).filter(d => !isWeekend(d)).length;
      const uniquePresentDays = new Set(monthlyAttendance.filter(r => ['present', 'late'].includes(r.status)).map(r => r.work_date)).size;
      const attendancePercentage = workingDays > 0 ? Math.round(uniquePresentDays / workingDays * 100) : 0;
      
      // Calculate absent days
      const absentDays = workingDays - uniquePresentDays;
      
      setAttendanceRating(calculateAttendanceRating(attendancePercentage, totalLate, absentDays));
      const canViewGeneralStats = checkPermission('reports') || checkPermission('financial_management');
      let generalStats = {};
      if (canViewGeneralStats) {
        const [{
          count: activeEmp
        }, {
          count: pendingReqs
        }] = await Promise.all([supabase.from('profiles').select('*', {
          count: 'exact',
          head: true
        }).eq('is_active', true), supabase.from('employee_requests').select('*', {
          count: 'exact',
          head: true
        }).eq('status', 'pending')]);
        generalStats = {
          activeEmployees: activeEmp || 0,
          pendingRequests: pendingReqs || 0,
          label1: 'إجمالي الموظفين',
          label2: 'طلبات معلقة'
        };
      } else {
        generalStats = {
          label1: 'حضور الشهر',
          value1: `${attendancePercentage}%`,
          label2: 'المهام المنجزة',
          value2: '-'
        };
      }
      setStats(prev => ({
        ...prev,
        ...generalStats,
        attendancePercentage
      }));
    } catch (e) {
      console.error('Dashboard Error:', e);
    } finally {
      setLoading(false);
    }
  }, [user, profile, today, todayDateString, checkPermission, calculateAttendanceRating]);
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const filteredActions = useMemo(() => {
    if (permLoading) return [];
    return ALL_ACTIONS.filter(action => {
      if (action.special) return false;
      // Show "سجل الحضور الشهري" card only for general_manager and operations roles
      if (action.id === 'team_attendance') {
        const userRole = profile?.role;
        return (userRole === 'general_manager' || userRole === 'operations_manager');
      }
      return checkPermission(action.permission);
    });
  }, [checkPermission, permLoading, profile?.role]);
  
  const groupedActions = useMemo(() => {
    const categories = { ...PERMISSION_CATEGORIES,
      EXTERNAL_PORTALS: { label: 'بوابات خارجية', icon: Users }, // Add new category
      DELIVERY_SUPPLY: { label: 'التوصيل والتوريد', icon: Truck } // Add new category
    };

    const groups = {};
    Object.keys(categories).forEach(cat => groups[cat] = []);
    filteredActions.forEach(action => {
      if (action.category && groups[action.category]) groups[action.category].push(action);else {
        if (!groups['PERSONAL']) groups['PERSONAL'] = [];
        groups['PERSONAL'].push(action);
      }
    });
    return groups;
  }, [filteredActions]);

  const handleActionClick = action => {
    if (action.route) navigate(action.route);
  };
  
  const handleCheckIn = async () => {
    try {
      if (currentStatus === 'checked_in') return;
      const checkInTime = new Date();
      const {
        error
      } = await supabase.rpc('handle_check_in', {
        p_user_id: user.id,
        p_check_in_time: dayjs().toISOString()
      });
      if (error) throw error;
      logSystemActivity(user.id, 'CHECK_IN', 'ATTENDANCE', {
        time: checkInTime,
        status: 'present'
      });
      toast({
        title: 'تم تسجيل الحضور',
        className: 'bg-emerald-50 border-emerald-200 text-emerald-800'
      });
      fetchDashboardData();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'فشل',
        description: e.message
      });
    }
  };
  
  const handleCheckOut = async () => {
    try {
      if (currentStatus === 'checked_out') return;
      const checkOutTime = new Date();
      const {
        error
      } = await supabase.from('attendance_records').update({
        check_out: checkOutTime.toISOString()
      }).eq('id', latestRecordId);
      if (error) throw error;
      logSystemActivity(user.id, 'CHECK_OUT', 'ATTENDANCE', {
        time: checkOutTime,
        status: 'left'
      });
      toast({
        title: 'تم تسجيل الخروج',
        className: 'bg-blue-50 border-blue-200 text-blue-800'
      });
      fetchDashboardData();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'فشل',
        description: e.message
      });
    }
  };

  const handleOpenJustificationModal = d => {
    navigate('/attendance');
  };
  
  return <>
      <CalendarStyles />
      <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} className="space-y-4 pb-8">
        <PageTitle title={`مرحباً، ${welcomeName}`} icon={LayoutDashboard} />

        {/* ═══ الصف 1: زر الحضور والانصراف ═══ */}
        {canClockInOut && (
          <Card className="p-3">
            <div className="grid grid-cols-2 gap-3">
              <CheckInCard title="تسجيل الدخول" icon={LogIn} onClick={handleCheckIn} disabled={currentStatus === 'checked_in' || loading || isWeekend(today)} type="check_in" />
              <CheckInCard title="تسجيل الخروج" icon={LogOut} onClick={handleCheckOut} disabled={currentStatus === 'checked_out' || loading} type="check_out" />
            </div>
          </Card>
        )}

        {/* ═══ الصف 2: التاريخ + مركز التنبيهات ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TodayCard />
          <AdminMessagesWidget />
        </div>

        {/* ═══ الصف 3: الراتب والأداء ═══ */}
        {canViewSalary && (
          <SalaryPerformanceCard 
            profile={profile} 
            deductionTotal={deductionSummary.total} 
            lateMinutes={lateMinutes} 
            totalWorkHours={totalWorkHours} 
            leaveBalance={calculatedLeaveBalance} 
            loanDeduction={loanDeduction} 
            attendanceRating={attendanceRating} 
            loading={loading} 
          />
        )}

        {/* ═══ الصف 4: تقويم الحضور (صف كامل) ═══ */}
        {canViewAttendanceCalendar && (
          <Card className="bg-gradient-to-br from-white to-gray-50 border-t-4 border-t-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-1.5 bg-blue-100 rounded-md">
                  <CalendarDays className="h-4 w-4 text-blue-600" />
                </div>
                <span>سجل الحضور</span>
              </CardTitle>
              <CardDescription className="text-xs">سجل حضورك وغيابك هذا الشهر</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="calendar-wrapper">
                <AttendanceCalendar onAbsenceDayClick={handleOpenJustificationModal} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ NEW SECTION: Team Daily Overview (Managers Only) ═══ */}
        {(profile?.role === 'general_manager' || profile?.role === 'operations_manager') && (
          <Card className="bg-gradient-to-br from-white to-gray-50 border-t-4 border-t-indigo-500">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-1.5 bg-indigo-100 rounded-md">
                  <Users className="h-4 w-4 text-indigo-600" />
                </div>
                <span>متابعة الموظفين اليومية</span>
              </CardTitle>
              <CardDescription className="text-xs">نظرة سريعة على حالة جميع الموظفين اليوم</CardDescription>
            </CardHeader>
            <CardContent>
              <TeamDailyOverview />
            </CardContent>
          </Card>
        )}

        {/* ═══ الصف 5: الأقسام ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupedActions.PERSONAL?.length > 0 && <Card className="p-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" /> {PERMISSION_CATEGORIES.PERSONAL.label}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {groupedActions.PERSONAL.map(action => <ActionCard key={action.id} title={action.title} icon={action.icon} onClick={() => handleActionClick(action)} />)}
              </div>
            </Card>}

          {groupedActions.OPERATIONS?.length > 0 && <Card className="p-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-500" /> {PERMISSION_CATEGORIES.OPERATIONS.label}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {groupedActions.OPERATIONS.map(action => <ActionCard key={action.id} title={action.title} icon={action.icon} onClick={() => handleActionClick(action)} />)}
              </div>
            </Card>}

          {groupedActions.PROJECTS?.length > 0 && <Card className="p-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-purple-500" /> {PERMISSION_CATEGORIES.PROJECTS.label}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {groupedActions.PROJECTS.map(action => <ActionCard key={action.id} title={action.title} icon={action.icon} onClick={() => handleActionClick(action)} />)}
              </div>
            </Card>}

          {groupedActions.MANAGEMENT?.length > 0 && <Card className="p-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-500" /> {PERMISSION_CATEGORIES.MANAGEMENT.label}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {groupedActions.MANAGEMENT.map(action => <ActionCard key={action.id} title={action.title} icon={action.icon} onClick={() => handleActionClick(action)} />)}
              </div>
            </Card>}

          {groupedActions.FINANCE?.length > 0 && <Card className="p-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-green-500" /> {PERMISSION_CATEGORIES.FINANCE.label}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {groupedActions.FINANCE.map(action => <ActionCard key={action.id} title={action.title} icon={action.icon} onClick={() => handleActionClick(action)} />)}
              </div>
            </Card>}

          {groupedActions.DELIVERY_SUPPLY?.length > 0 && <Card className="p-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-500" /> {groupedActions.DELIVERY_SUPPLY[0].category_label || 'التوصيل والتوريد'}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {groupedActions.DELIVERY_SUPPLY.map(action => <ActionCard key={action.id} title={action.title} icon={action.icon} onClick={() => handleActionClick(action)} />)}
              </div>
            </Card>}

          {groupedActions.EXTERNAL_PORTALS?.length > 0 && <Card className="p-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-green-500" /> {groupedActions.EXTERNAL_PORTALS[0].category_label || 'بوابات خارجية'}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {groupedActions.EXTERNAL_PORTALS.map(action => <ActionCard key={action.id} title={action.title} icon={action.icon} onClick={() => handleActionClick(action)} />)}
              </div>
            </Card>}

          {groupedActions.SYSTEM?.length > 0 && <Card className="p-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-500" /> {PERMISSION_CATEGORIES.SYSTEM.label}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {groupedActions.SYSTEM.map(action => <ActionCard key={action.id} title={action.title} icon={action.icon} onClick={() => handleActionClick(action)} />)}
              </div>
            </Card>}
        </div>
      </motion.div>
    </>;
};

export default DashboardPage;
