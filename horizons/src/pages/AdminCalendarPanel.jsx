
import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { 
    CalendarDays, 
    ChevronLeft, 
    ChevronRight, 
    Filter, 
    User,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Calendar as CalendarIcon
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, getDay, parseISO, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

const STATUS_COLORS = {
    present: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
    late: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200',
    absent: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
    on_leave: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
    justified: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
    weekend: 'bg-gray-100 text-gray-500 border-gray-200',
    default: 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50'
};

const LEGEND_ITEMS = [
    { label: 'حاضر', color: 'bg-green-500' },
    { label: 'تأخير', color: 'bg-yellow-500' },
    { label: 'غياب', color: 'bg-red-500' },
    { label: 'إجازة', color: 'bg-blue-500' },
    { label: 'مبرر', color: 'bg-purple-500' },
    { label: 'عطلة', color: 'bg-gray-400' },
];

const WEEK_DAYS = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

const AdminCalendarPanel = () => {
    const { t } = useTranslation();
    const { profile, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [employees, setEmployees] = useState([]);
    const [attendanceData, setAttendanceData] = useState([]);
    const [leavesData, setLeavesData] = useState([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');
    const [loading, setLoading] = useState(true);
    const [selectedDayDetails, setSelectedDayDetails] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Permission Check
    const isAuthorized = useMemo(() => {
        return profile?.role === 'general_manager' || profile?.role === 'super_admin';
    }, [profile]);

    // Fetch Employees
    useEffect(() => {
        const fetchEmployees = async () => {
            if (!isAuthorized) return;
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, name_ar, employee_number, job_title')
                    .eq('is_active', true)
                    .not('role', 'in', '("general_manager","ai_manager")') // Exclude GM & AI
                    .order('name_ar');

                if (error) throw error;
                setEmployees(data || []);
            } catch (error) {
                console.error("Error fetching employees:", error);
                toast({ variant: "destructive", title: "خطأ", description: "فشل تحميل بيانات الموظفين" });
            }
        };

        if (!authLoading) {
            fetchEmployees();
        }
    }, [isAuthorized, authLoading, toast]);

    // Fetch Attendance & Leaves for Current Month
    useEffect(() => {
        const fetchData = async () => {
            if (!isAuthorized) return;
            setLoading(true);
            const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
            const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

            try {
                // Fetch Attendance
                const { data: attendance, error: attError } = await supabase
                    .from('attendance_records')
                    .select('user_id, work_date, status, late_minutes, check_in, check_out, justified_status, justification')
                    .gte('work_date', start)
                    .lte('work_date', end);

                if (attError) throw attError;

                // Fetch Leaves that overlap with current month
                // Note: This is a simplified fetch, ideally check overlapping ranges properly in SQL or filter in JS if dataset small
                const { data: leaves, error: leavesError } = await supabase
                    .from('employee_requests')
                    .select('user_id, start_date, end_date, request_type, status')
                    .eq('request_type', 'leave')
                    .eq('status', 'approved')
                    .or(`start_date.lte.${end},end_date.gte.${start}`);

                if (leavesError) throw leavesError;

                setAttendanceData(attendance || []);
                setLeavesData(leaves || []);

            } catch (error) {
                console.error("Error fetching calendar data:", error);
                toast({ variant: "destructive", title: "خطأ", description: "فشل تحميل بيانات الحضور" });
            } finally {
                setLoading(false);
            }
        };

        if (employees.length > 0) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [currentMonth, employees, isAuthorized, toast]);

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const filteredEmployees = useMemo(() => {
        if (selectedEmployeeId === 'all') return employees;
        return employees.filter(emp => emp.id === selectedEmployeeId);
    }, [employees, selectedEmployeeId]);

    const getDayStatus = (date, employeeId) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayOfWeek = getDay(date); // 0 = Sunday, 5 = Friday, 6 = Saturday
        
        // 1. Check Weekend (Friday=5, Saturday=6)
        if (dayOfWeek === 5 || dayOfWeek === 6) {
            return { type: 'weekend', label: 'عطلة', color: STATUS_COLORS.weekend };
        }

        // 2. Check Leaves
        const leave = leavesData.find(l => 
            l.user_id === employeeId && 
            isWithinInterval(date, { start: parseISO(l.start_date), end: parseISO(l.end_date) })
        );
        if (leave) return { type: 'on_leave', label: 'إجازة', color: STATUS_COLORS.on_leave, details: leave };

        // 3. Check Attendance Record
        const record = attendanceData.find(r => r.user_id === employeeId && r.work_date === dateStr);
        if (record) {
            if (record.status === 'late') return { type: 'late', label: `تأخير (${record.late_minutes} د)`, color: STATUS_COLORS.late, details: record };
            if (record.status === 'absent') {
                 if(record.justified_status === 'approved' || record.status === 'justified') {
                     return { type: 'justified', label: 'غياب مبرر', color: STATUS_COLORS.justified, details: record };
                 }
                 return { type: 'absent', label: 'غياب', color: STATUS_COLORS.absent, details: record };
            }
            if (record.status === 'present') return { type: 'present', label: 'حاضر', color: STATUS_COLORS.present, details: record };
            if (record.status === 'justified') return { type: 'justified', label: 'غياب مبرر', color: STATUS_COLORS.justified, details: record };
        }

        // 4. Default (No record yet or future date)
        // If date is in past and not weekend and no record -> likely absent/unknown (using default for now to not clutter)
        return { type: 'default', label: '', color: STATUS_COLORS.default };
    };

    const handleDayClick = (date, status, employee) => {
        if (status.type === 'default' || status.type === 'weekend') return;
        
        setSelectedDayDetails({
            date,
            status,
            employee
        });
        setIsDetailsOpen(true);
    };

    if (authLoading) return <div className="p-8 flex justify-center"><Skeleton className="h-12 w-12 rounded-full" /></div>;

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 bg-red-50 rounded-lg border border-red-100 m-6">
                <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-red-700 mb-2">غير مصرح بالوصول</h2>
                <p className="text-red-600">هذه الصفحة مخصصة للمدير العام فقط.</p>
                <Button variant="outline" className="mt-6" onClick={() => window.history.back()}>عودة</Button>
            </div>
        );
    }

    const monthDays = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    });

    // Calculate empty slots for start of month alignment
    const startDay = getDay(startOfMonth(currentMonth)); // 0-6
    const emptySlots = Array(startDay).fill(null);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500">
            <Helmet>
                <title>لوحة كالندر الموظفين | {t('appName')}</title>
            </Helmet>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <PageTitle title="لوحة كالندر الموظفين" icon={CalendarDays} />
                
                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
                    <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                    <div className="font-bold text-lg px-4 min-w-[140px] text-center">
                        {format(currentMonth, 'MMMM yyyy', { locale: ar })}
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Controls & Legend */}
            <Card className="bg-white/50 backdrop-blur-sm">
                <CardContent className="p-4 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Filter className="text-muted-foreground h-5 w-5" />
                        <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                            <SelectTrigger className="w-full md:w-[280px]">
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

                    <div className="flex flex-wrap justify-center gap-3 text-xs sm:text-sm">
                        {LEGEND_ITEMS.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                                <span className={`w-3 h-3 rounded-full ${item.color} shadow-sm`} />
                                <span className="text-muted-foreground">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Employees Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <Card key={i} className="h-[400px]">
                            <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                            <CardContent><Skeleton className="h-full w-full" /></CardContent>
                        </Card>
                    ))
                ) : (
                    filteredEmployees.map(employee => (
                        <Card key={employee.id} className="overflow-hidden hover:shadow-md transition-shadow duration-300">
                            <CardHeader className="bg-muted/30 pb-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-full">
                                            <User className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base sm:text-lg">{employee.name_ar}</CardTitle>
                                            <p className="text-xs text-muted-foreground mt-0.5 font-normal">
                                                {employee.job_title} • {employee.employee_number || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                {/* Week Days Header */}
                                <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                                    {WEEK_DAYS.map(day => (
                                        <div key={day} className="text-[10px] sm:text-xs text-muted-foreground font-medium py-1">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar Grid */}
                                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                                    {emptySlots.map((_, i) => <div key={`empty-${i}`} />)}
                                    
                                    {monthDays.map(date => {
                                        const status = getDayStatus(date, employee.id);
                                        const isToday = isSameDay(date, new Date());
                                        
                                        return (
                                            <button
                                                key={date.toString()}
                                                onClick={() => handleDayClick(date, status, employee)}
                                                disabled={status.type === 'default' || status.type === 'weekend'}
                                                className={cn(
                                                    "aspect-square flex items-center justify-center rounded-md text-xs relative transition-all duration-200 border",
                                                    status.color,
                                                    isToday && "ring-2 ring-primary ring-offset-1 z-10 font-bold",
                                                    status.type !== 'default' && status.type !== 'weekend' ? "cursor-pointer hover:scale-110 hover:shadow-sm" : "cursor-default"
                                                )}
                                                title={`${format(date, 'yyyy-MM-dd')}: ${status.label}`}
                                            >
                                                {format(date, 'd')}
                                                {status.type === 'late' && (
                                                    <span className="absolute bottom-0.5 right-0.5 h-1 w-1 bg-yellow-600 rounded-full" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Details Dialog */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-primary" />
                            تفاصيل يوم {selectedDayDetails && format(selectedDayDetails.date, 'EEEE d MMMM yyyy', { locale: ar })}
                        </DialogTitle>
                        <DialogDescription>
                            للموظف: <span className="font-semibold text-foreground">{selectedDayDetails?.employee.name_ar}</span>
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedDayDetails && (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <span className="text-sm font-medium">الحالة</span>
                                <Badge variant="outline" className={cn("px-3 py-1", 
                                    selectedDayDetails.status.type === 'present' ? "bg-green-100 text-green-700 border-green-200" :
                                    selectedDayDetails.status.type === 'late' ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                                    selectedDayDetails.status.type === 'absent' ? "bg-red-100 text-red-700 border-red-200" :
                                    selectedDayDetails.status.type === 'on_leave' ? "bg-blue-100 text-blue-700 border-blue-200" :
                                    "bg-gray-100 text-gray-700"
                                )}>
                                    {selectedDayDetails.status.label}
                                </Badge>
                            </div>

                            {selectedDayDetails.status.details && (
                                <div className="space-y-3">
                                    {(selectedDayDetails.status.details.check_in || selectedDayDetails.status.details.check_out) && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 border rounded-lg bg-green-50/50">
                                                <div className="flex items-center gap-2 text-green-700 mb-1">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    <span className="text-xs font-semibold">تسجيل دخول</span>
                                                </div>
                                                <p className="font-mono text-lg text-green-900">
                                                    {selectedDayDetails.status.details.check_in ? format(parseISO(selectedDayDetails.status.details.check_in), 'hh:mm a') : '--:--'}
                                                </p>
                                            </div>
                                            <div className="p-3 border rounded-lg bg-orange-50/50">
                                                <div className="flex items-center gap-2 text-orange-700 mb-1">
                                                    <XCircle className="h-4 w-4" />
                                                    <span className="text-xs font-semibold">تسجيل خروج</span>
                                                </div>
                                                <p className="font-mono text-lg text-orange-900">
                                                    {selectedDayDetails.status.details.check_out ? format(parseISO(selectedDayDetails.status.details.check_out), 'hh:mm a') : '--:--'}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {selectedDayDetails.status.type === 'late' && (
                                        <div className="p-3 border border-yellow-200 bg-yellow-50 rounded-lg flex items-center gap-3">
                                            <Clock className="h-5 w-5 text-yellow-600" />
                                            <div>
                                                <p className="text-sm font-semibold text-yellow-800">مدة التأخير</p>
                                                <p className="text-sm text-yellow-700">{selectedDayDetails.status.details.late_minutes} دقيقة</p>
                                            </div>
                                        </div>
                                    )}

                                    {selectedDayDetails.status.details.justification && (
                                        <div className="p-3 border border-purple-200 bg-purple-50 rounded-lg">
                                            <p className="text-sm font-semibold text-purple-800 mb-1">سبب التبرير/الغياب:</p>
                                            <p className="text-sm text-purple-700">{selectedDayDetails.status.details.justification}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminCalendarPanel;
