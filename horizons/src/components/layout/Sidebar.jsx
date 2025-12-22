
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  CalendarCheck, 
  Briefcase, 
  ListChecks, 
  Banknote, 
  Users, 
  Sparkles, 
  Shield, 
  ClipboardList, 
  Activity, 
  AlertTriangle, 
  MessageSquare, 
  CalendarDays, 
  Wallet, 
  Clock, 
  Bell, 
  FolderOpen, 
  Stamp, 
  FolderKanban, 
  Settings, 
  BarChart, 
  FileText, 
  UserCheck, 
  DollarSign, 
  Package, 
  Truck, 
  MessageCircle, 
  User, 
  Trophy 
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePermission } from '@/contexts/PermissionContext';
import { cn } from "@/lib/utils";

const Sidebar = ({ className }) => {
    const { t } = useTranslation();
    const { profile } = useAuth();
    const { checkPermission } = usePermission();

    // ═══════════════════════════════════════════════════════════════
    // 👤 PERSONAL - شخصي
    // ═══════════════════════════════════════════════════════════════
    const personalItems = [
        { to: '/', icon: LayoutDashboard, label: 'لوحة التحكم', permission: 'dashboard' },
        { to: '/profile', icon: User, label: 'ملفي الشخصي', permission: 'profile' },
        { to: '/attendance', icon: Clock, label: 'حضوري', permission: 'my_attendance' },
        { to: '/my-requests', icon: ClipboardList, label: 'طلباتي', permission: 'my_requests' },
        { to: '/my-tasks', icon: ListChecks, label: 'مهامي', permission: 'my_tasks' },
        { to: '/system-messages', icon: MessageSquare, label: 'رسائل النظام', permission: 'system_messages' },
        { to: '/files', icon: FolderOpen, label: 'ملفاتي', permission: 'files' },
    ];

    // ═══════════════════════════════════════════════════════════════
    // ⚡ OPERATIONS - العمليات
    // ═══════════════════════════════════════════════════════════════
    const operationsItems = [
        { to: '/operations', icon: ClipboardList, label: 'الموافقات', permission: 'request_approvals' },
        { to: '/absence-justifications', icon: FileText, label: 'تبرير الغياب', permission: 'absence_justification_review' },
        { to: '/manager-alerts', icon: Bell, label: 'تنبيهات الموظفين', permission: 'manager_alerts' },
        { to: '/admin-messages', icon: MessageSquare, label: 'رسائل الإدارة', permission: 'admin_messages', highlight: true },
    ];

    // ═══════════════════════════════════════════════════════════════
    // 👥 MANAGEMENT - الإدارة
    // ═══════════════════════════════════════════════════════════════
    const managementItems = [
        { to: '/employees', icon: Users, label: 'دليل الموظفين', permission: 'employees' },
        { to: '/employee-management', icon: UserCheck, label: 'إدارة الموظفين', permission: 'employee_management' },
        { to: '/attendance-management', icon: CalendarCheck, label: 'إدارة الحضور', permission: 'attendance_management' },
        { to: '/team-attendance', icon: CalendarDays, label: 'سجل الحضور الشهري', permission: 'attendance_management' },
        { to: '/admin-calendar-panel', icon: CalendarCheck, label: 'لوحة كالندر الموظفين', permission: 'admin_calendar_panel' },
        { to: '/task-management', icon: ListChecks, label: 'إدارة المهام', permission: 'task_management' },
        { to: '/leave-management', icon: CalendarDays, label: 'إدارة الإجازات', permission: 'leave_management' },
        { to: '/risk-dashboard', icon: AlertTriangle, label: 'تحليل المخاطر', permission: 'risk_dashboard' },
        { to: '/permission-management', icon: Shield, label: 'إدارة الصلاحيات', permission: 'permission_management', highlight: true },
        { to: '/omar-conversations', icon: MessageCircle, label: 'محادثات عمر', permission: 'omar_conversations_management' },
    ];

    // ═══════════════════════════════════════════════════════════════
    // 🏗️ PROJECTS - المشاريع
    // ═══════════════════════════════════════════════════════════════
    const projectsItems = [
        { to: '/projects', icon: FolderKanban, label: 'إدارة المشاريع', permission: 'projects' },
    ];

    // ═══════════════════════════════════════════════════════════════
    // 💰 FINANCE - المالية
    // ═══════════════════════════════════════════════════════════════
    const financeItems = [
        { to: '/financial-management', icon: DollarSign, label: 'الإدارة المالية', permission: 'financial_management' },
        { to: '/financial-management/match-management', icon: Trophy, label: 'إدارة المباريات', permission: 'financial_management' },
        { to: '/financial-management/match-data-entry', icon: Trophy, label: 'إدخال بيانات المباريات', permission: 'match_data_entry' },
        { to: '/payroll', icon: Wallet, label: 'مسير الرواتب', permission: 'payroll' },
        { to: '/loan-management', icon: Banknote, label: 'إدارة السلف', permission: 'loan_management' },
        { to: '/custody-management', icon: Briefcase, label: 'إدارة العهد', permission: 'custody_management' },
    ];

    // ═══════════════════════════════════════════════════════════════
    // 🌐 EXTERNAL PORTALS - بوابات خارجية
    // ═══════════════════════════════════════════════════════════════
    const externalPortalsItems = [
        { to: '/customer/login', icon: Users, label: 'بوابة العملاء', permission: 'customer_portal_access' },
        { to: '/delivery/login', icon: Truck, label: 'بوابة المندوبين', permission: 'delivery_portal_access' },
    ];

    // ═══════════════════════════════════════════════════════════════
    // ⚙️ SYSTEM - النظام
    // ═══════════════════════════════════════════════════════════════
    const systemItems = [
        { to: '/activity-log', icon: Activity, label: 'سجل النشاطات', permission: 'activity_log' },
        { to: '/document-stamping', icon: Stamp, label: 'ختم المستندات', permission: 'document_stamping' },
        { to: '/supply-orders', icon: Package, label: 'طلبات التوريد', permission: 'supply_orders_management' },
        { to: '/delivery-reports', icon: Truck, label: 'تقارير التوصيل', permission: 'delivery_reports_management' },
        { to: '/system-reports', icon: FileText, label: 'تقارير النظام', permission: 'reports' },
        { to: '/reports', icon: BarChart, label: 'التقارير', permission: 'reports' },
        { to: '/settings', icon: Settings, label: 'الإعدادات', permission: 'settings' },
        { to: '/gosi-integration', icon: Shield, label: 'التأمينات (GOSI)', permission: 'gosi_integration' },
    ];

    // ✅ فلترة العناصر حسب الصلاحية
    const filterByPermission = (items) => {
        return items.filter(item => {
            if (!item.permission) return true;
            return checkPermission(item.permission);
        });
    };

    const renderNavItem = (item) => (
        <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
                cn(
                    "flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 group",
                    isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    item.highlight && !isActive ? "text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400" : ""
                )
            }
        >
            <item.icon className={cn("h-5 w-5 rtl:ml-3 ltr:mr-3 shrink-0", item.highlight ? "animate-pulse" : "")} />
            <span className="truncate">{item.label}</span>
            {item.highlight && (
                <Shield className="h-3 w-3 ms-auto opacity-70" />
            )}
        </NavLink>
    );

    const renderSection = (title, items, Icon) => {
        const filteredItems = filterByPermission(items);
        if (filteredItems.length === 0) return null;

        return (
            <div className="mb-4">
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-2">
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    <span>{title}</span>
                </div>
                <div className="space-y-1">
                    {filteredItems.map(renderNavItem)}
                </div>
            </div>
        );
    };

    return (
        <div className={cn("flex flex-col h-full bg-card border-r shadow-lg", className)}>
            {/* الهيدر */}
            <div className="flex items-center justify-center h-16 border-b bg-primary/5">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-bold text-foreground">
                        MTS Supreme
                    </h1>
                </div>
            </div>

            {/* القوائم */}
            <nav className="flex-1 overflow-y-auto py-4 px-3">
                {renderSection('شخصي', personalItems, LayoutDashboard)}
                {renderSection('العمليات', operationsItems, Activity)}
                {renderSection('الإدارة', managementItems, Users)}
                {renderSection('المشاريع', projectsItems, FolderKanban)}
                {renderSection('المالية', financeItems, Wallet)}
                {renderSection('بوابات خارجية', externalPortalsItems, Users)}
                {renderSection('النظام', systemItems, Settings)}
            </nav>

            {/* الفوتر */}
            <div className="p-4 border-t bg-muted/10">
                <div className="text-xs text-center text-muted-foreground">
                    <p className="font-medium">{profile?.name_ar || 'مستخدم'}</p>
                    <p className="text-[10px] opacity-70 mt-1">MTS Supreme v2.0</p>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
