import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Users, UserCheck, Wallet, Clock, ListTodo, CalendarDays, BarChart, LogIn, LogOut, User, 
  Settings, FileText, AlertTriangle, Plane, Package, DoorOpen, BedDouble, FolderKanban, BadgeDollarSign, 
  ArrowRight, ShieldCheck, Activity, Trophy, HelpCircle, MessageSquare, Shield, Truck, 
  BarChart3, MessageCircle, FileCheck, FolderOpen, FileSignature, ClipboardList, ExternalLink,
  Building2, Car, UserPlus, FileCheck as FileCheckIcon, ShoppingBag, Warehouse, FolderLock
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePermission } from '@/contexts/PermissionContext';
import PageTitle from '@/components/PageTitle';
import AttendanceCalendar from '@/components/AttendanceCalendar';
import TodayCard from '@/components/TodayCard';
import AdminMessagesWidget from '@/components/AdminMessagesWidget';
import AdminCalendarWidget from '@/components/AdminCalendarWidget';
import PayrollCalendarWidget from '@/components/PayrollCalendarWidget';
import TasksCalendarWidget from '@/components/TasksCalendarWidget';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';
import { format, getDay, startOfMonth, eachDayOfInterval } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import dayjs from 'dayjs';
import { PERMISSION_CATEGORIES } from '@/utils/permissions';
import { logSystemActivity } from '@/utils/omarTools';
import { notifyLateAttendance } from '@/utils/notificationService';
import OmarAssistant from '@/components/OmarAssistant';

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
// 📝 Requests
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
  id: 'loan_verification',
  title: 'توثيق السلف',
  icon: FileSignature,
  route: '/my-loans',
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
{
    id: 'loan_management',
    title: 'السلف',
    icon: Wallet,
    route: '/loan-management',
    permission: 'loan_management',
    category: 'OPERATIONS',
    badge: 'pending_loans'
},
{
  id: 'activity',
  title: 'سجل العمليات',
  icon: FileText,
  route: '/activity-log',
  permission: 'activity_log',
  category: 'OPERATIONS'
},
// 👥 Management
{
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
  id: 'folder_permissions',
  title: 'صلاحيات المجلدات',
  icon: FolderLock,
  route: '/folder-permissions',
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
{
  id: 'admin_calendar',
  title: 'لوحة كالندر الموظفين',
  icon: CalendarDays,
  route: '/admin-calendar-panel',
  permission: 'admin_calendar_panel',
  category: 'MANAGEMENT'
},
{
  id: 'gosi_integration',
  title: 'التأمينات (GOSI)',
  description: 'ربط التأمينات الاجتماعية',
  icon: Shield,
  route: '/gosi-integration',
  color: 'bg-teal-500',
  permission: 'gosi_integration',
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
{
  id: 'quotation_create',
  title: 'إنشاء عرض سعر',
  icon: FileText,
  route: '/quotations/create',
  permission: 'projects',
  category: 'PROJECTS'
},
{
  id: 'quotation_approvals',
  title: 'موافقات عروض الأسعار',
  icon: FileCheck,
  route: '/quotation-approvals',
  permission: 'quotation_approvals',
  category: 'OPERATIONS',
  badge: 'pending_quotations'
},
{
  id: 'quotations_list',
  title: 'عروض الأسعار',
  icon: FolderOpen,
  route: '/quotations',
  permission: 'projects',
  category: 'PROJECTS'
},
{
  id: 'my_clients',
  title: 'عملائي',
  icon: Users,
  route: '/my-clients',
  permission: 'projects',
  category: 'PROJECTS'
},
{
  id: 'project_discussions',
  title: 'مناقشات المشاريع',
  icon: MessageSquare,
  route: '/projects', // Navigate to main projects page for discussion access
  permission: 'project_discussion',
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
{
  id: 'reports',
  title: 'التقارير',
  icon: BarChart,
  route: '/reports',
  permission: 'reports',
  category: 'FINANCE'
},
// ⚙️ System
{
  id: 'settings',
  title: 'الإعدادات',
  icon: Settings,
  route: '/settings',
  permission: 'settings',
  category: 'SYSTEM'
}, 
// Logistics Category
{ 
  id: 'warehouse_mgmt', 
  title: 'إدارة المخزون', 
  icon: Warehouse, 
  route: '/warehouse', 
  permission: 'logistics_management', 
  category: 'LOGISTICS' 
}
];

// ========================================
// 🧱 COMPONENTS - تصميم موحد
// ========================================

// ✅ التصميم الموحد - أفقي (أيقونة + نص في سطر واحد)
const ActionCard = ({
  title,
  icon: Icon,
  onClick,
  className,
  disabled,
  badgeCount
}) => (
  <motion.div 
    whileHover={{ scale: disabled ? 1 : 1.02 }} 
    whileTap={{ scale: disabled ? 1 : 0.98 }}
    transition={{ type: 'spring', stiffness: 400 }}
    className={`
      rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm hover:shadow-md border transition-all duration-200 relative
      ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer bg-white hover:border-blue-200 hover:bg-blue-50/30'}
      ${className || ''}
    `} 
    onClick={disabled ? undefined : onClick}
  >
    {badgeCount > 0 && (
      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] h-5 flex items-center justify-center shadow">
        {badgeCount}
      </div>
    )}
    <div className={`p-2 rounded-lg flex-shrink-0 ${disabled ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600'}`}>
      <Icon className="w-5 h-5" />
    </div>
    <span className="text-sm font-bold text-gray-700 truncate">{title}</span>
  </motion.div>
);

// ✅ نفس تصميم ActionCard بالضبط - موحد
const LogisticsSystemCard = ({ title, icon: Icon, onClick }) => (
  <motion.div 
    whileHover={{ scale: 1.02 }} 
    whileTap={{ scale: 0.98 }}
    transition={{ type: 'spring', stiffness: 400 }}
    className="rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm hover:shadow-md border transition-all duration-200 cursor-pointer bg-white hover:border-blue-200 hover:bg-blue-50/30"
    onClick={onClick}
  >
    <div className="p-2 rounded-lg flex-shrink-0 bg-blue-50 text-blue-600">
      <Icon className="w-5 h-5" />
    </div>
    <span className="text-sm font-bold text-gray-700 truncate">{title}</span>
  </motion.div>
);

const CheckInCard = ({
  title,
  icon: Icon,
  onClick,
  disabled,
  type
}) => {
  const isCheckIn = type === 'check_in';
  return (
    <motion.div 
      whileHover={{ scale: disabled ? 1 : 1.02 }} 
      whileTap={{ scale: disabled ? 1 : 0.98 }} 
      className={`
        col-span-1 md:col-span-2 rounded-xl p-4 flex items-center justify-between shadow-sm cursor-pointer border
        ${disabled ? 'opacity-60 bg-gray-50 border-gray-200 cursor-not-allowed' : isCheckIn ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 hover:border-emerald-300' : 'bg-gradient-to-r from-rose-50 to-orange-50 border-rose-200 hover:border-rose-300'}
      `} 
      onClick={disabled ? undefined : onClick}
    >
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
    </motion.div>
  );
};

// SalaryPerformanceCard component
const SalaryPerformanceCard = ({
  salaryData,
  lateMinutes,
  attendanceRating,
  totalWorkHours,
  leaveBalance,
  loading,
  profile
}) => {
  const [showSalary, setShowSalary] = useState(false);

  const grossSalary = salaryData?.gross_salary || 0;
  const netSalary = salaryData?.net_salary || 0;
  const gosiDeduction = salaryData?.gosi_deduction || 0;
  const proratedSalary = salaryData?.prorated_salary || 0;
  const workingDays = salaryData?.working_days || 0;
  
  const isPartialMonth = workingDays < 30;
  
  const hireDate = profile?.hire_date ? new Date(profile.hire_date) : null;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const isNewEmployee = hireDate && hireDate.getMonth() === currentMonth && hireDate.getFullYear() === currentYear;

  const renderStars = rating => Array.from({
    length: 5
  }, (_, i) => <span key={i} className={`text-2xl ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>);

  const formatSalary = amount => showSalary ? amount.toLocaleString('ar-SA', {
    style: 'currency',
    currency: 'SAR'
  }) : '•••••••';

  return (
    <Card className="bg-gradient-to-br from-white to-gray-50 border-t-4 border-t-emerald-500 relative overflow-hidden">
      {isNewEmployee && (
        <div className="absolute top-2 left-2 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
          موظف جديد
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100 rounded-md">
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <span>الراتب والأداء</span>
              {isNewEmployee && hireDate && (
                <p className="text-[10px] text-gray-500 font-normal">
                  بدأ العمل: {format(hireDate, 'dd/MM/yyyy')}
                </p>
              )}
            </div>
          </div>
          <button onClick={() => setShowSalary(!showSalary)} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title={showSalary ? 'إخفاء الراتب' : 'إظهار الراتب'}>
            {showSalary ? <ArrowRight className="h-5 w-5 text-gray-600" /> : <Wallet className="h-5 w-5 text-gray-600" />}
          </button>
        </CardTitle>
        <CardDescription className="text-xs">ملخص راتبك وتقييم أدائك هذا الشهر</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-muted-foreground py-4">جاري التحميل...</div>
        ) : (
          <div className="space-y-3">
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200 relative">
              {isPartialMonth && (
                <span className="absolute top-1 right-2 bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0.5 rounded-full border border-yellow-200">
                  راتب جزئي ({workingDays} يوم)
                </span>
                )}
              <p className="text-xs text-muted-foreground mb-1">الراتب الصافي المتوقع</p>
              <p className="text-2xl font-bold text-green-600">{formatSalary(netSalary)}</p>
              {showSalary && (
                <div className="mt-2 text-[10px] space-y-0.5 text-right border-t border-green-100 pt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">الإجمالي {isPartialMonth ? '(الكامل)' : ''}:</span>
                    <span className="font-bold">{grossSalary.toLocaleString('ar-SA')} ر.س</span>
                  </div>
                  
                  {isPartialMonth && (
                    <div className="flex justify-between bg-yellow-50 px-1 rounded">
                      <span className="text-yellow-700">الراتب النسبي:</span>
                      <span className="text-yellow-700 font-bold">{proratedSalary.toLocaleString('ar-SA')} ر.س</span>
                    </div>
                  )}

                  {gosiDeduction > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-blue-600">التأمينات:</span>
                      <span className="text-blue-600 font-bold">-{gosiDeduction.toLocaleString('ar-SA')} ر.س</span>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-blue-600">التأمينات:</span>
                      <span className="text-blue-600 font-bold text-[9px]">معفى من التأمينات</span>
                    </div>
                  )}
                </div>
              )}
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ========================================
// 🏠 MAIN DASHBOARD PAGE
// ========================================
const DashboardPage = () => {
  const { user, profile } = useAuth();
  const { checkPermission, loading: permLoading } = usePermission();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState('checked_out');
  const [latestRecordId, setLatestRecordId] = useState(null);
  const [lateMinutes, setLateMinutes] = useState(0);
  const [totalWorkHours, setTotalWorkHours] = useState(0);
  const [attendanceRating, setAttendanceRating] = useState(5);
  const [calculatedLeaveBalance, setCalculatedLeaveBalance] = useState(0);
  const [pendingQuotationsCount, setPendingQuotationsCount] = useState(0);
  const [salaryData, setSalaryData] = useState(null);
  const [pendingLoansCount, setPendingLoansCount] = useState(0);
  const [activeLoansCount, setActiveLoansCount] = useState(0);

  // New permissions variables
  const canClockInOut = checkPermission('can_clock_in_out') !== false;
  const canViewSalary = checkPermission('can_view_salary') !== false;
  const canViewAttendanceCalendar = checkPermission('can_view_attendance_calendar') !== false;
  const canManageLoans = checkPermission('loan_management');
  const canViewLogistics = checkPermission('logistics_management') || profile?.role === 'general_manager' || profile?.role === 'operations_manager' || profile?.role === 'admin';
  
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
      const { error: profileError } = await supabase
        .from('profiles')
        .select('*, gosi_type')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const currentDate = new Date();
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];

      const { data: salaryInfo, error: salaryError } = await supabase.rpc('calculate_employee_salary', {
        p_user_id: user.id,
        p_month: monthStart
      });
      
      if (salaryError) console.error('Salary Calculation Error:', salaryError);
      
      setSalaryData(salaryInfo?.[0] || null);

      if (!canManageLoans) {
        const { count } = await supabase
          .from('employee_loans')
          .select('*', { count: 'exact', head: true })
          .eq('employee_id', user.id)
          .eq('status', 'active');
        setActiveLoansCount(count || 0);
      }

      if (canManageLoans) { 
        const { count: pendingLoans } = await supabase
          .from('employee_loans')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        setPendingLoansCount(pendingLoans || 0);
      }

      const [statusRes, attendanceRes, leaveRes] = await Promise.all([
        supabase.from('attendance_records').select('id').eq('user_id', user.id).eq('work_date', todayDateString).is('check_out', null).limit(1).maybeSingle(),
        supabase.from('attendance_records')
          .select('*')
          .eq('user_id', user.id)
          .gte('work_date', monthStart)
          .lte('work_date', monthEnd),
        supabase.rpc('calculate_annual_leave_balance', { p_user_id: user.id }),
      ]);

      if (statusRes.data) {
        setCurrentStatus('checked_in');
        setLatestRecordId(statusRes.data.id);
      } else {
        setCurrentStatus('checked_out');
        setLatestRecordId(null);
      }
      setCalculatedLeaveBalance(leaveRes.data || 0);

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
      
      const absentDays = workingDays - uniquePresentDays;
      
      setAttendanceRating(calculateAttendanceRating(attendancePercentage, totalLate, absentDays));

      const { count: pendingQuotations } = await supabase
        .from('quotations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_approval');
      
      setPendingQuotationsCount(pendingQuotations || 0);

    } catch (e) {
      console.error('Dashboard Error:', e);
    } finally {
      setLoading(false);
    }
  }, [user, profile, today, todayDateString, checkPermission, calculateAttendanceRating, canManageLoans]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const filteredActions = useMemo(() => {
    if (permLoading) return [];
    return ALL_ACTIONS.filter(action => {
      if (action.special) return false;
      if (action.id === 'team_attendance') {
        const userRole = profile?.role;
        return (userRole === 'general_manager' || userRole === 'operations_manager');
      }
      if (action.id === 'admin_calendar') {
        return checkPermission('admin_calendar_panel');
      }
      
      if (action.id === 'quotation_approvals') {
        const userRole = profile?.role;
        if (['general_manager', 'operations_manager', 'admin', 'super_admin'].includes(userRole)) {
          return true;
        }
        return checkPermission(action.permission);
      }

      if (action.id === 'quotation_create') {
        const userRole = profile?.role;
        if (['project_manager', 'operations_manager', 'general_manager', 'admin', 'super_admin'].includes(userRole)) {
          return true;
        }
        return checkPermission(action.permission);
      }
      
      // Check permission for warehouse_mgmt
      if (action.id === 'warehouse_mgmt') {
          return checkPermission('logistics_management');
      }

      // Check permission for my_clients
      if (action.id === 'my_clients') {
        return checkPermission('projects'); // Assuming 'projects' permission also covers 'my_clients'
      }
      
      // Check permission for project_discussions
      if (action.id === 'project_discussions') {
        return checkPermission('project_discussion'); 
      }


      return checkPermission(action.permission);
    });
  }, [checkPermission, permLoading, profile?.role]);
  
  const groupedActions = useMemo(() => {
    const categories = { ...PERMISSION_CATEGORIES };
    // Add LOGISTICS category if not already defined
    if (!categories.LOGISTICS) {
      categories.LOGISTICS = {
        label: "اللوجستيات",
        icon: Truck
      };
    }

    const groups = {};
    Object.keys(categories).forEach(cat => groups[cat] = []);
    filteredActions.forEach(action => {
      if (action.category === 'EXTERNAL_PORTALS' || action.category === 'DELIVERY_SUPPLY') return; 

      // New handling for LOGISTICS category
      if (action.category === 'LOGISTICS') {
        if (!groups['LOGISTICS']) groups['LOGISTICS'] = [];
        groups['LOGISTICS'].push(action);
        return;
      }

      if (action.category && groups[action.category]) groups[action.category].push(action);
      else {
        if (!groups['PERSONAL']) groups['PERSONAL'] = [];
        groups['PERSONAL'].push(action);
      }
    });
    return groups;
  }, [filteredActions]);

  const handleActionClick = action => {
    if (action.id === 'quotation_approvals' && pendingQuotationsCount > 0) {
      navigate('/quotation-approvals');
    } else if (action.route) {
      navigate(action.route);
    }
  };
  
  const handleCheckIn = async () => {
    try {
      if (currentStatus === 'checked_in') return;
      const checkInTime = new Date();
      const { data: rpcData, error } = await supabase.rpc('handle_check_in', {
        p_user_id: user.id,
        p_check_in_time: dayjs().toISOString()
      });
      if (error) throw error;

      if (rpcData && rpcData.late_minutes > 0) {
        const { data: empData } = await supabase
          .from('profiles')
          .select('phone, name_ar')
          .eq('id', user.id)
          .single();
          
        if (empData?.phone) {
          await notifyLateAttendance(
            empData.phone,
            empData.name_ar,
            rpcData.late_minutes,
            new Date().toLocaleDateString('ar-SA')
          );
        }
      }

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
      const { error } = await supabase.from('attendance_records').update({
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
  
  return (
    <>
      <CalendarStyles />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pb-8">
        <PageTitle title={`مرحباً، ${welcomeName}`} icon={LayoutDashboard} />

        {canClockInOut && (
          <Card className="p-3">
            <div className="grid grid-cols-2 gap-3">
              <CheckInCard title="تسجيل الدخول" icon={LogIn} onClick={handleCheckIn} disabled={currentStatus === 'checked_in' || loading || isWeekend(today)} type="check_in" />
              <CheckInCard title="تسجيل الخروج" icon={LogOut} onClick={handleCheckOut} disabled={currentStatus === 'checked_out' || loading} type="check_out" />
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TodayCard />
          <AdminMessagesWidget />
        </div>

        {canViewSalary && (
          <div className="w-full">
            <SalaryPerformanceCard 
              profile={profile}
              salaryData={salaryData} 
              lateMinutes={lateMinutes} 
              totalWorkHours={totalWorkHours} 
              leaveBalance={calculatedLeaveBalance} 
              attendanceRating={attendanceRating} 
              loading={loading} 
            />
          </div>
        )}

        {/* =======================
            LOGISTICS SYSTEM SECTION
           ======================= */}
        {canViewLogistics && (
          <Card className="p-4">
            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-500" /> النظام اللوجستي
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <LogisticsSystemCard 
                title="بوابة العملاء" 
                icon={Building2} 
                onClick={() => navigate('/customer-portal')} 
              />
              <LogisticsSystemCard 
                title="بوابة التوصيل" 
                icon={Truck} 
                onClick={() => navigate('/delivery/login')} 
              />
              <LogisticsSystemCard 
                title="طلبات الجماهير" 
                icon={ShoppingBag} 
                onClick={() => navigate('/supply-orders')} 
              />
              <LogisticsSystemCard 
                title="إدارة الأسطول" 
                icon={Car} 
                onClick={() => navigate('/fleet')} 
              />
              <LogisticsSystemCard 
                title="الموظفين الخارجيين" 
                icon={UserPlus} 
                onClick={() => navigate('/external-staff')} 
              />
              <LogisticsSystemCard 
                title="محاضر التسليم" 
                icon={FileCheckIcon} 
                onClick={() => navigate('/handover-certificates')} 
              />
              <LogisticsSystemCard 
                title="تقارير التوصيل" 
                icon={BarChart3} 
                onClick={() => navigate('/delivery-reports')} 
              />
              {groupedActions.LOGISTICS?.length > 0 && (
                <>
                  {groupedActions.LOGISTICS.map(action => (
                    <LogisticsSystemCard key={action.id} title={action.title} icon={action.icon} onClick={() => handleActionClick(action)} />
                  ))}
                </>
              )}
            </div>
          </Card>
        )}

        {/* Regular Action Cards - 2 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupedActions.PERSONAL?.length > 0 && (
            <Card className="p-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" /> {PERMISSION_CATEGORIES.PERSONAL.label}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {groupedActions.PERSONAL.map(action => (
                  <ActionCard key={action.id} title={action.title} icon={action.icon} onClick={() => handleActionClick(action)} />
                ))}
              </div>
            </Card>
          )}

          {groupedActions.OPERATIONS?.length > 0 && (
            <Card className="p-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-500" /> {PERMISSION_CATEGORIES.OPERATIONS.label}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {groupedActions.OPERATIONS.map(action => (
                  <ActionCard 
                    key={action.id} 
                    title={action.title} 
                    icon={action.icon} 
                    onClick={() => handleActionClick(action)} 
                    badgeCount={
                      (action.id === 'quotation_approvals' && action.badge === 'pending_quotations') ? pendingQuotationsCount : 
                      (action.badge === 'pending_loans') ? pendingLoansCount : 0
                    }
                  />
                ))}
              </div>
            </Card>
          )}

          {groupedActions.PROJECTS?.length > 0 && (
            <Card className="p-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-purple-500" /> {PERMISSION_CATEGORIES.PROJECTS.label}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {groupedActions.PROJECTS.map(action => (
                  <ActionCard 
                    key={action.id} 
                    title={action.title} 
                    icon={action.icon} 
                    onClick={() => handleActionClick(action)} 
                    badgeCount={action.badge === 'pending_quotations' ? pendingQuotationsCount : 0}
                  />
                ))}
              </div>
            </Card>
          )}

          {groupedActions.MANAGEMENT?.length > 0 && (
            <Card className="p-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-500" /> {PERMISSION_CATEGORIES.MANAGEMENT.label}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {groupedActions.MANAGEMENT.map(action => (
                  <ActionCard key={action.id} title={action.title} icon={action.icon} onClick={() => handleActionClick(action)} />
                ))}
              </div>
            </Card>
          )}

          {groupedActions.FINANCE?.length > 0 && (
            <Card className="p-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-green-500" /> {PERMISSION_CATEGORIES.FINANCE.label}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {groupedActions.FINANCE.map(action => (
                  <ActionCard key={action.id} title={action.title} icon={action.icon} onClick={() => handleActionClick(action)} />
                ))}
              </div>
            </Card>
          )}

          {groupedActions.SYSTEM?.length > 0 && (
            <Card className="p-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-500" /> {PERMISSION_CATEGORIES.SYSTEM.label}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {groupedActions.SYSTEM.map(action => (
                  <ActionCard key={action.id} title={action.title} icon={action.icon} onClick={() => handleActionClick(action)} />
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Attendance Calendar */}
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

        {profile?.role === 'general_manager' && (
          <AdminCalendarWidget />
        )}

        {profile?.role === 'general_manager' && (
          <PayrollCalendarWidget />
        )}

{profile?.role === 'general_manager' && (
          <TasksCalendarWidget />
        )}

        {/* 🤖 مساعد عمر للمدير العام */}
        {profile?.role === 'general_manager' && (
          <OmarAssistant />
        )}
      </motion.div>
    </>
  );
};

export default DashboardPage;