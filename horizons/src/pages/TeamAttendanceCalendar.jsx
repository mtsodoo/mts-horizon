
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Loader2, 
  Users, 
  Clock, 
  AlertTriangle, 
  MessageSquare, 
  ListTodo, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Filter, 
  Monitor 
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const TeamAttendanceCalendar = () => {
  const [currentDate] = useState(new Date());
  const [employeesData, setEmployeesData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // LocalStorage state for filters and widget preference
  const [visibleEmployeeIds, setVisibleEmployeeIds] = useState(() => {
    const saved = localStorage.getItem('team_calendar_visible_employees');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [showDesktopWidget, setShowDesktopWidget] = useState(() => {
    const saved = localStorage.getItem('team_calendar_desktop_widget');
    return saved ? JSON.parse(saved) : false;
  });

  const [allEmployeesList, setAllEmployeesList] = useState([]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (visibleEmployeeIds.length > 0 || employeesData.length > 0) {
      localStorage.setItem('team_calendar_visible_employees', JSON.stringify(visibleEmployeeIds));
    }
  }, [visibleEmployeeIds]);

  useEffect(() => {
    localStorage.setItem('team_calendar_desktop_widget', JSON.stringify(showDesktopWidget));
  }, [showDesktopWidget]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const todayStr = format(currentDate, 'yyyy-MM-dd');

      // 1. Fetch active employees (excluding GM and AI Manager)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name_ar, employee_number, job_title, employee_photo_url, role')
        .eq('is_active', true)
        .not('role', 'in', '("general_manager","ai_manager")')
        .order('name_ar');

      if (profilesError) throw profilesError;

      // Initialize visible IDs if empty (first load)
      if (visibleEmployeeIds.length === 0 && profiles.length > 0) {
        const allIds = profiles.map(p => p.id);
        setVisibleEmployeeIds(allIds);
      }
      
      setAllEmployeesList(profiles);

      // 2. Fetch today's attendance
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('user_id, check_in, check_out')
        .eq('work_date', todayStr);

      if (attendanceError) throw attendanceError;

      // 3. Fetch today's bot alerts
      const { data: alerts, error: alertsError } = await supabase
        .from('bot_messages')
        .select('employee_id, is_read, action_required')
        .gte('created_at', `${todayStr}T00:00:00`)
        .lte('created_at', `${todayStr}T23:59:59`);

      if (alertsError) throw alertsError;

      // 4. Fetch tasks assigned to employees
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('assigned_to')
        .neq('status', 'completed');

      if (tasksError) throw tasksError;

      // 5. Fetch requests made today
      const { data: requests, error: requestsError } = await supabase
        .from('employee_requests')
        .select('user_id')
        .gte('created_at', `${todayStr}T00:00:00`)
        .lte('created_at', `${todayStr}T23:59:59`);

      if (requestsError) throw requestsError;

      // Combine data
      const combinedData = profiles.map(emp => {
        const empAttendance = attendance.find(r => r.user_id === emp.id);
        const empAlerts = alerts.filter(a => a.employee_id === emp.id);
        const hasAlert = empAlerts.length > 0;
        const respondedToAlert = hasAlert && empAlerts.some(a => a.is_read); 

        const hasTasks = tasks.some(t => t.assigned_to === emp.id);
        const hasRequests = requests.some(r => r.user_id === emp.id);

        return {
          ...emp,
          checkIn: empAttendance?.check_in ? format(new Date(empAttendance.check_in), 'HH:mm') : '--:--',
          checkOut: empAttendance?.check_out ? format(new Date(empAttendance.check_out), 'HH:mm') : '--:--',
          hasCheckIn: !!empAttendance?.check_in,
          hasCheckOut: !!empAttendance?.check_out,
          hasAlert,
          respondedToAlert,
          hasTasks,
          hasRequests
        };
      });

      setEmployeesData(combinedData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const toggleEmployeeVisibility = (id) => {
    setVisibleEmployeeIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(empId => empId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSelectAll = () => {
    if (visibleEmployeeIds.length === allEmployeesList.length) {
      setVisibleEmployeeIds([]);
    } else {
      setVisibleEmployeeIds(allEmployeesList.map(emp => emp.id));
    }
  };

  const displayedEmployees = employeesData.filter(emp => visibleEmployeeIds.includes(emp.id));

  const StatusBox = ({ label, value, isActive, icon: Icon, isTime = false, variant = 'default' }) => {
    // Determine colors based on strict prompt requirement
    const containerClass = isActive 
      ? 'bg-emerald-50 border-emerald-200' 
      : 'bg-gray-50 border-gray-200';

    const iconColor = isActive ? 'text-emerald-600' : 'text-gray-400';
    const contentColor = isActive ? 'text-emerald-700' : 'text-gray-500';

    return (
      <div className={`flex flex-col items-center justify-center p-2 rounded-lg border ${containerClass} h-full transition-colors duration-200`}>
        <div className="flex items-center gap-1.5 mb-1">
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
          <span className={`text-[10px] font-semibold ${contentColor}`}>{label}</span>
        </div>
        
        {isTime ? (
          <span className={`text-sm font-bold font-mono ${isActive ? 'text-emerald-900' : 'text-gray-400'}`}>
            {value}
          </span>
        ) : (
          <div className="flex items-center justify-center h-5">
            {isActive ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-300" />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50/50" dir="rtl">
      <Helmet>
        <title>متابعة الموظفين اليومية | نظام إدارة الموارد</title>
      </Helmet>

      {/* Header */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              متابعة الموظفين اليومية
            </h1>
            <p className="text-muted-foreground mt-1">
              نظرة عامة على حالة الفريق ليوم {format(currentDate, 'EEEE d MMMM yyyy', { locale: ar })}
            </p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg border shadow-sm text-sm font-medium text-gray-700">
            {format(currentDate, 'dd/MM/yyyy')}
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-lg border shadow-sm">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 gap-2">
                  <Filter className="w-4 h-4" />
                  فلتر الموظفين
                  {visibleEmployeeIds.length !== allEmployeesList.length && (
                    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-xs">
                      {visibleEmployeeIds.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>عرض الموظفين</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-2">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start text-xs h-8 mb-1"
                        onClick={handleSelectAll}
                    >
                        {visibleEmployeeIds.length === allEmployeesList.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                    </Button>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                    {allEmployeesList.map((emp) => (
                    <DropdownMenuCheckboxItem
                        key={emp.id}
                        checked={visibleEmployeeIds.includes(emp.id)}
                        onCheckedChange={() => toggleEmployeeVisibility(emp.id)}
                        className="text-right justify-end"
                    >
                        {emp.name_ar}
                    </DropdownMenuCheckboxItem>
                    ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse bg-gray-50 px-3 py-1.5 rounded-md border">
            <Switch
              id="desktop-widget-mode"
              checked={showDesktopWidget}
              onCheckedChange={setShowDesktopWidget}
            />
            <Label htmlFor="desktop-widget-mode" className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <Monitor className="w-4 h-4 text-gray-500" />
              إظهار على سطح المكتب
            </Label>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayedEmployees.map((employee) => (
            <Card key={employee.id} className="overflow-hidden hover:shadow-md transition-shadow duration-200">
              <CardHeader className="p-4 bg-white border-b pb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={employee.employee_photo_url} />
                    <AvatarFallback className="bg-primary/5 text-primary">
                      {employee.name_ar?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <CardTitle className="text-base font-bold truncate" title={employee.name_ar}>
                      {employee.name_ar}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground truncate" title={employee.job_title}>
                      {employee.job_title}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <div className="grid grid-cols-2 gap-2 h-full">
                  {/* Row 1: Attendance */}
                  <StatusBox 
                    label="الدخول" 
                    value={employee.checkIn} 
                    isActive={employee.hasCheckIn} 
                    icon={Clock} 
                    isTime={true} 
                  />
                  <StatusBox 
                    label="الخروج" 
                    value={employee.checkOut} 
                    isActive={employee.hasCheckOut} 
                    icon={Clock} 
                    isTime={true} 
                  />

                  {/* Row 2: Alerts */}
                  <StatusBox 
                    label="تنبيه" 
                    isActive={employee.hasAlert} 
                    icon={AlertTriangle} 
                  />
                  <StatusBox 
                    label="رد" 
                    isActive={employee.respondedToAlert} 
                    icon={MessageSquare} 
                  />

                  {/* Row 3: Tasks & Requests */}
                  <StatusBox 
                    label="مهمة" 
                    isActive={employee.hasTasks} 
                    icon={ListTodo} 
                  />
                  <StatusBox 
                    label="طلب" 
                    isActive={employee.hasRequests} 
                    icon={FileText} 
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {displayedEmployees.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center h-48 bg-white rounded-xl border border-dashed text-gray-500">
              <Users className="w-8 h-8 mb-2 opacity-50" />
              <p>لا يوجد موظفين لعرضهم</p>
              {allEmployeesList.length > 0 && visibleEmployeeIds.length === 0 && (
                 <p className="text-xs text-muted-foreground mt-1">قم بتحديد الموظفين من قائمة الفلتر</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamAttendanceCalendar;
