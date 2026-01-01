
import React, { useState, useEffect } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isFriday, 
  isSaturday,
  parseISO,
  isWithinInterval,
  getDay
} from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plane, 
  MoreHorizontal, 
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { checkInEmployee, markAbsent, markLate, markLeave, markPermission, approveRequest, rejectRequest } from '@/utils/attendanceUtils';

const AdminCalendarWidget = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [approvedLeaves, setApprovedLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState('present'); // present, absent, late, leave
  const [lateMinutes, setLateMinutes] = useState(20);
  const [isProcessing, setIsProcessing] = useState(false);

  // New states for permissions
  const [permissionFromTime, setPermissionFromTime] = useState('10:00');
  const [permissionToTime, setPermissionToTime] = useState('12:00');
  const [isMedicalPermission, setIsMedicalPermission] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Day names abbreviation array
  const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  // جلب البيانات
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. جلب الموظفين النشطين (استثناء المدراء)
      const { data: emps, error: empError } = await supabase
        .from('profiles')
        .select('id, name_ar, role, employee_number')
        .eq('is_active', true)
        .not('role', 'in', '("general_manager","ai_manager")')
        .order('employee_number', { ascending: true });

      if (empError) throw empError;

      // 2. جلب سجلات الحضور للشهر الحالي
      const { data: attendance, error: attError } = await supabase
        .from('attendance_records')
        .select('*')
        .gte('work_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('work_date', format(monthEnd, 'yyyy-MM-dd'));

      if (attError) throw attError;

      // 3. جلب الإجازات المعتمدة (يشمل عدة أنواع)
      const { data: leaves, error: leavesError } = await supabase
        .from('employee_requests')
        .select('user_id, start_date, end_date')
        .eq('status', 'approved')
        .in('request_type', ['leave', 'annual', 'sick', 'emergency']);

      if (leavesError) throw leavesError;

      // 4. تنظيم بيانات الحضور
      const attMap = {};
      attendance.forEach(record => {
        if (!attMap[record.user_id]) attMap[record.user_id] = {};
        attMap[record.user_id][record.work_date] = record;
      });

      setEmployees(emps || []);
      setAttendanceData(attMap);
      setApprovedLeaves(leaves || []);

    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشل في تحميل بيانات الكالندر",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const handleDayClick = (employee, day) => {
    setSelectedEmployee(employee);
    setSelectedDay(day);
    
    const dateStr = format(day, 'yyyy-MM-dd');
    
    // التحقق من وجود إجازة معتمدة
    const isOnLeave = approvedLeaves.some(l => 
        l.user_id === employee.id && 
        (dateStr >= l.start_date && dateStr <= l.end_date)
    );

    const record = attendanceData[employee.id]?.[dateStr];
    
    // Reset defaults
    setPermissionFromTime('10:00');
    setPermissionToTime('12:00');
    setIsMedicalPermission(false);

    if (isOnLeave) {
      setActionType('leave');
    } else if (record) {
      if (record.status === 'present') setActionType('present');
      else if (record.status === 'absent') setActionType('absent');
      else if (record.status === 'late') {
        setActionType('late');
        setLateMinutes(record.late_minutes || 20);
      } else if (record.status === 'on_leave') setActionType('leave');
      else if (record.status === 'permission') {
        setActionType('present'); // Default back to present in select, or could add permission to select
        // Pre-fill if needed
      }
    } else {
      setActionType('present');
      setLateMinutes(20);
    }

    setIsDialogOpen(true);
  };

  const handleAction = async (specificType = null) => {
    if (!selectedEmployee || !selectedDay) return;
    
    const type = specificType || actionType;
    setIsProcessing(true);
    const dateStr = format(selectedDay, 'yyyy-MM-dd');
    
    try {
      if (type === 'present') {
        await checkInEmployee(selectedEmployee.id, dateStr);
      } else if (type === 'absent') {
        await markAbsent(selectedEmployee.id, dateStr);
      } else if (type === 'late') {
        await markLate(selectedEmployee.id, dateStr, lateMinutes);
      } else if (type === 'leave') {
        await markLeave(selectedEmployee.id, dateStr);
      } else if (type === 'permission') {
        await markPermission(selectedEmployee.id, dateStr, permissionFromTime, permissionToTime, isMedicalPermission);
      }

      toast({
        title: "تم بنجاح",
        description: `تم تحديث حالة ${selectedEmployee.name_ar} ليوم ${dateStr}`,
        className: "bg-green-50 border-green-200 text-green-800"
      });
      
      setIsDialogOpen(false);
      fetchData(); // تحديث البيانات

    } catch (error) {
      console.error('Action error:', error);
      toast({
        variant: "destructive",
        title: "فشل العملية",
        description: error.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (employeeId, day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const isWeekend = isFriday(day) || isSaturday(day);
    
    // التحقق أولاً من الإجازات المعتمدة
    const isOnLeave = approvedLeaves.some(l => 
        l.user_id === employeeId && 
        (dateStr >= l.start_date && dateStr <= l.end_date)
    );

    if (isOnLeave) return 'bg-blue-100 text-blue-700 border-blue-200';

    const record = attendanceData[employeeId]?.[dateStr];

    if (isWeekend) return 'bg-gray-100 text-gray-400';
    if (!record) return 'bg-white border border-dashed border-gray-200 hover:bg-gray-50';

    switch (record.status) {
      case 'present': return 'bg-green-100 text-green-700 border-green-200';
      case 'late': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'absent': return 'bg-red-100 text-red-700 border-red-200';
      case 'on_leave': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'justified': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'permission': return 'bg-pink-500 text-white';
      case 'medical_permission': return 'bg-cyan-500 text-white';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusIcon = (employeeId, day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    
    // التحقق أولاً من الإجازات المعتمدة
    const isOnLeave = approvedLeaves.some(l => 
        l.user_id === employeeId && 
        (dateStr >= l.start_date && dateStr <= l.end_date)
    );

    if (isOnLeave) return <Plane className="w-3 h-3" />;

    const record = attendanceData[employeeId]?.[dateStr];
    if (!record) return null;

    switch (record.status) {
      case 'present': return <CheckCircle2 className="w-3 h-3" />;
      case 'late': return <Clock className="w-3 h-3" />;
      case 'absent': return <XCircle className="w-3 h-3" />;
      case 'on_leave': return <Plane className="w-3 h-3" />;
      case 'permission': 
      case 'medical_permission': 
        return <Clock className="w-3 h-3" />;
      default: return <MoreHorizontal className="w-3 h-3" />;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-white to-gray-50 border-t-4 border-t-indigo-500 overflow-hidden">
      <CardHeader className="pb-4 border-b bg-white/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 bg-indigo-100 rounded-md">
              <CalendarDays className="h-4 w-4 text-indigo-600" />
            </div>
            <span>لوحة كالندر الموظفين</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8" 
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm font-bold min-w-[100px] text-center">
              {format(currentDate, 'MMMM yyyy', { locale: ar })}
            </span>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8" 
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mr-2 text-xs"
              onClick={() => navigate('/admin-calendar-panel')}
            >
              عرض موسع <ArrowRight className="h-3 w-3 mr-1" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="w-full min-w-[800px]">
              {/* Header Row */}
              <div className="flex border-b bg-gray-50 sticky top-0 z-10">
                <div className="w-48 p-3 text-xs font-bold text-gray-500 sticky right-0 bg-gray-50 border-l z-20">الموظف</div>
                <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${daysInMonth.length}, minmax(32px, 1fr))` }}>
                  {daysInMonth.map(day => (
                    <div 
                      key={day.toString()} 
                      className={cn(
                        "p-2 text-[10px] text-center font-medium border-l last:border-l-0",
                        (isFriday(day) || isSaturday(day)) ? "bg-red-50 text-red-400" : "text-gray-600",
                        isSameDay(day, new Date()) ? "bg-blue-50 text-blue-600 font-bold" : ""
                      )}
                    >
                      <div>{dayNames[getDay(day)]}</div>
                      <div>{format(day, 'd')}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Employee Rows */}
              {employees.map(emp => (
                <div key={emp.id} className="flex border-b last:border-b-0 hover:bg-gray-50 transition-colors group">
                  <div className="w-48 p-2 flex items-center gap-2 sticky right-0 bg-white group-hover:bg-gray-50 border-l z-10">
                    <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-700 border border-indigo-100">
                      {emp.name_ar?.substring(0, 2) || '??'}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-medium truncate" title={emp.name_ar}>
                        {emp.name_ar?.split(' ')[0]} - {emp.employee_number}
                      </p>
                      {/* <p className="text-[10px] text-muted-foreground truncate">{emp.employee_number || '---'}</p> */}
                    </div>
                  </div>
                  
                  <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${daysInMonth.length}, minmax(32px, 1fr))` }}>
                    {daysInMonth.map(day => (
                      <div 
                        key={day.toString()}
                        onClick={() => handleDayClick(emp, day)}
                        className={cn(
                          "border-l last:border-l-0 flex items-center justify-center cursor-pointer transition-all hover:brightness-95",
                          "min-width-[32px] min-height-[32px] h-10", // Added min-width and min-height, kept h-10 for consistent baseline
                          getStatusColor(emp.id, day)
                        )}
                        title={`${format(day, 'yyyy-MM-dd')}: ${attendanceData[emp.id]?.[format(day, 'yyyy-MM-dd')]?.status || 'لم يسجل'}`}
                      >
                        {getStatusIcon(emp.id, day)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Action Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>تحديث حالة الحضور</DialogTitle>
            <DialogDescription>
              {selectedEmployee?.name_ar} - {selectedDay && format(selectedDay, 'PPPP', { locale: ar })}
            </DialogDescription>
          </DialogHeader>

          {/* تفاصيل الحضور الحالية */}
          {selectedDay && selectedEmployee && (() => {
            const dateStr = format(selectedDay, 'yyyy-MM-dd');
            const record = attendanceData[selectedEmployee.id]?.[dateStr];
            
            if (!record) return (
              <div className="bg-gray-50 rounded-lg p-3 text-center text-sm text-gray-500">
                لا يوجد سجل لهذا اليوم
              </div>
            );
            
            const checkInTime = record.check_in ? format(new Date(record.check_in), 'HH:mm') : '--:--';
            const checkOutTime = record.check_out ? format(new Date(record.check_out), 'HH:mm') : '--:--';
            
            let hoursWorked = '--';
            if (record.check_in && record.check_out) {
              const diff = new Date(record.check_out) - new Date(record.check_in);
              const hours = Math.floor(diff / 3600000);
              const mins = Math.floor((diff % 3600000) / 60000);
              hoursWorked = `${hours} ساعة ${mins > 0 ? `و ${mins} دقيقة` : ''}`;
            }
            
            const statusLabels = {
              present: 'حاضر',
              absent: 'غائب',
              late: 'متأخر',
              on_leave: 'إجازة',
              permission: 'استئذان',
              medical_permission: 'استئذان طبي'
            };
            
            const statusColors = {
              present: 'bg-green-100 text-green-800',
              absent: 'bg-red-100 text-red-800',
              late: 'bg-yellow-100 text-yellow-800',
              on_leave: 'bg-blue-100 text-blue-800',
              permission: 'bg-pink-100 text-pink-800',
              medical_permission: 'bg-cyan-100 text-cyan-800'
            };
            
            return (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">الحالة الحالية:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[record.status] || 'bg-gray-100'}`}>
                    {statusLabels[record.status] || record.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-lg border">
                    <p className="text-xs text-gray-500 mb-1">تسجيل الدخول</p>
                    <p className="font-bold text-lg text-green-600">{checkInTime}</p>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg border">
                    <p className="text-xs text-gray-500 mb-1">تسجيل الخروج</p>
                    <p className="font-bold text-lg text-red-600">{checkOutTime}</p>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg border">
                    <p className="text-xs text-gray-500 mb-1">ساعات العمل</p>
                    <p className="font-bold text-blue-600">{hoursWorked}</p>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg border">
                    <p className="text-xs text-gray-500 mb-1">التأخير</p>
                    <p className={`font-bold ${record.late_minutes > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {record.late_minutes > 0 ? `${record.late_minutes} دقيقة` : 'لا يوجد'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status">الحالة</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500"/> حاضر (تحضير)</div>
                  </SelectItem>
                  <SelectItem value="absent">
                    <div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-500"/> غائب (تغييب)</div>
                  </SelectItem>
                  <SelectItem value="late">
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-yellow-500"/> متأخر</div>
                  </SelectItem>
                  <SelectItem value="leave">
                    <div className="flex items-center gap-2"><Plane className="w-4 h-4 text-blue-500"/> إجازة</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {actionType === 'late' && (
              <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                <Label htmlFor="minutes">دقائق التأخير (20 دقيقة كحد أدنى)</Label>
                <Input 
                  id="minutes" 
                  type="number" 
                  min="20"
                  value={lateMinutes}
                  onChange={(e) => setLateMinutes(e.target.value)}
                  className="col-span-3" 
                />
              </div>
            )}

            <div className="border-t pt-3 mt-3">
              <p className="text-sm font-medium mb-2">استئذان:</p>
              <div className="flex items-center gap-2 mb-2">
                <label className="flex items-center gap-1 text-sm">
                  <input 
                    type="checkbox" 
                    checked={isMedicalPermission} 
                    onChange={(e) => setIsMedicalPermission(e.target.checked)}
                    className="rounded"
                  />
                  طبي
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Input type="time" value={permissionFromTime} onChange={e => setPermissionFromTime(e.target.value)} className="w-24" />
                <span>إلى</span>
                <Input type="time" value={permissionToTime} onChange={e => setPermissionToTime(e.target.value)} className="w-24" />
                <Button className="bg-pink-500 hover:bg-pink-600" onClick={() => handleAction('permission')} disabled={isProcessing}>
                  استئذان
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
            <Button onClick={() => handleAction()} disabled={isProcessing}>
              {isProcessing ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdminCalendarWidget;
