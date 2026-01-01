
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
  isBefore,
  startOfDay,
  getDay
} from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  ListTodo,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const TasksCalendarWidget = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [employees, setEmployees] = useState([]);
  const [tasksData, setTasksData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  // These are already correctly calculated using currentDate, no change needed here.
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch employees
      const { data: emps, error: empError } = await supabase
        .from('profiles')
        .select('id, name_ar, role, employee_number')
        .eq('is_active', true)
        .not('role', 'in', '("general_manager","ai_manager")')
        .order('employee_number', { ascending: true });

      if (empError) throw empError;

      // 2. Fetch tasks for the month based on due_date
      // Fix: Ensure dates are formatted as 'yyyy-MM-dd' strings for the query
      const formattedMonthStart = format(monthStart, 'yyyy-MM-dd');
      const formattedMonthEnd = format(monthEnd, 'yyyy-MM-dd');

      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .gte('due_date', formattedMonthStart)
        .lte('due_date', formattedMonthEnd);

      if (tasksError) throw tasksError;

      // Process Data
      const tasksMap = {};
      tasks.forEach(task => {
        if (!task.assigned_to) return;
        const dateStr = format(parseISO(task.due_date), 'yyyy-MM-dd');
        
        if (!tasksMap[task.assigned_to]) tasksMap[task.assigned_to] = {};
        if (!tasksMap[task.assigned_to][dateStr]) tasksMap[task.assigned_to][dateStr] = [];
        
        tasksMap[task.assigned_to][dateStr].push(task);
      });

      setEmployees(emps || []);
      setTasksData(tasksMap);

    } catch (error) {
      console.error('Error fetching tasks calendar data:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشل في تحميل بيانات المهام",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const getDayStatus = (employee, day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const isWeekend = isFriday(day) || isSaturday(day);
    const dayTasks = tasksData[employee.id]?.[dateStr] || [];

    if (isWeekend) return { color: 'bg-gray-100 text-gray-400', count: 0, status: 'weekend' };
    
    if (dayTasks.length === 0) return { color: 'bg-white border border-dashed border-gray-200 hover:bg-gray-50', count: 0, status: 'empty' };

    // Priority logic: Overdue > In Progress > Completed
    const hasOverdue = dayTasks.some(t => {
      const dueDate = startOfDay(parseISO(t.due_date));
      const today = startOfDay(new Date());
      return isBefore(dueDate, today) && t.status !== 'completed';
    });

    const hasInProgress = dayTasks.some(t => t.status === 'in_progress');
    const allCompleted = dayTasks.every(t => t.status === 'completed');

    let color = 'bg-gray-300'; // Default fallback
    let status = 'pending';

    if (hasOverdue) {
      color = 'bg-red-500 text-white';
      status = 'overdue';
    } else if (hasInProgress) {
      color = 'bg-amber-500 text-white';
      status = 'in_progress';
    } else if (allCompleted) {
      color = 'bg-emerald-500 text-white';
      status = 'completed';
    } else {
      // Pending tasks but not overdue yet
      color = 'bg-gray-400 text-white'; 
    }

    return { color, count: dayTasks.length, tasks: dayTasks, status };
  };

  const handleDayClick = (dayStatus) => {
    if (dayStatus.tasks && dayStatus.tasks.length > 0) {
      setSelectedTask(dayStatus);
      setIsDialogOpen(true);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-white to-gray-50 border-t-4 border-t-purple-500 overflow-hidden mt-4">
      <CardHeader className="pb-4 border-b bg-white/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 bg-purple-100 rounded-md">
              <ListTodo className="h-4 w-4 text-purple-600" />
            </div>
            <span>كالندر المهام</span>
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
              onClick={() => navigate('/tasks-calendar-panel')}
            >
              عرض موسع <ArrowRight className="h-3 w-3 mr-1" />
            </Button>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 mt-4 text-[10px] text-muted-foreground border-t pt-2">
          {[
            ['مكتملة', 'bg-emerald-500'],
            ['جارية', 'bg-amber-500'],
            ['متأخرة', 'bg-red-500'],
            ['لا مهام', 'bg-gray-100 border border-dashed border-gray-300'],
          ].map(([label, colorClass]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-sm ${colorClass} shadow-sm`}></div>
              <span>{label}</span>
            </div>
          ))}
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
                        isSameDay(day, new Date()) ? "bg-purple-50 text-purple-600 font-bold" : ""
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
                    <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center text-[10px] font-bold text-purple-700 border border-purple-100">
                      {emp.name_ar?.substring(0, 2) || '??'}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-medium truncate" title={emp.name_ar}>
                        {emp.name_ar?.split(' ')[0]} - {emp.employee_number}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${daysInMonth.length}, minmax(32px, 1fr))` }}>
                    {daysInMonth.map(day => {
                      const status = getDayStatus(emp, day);
                      return (
                        <div 
                          key={day.toString()}
                          onClick={() => handleDayClick(status)}
                          className={cn(
                            "border-l last:border-l-0 flex items-center justify-center transition-all min-w-[32px] min-h-[32px] h-10 text-[10px] font-bold cursor-pointer hover:brightness-95",
                            status.color
                          )}
                        >
                          {status.count > 0 ? status.count : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>تفاصيل المهام</DialogTitle>
            <DialogDescription>
              {selectedTask && selectedTask.tasks && selectedTask.tasks.length > 0 && 
               format(parseISO(selectedTask.tasks[0].due_date), 'PPPP', { locale: ar })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[300px] overflow-y-auto space-y-3 py-2">
             {selectedTask?.tasks?.map((task, idx) => (
               <div key={idx} className="p-3 bg-gray-50 rounded-lg border text-sm">
                 <div className="flex justify-between items-start mb-1">
                   <span className="font-bold text-gray-800">{task.title}</span>
                   <Badge className={
                     task.status === 'completed' ? 'bg-green-500' : 
                     task.status === 'in_progress' ? 'bg-amber-500' : 'bg-gray-500'
                   }>
                     {task.status === 'completed' ? 'مكتملة' : 
                      task.status === 'in_progress' ? 'جارية' : 'معلقة'}
                   </Badge>
                 </div>
                 <p className="text-gray-500 text-xs mb-2">الأولوية: {task.priority}</p>
                 {task.due_date && (
                   <div className="flex items-center gap-1 text-xs text-muted-foreground">
                     <AlertCircle className="w-3 h-3" />
                     <span>موعد التسليم: {format(parseISO(task.due_date), 'yyyy-MM-dd')}</span>
                   </div>
                 )}
               </div>
             ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TasksCalendarWidget;
