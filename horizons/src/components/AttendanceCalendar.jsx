import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  parseISO,
  isFuture
} from 'date-fns';
import { ar } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, RefreshCw, Calendar as CalendarIcon, CheckCircle, XCircle, Clock, Briefcase, HeartPulse, ShieldAlert, Plane, HelpCircle as CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

const justificationStatusMap = {
  medical_excuse: { label: 'عذر طبي', icon: <HeartPulse className="h-3 w-3" />, color: 'bg-cyan-500' },
  annual_leave: { label: 'من رصيد الإجازة', icon: <Plane className="h-3 w-3" />, color: 'bg-lime-500' },
  acceptable_reason: { label: 'ظروف مقبولة', icon: <ShieldAlert className="h-3 w-3" />, color: 'bg-purple-500' },
  field_work: { label: 'عمل ميداني', icon: <Briefcase className="h-3 w-3" />, color: 'bg-teal-500' },
};

const attendanceStatusMap = {
  present: { label: 'حاضر', icon: <CheckCircle className="h-3 w-3" />, color: 'bg-green-500' },
  late: { label: 'متأخر', icon: <Clock className="h-3 w-3" />, color: 'bg-yellow-500' },
  absent: { label: 'غائب', icon: <XCircle className="h-3 w-3" />, color: 'bg-red-500' },
  on_leave: { label: 'إجازة', icon: <Plane className="h-3 w-3" />, color: 'bg-blue-500' },
  rejected: { label: 'غياب مرفوض', icon: <XCircle className="h-3 w-3" />, color: 'bg-red-600' },
  unjustified_absence: { label: 'غياب غير مبرر', icon: <XCircle className="h-3 w-3" />, color: 'bg-orange-500' },
  justified: { label: 'غياب مبرر', icon: <ShieldAlert className="h-3 w-3" />, color: 'bg-purple-500' },
  work_mission: { label: 'مهمة عمل', icon: <Briefcase className="h-3 w-3" />, color: 'bg-teal-500' },
  medical_leave: { label: 'إجازة مرضية', icon: <HeartPulse className="h-3 w-3" />, color: 'bg-cyan-500' },
  annual_leave: { label: 'إجازة سنوية', icon: <Plane className="h-3 w-3" />, color: 'bg-lime-500' },
};

const getDayStatus = (day, records) => {
  const record = records.find(r => isSameDay(parseISO(r.work_date), day));

  if (!record) {
    if (isFuture(day) || isSameDay(day, new Date())) {
      return null;
    }
    return { ...attendanceStatusMap.absent, type: 'absent', isFinal: false };
  }

  // ✅ استخدام البيانات المطبعة
  const justification = record.justification;
  const isFinal = justification && justification.is_final === true;

  console.log('[getDayStatus]', {
    date: record.work_date,
    status: record.status,
    justification_id: record.justification_id,
    justification: justification,
    is_final: isFinal
  });

  // ✅ الأولوية الأولى: غياب نهائي (له justification_id ومرفوض)
  if (record.status === 'absent' && record.justification_id && isFinal) {
    return {
      label: 'غياب نهائي',
      icon: <XCircle className="h-3 w-3" />,
      color: 'bg-red-800',
      type: 'absent_final',
      record,
      isFinal: true
    };
  }

  if (record.justified_status === 'approved' && record.justification_id && justification) {
    if (justification.approval_type) {
      const justiStatus = justificationStatusMap[justification.approval_type];
      if (justiStatus) {
        return { ...justiStatus, type: 'justified', record, isFinal: false };
      }
    }
  }

  if (record.justified_status === 'rejected') {
    return {
      label: 'غياب مرفوض',
      icon: <XCircle className="h-3 w-3" />,
      color: 'bg-red-800',
      type: 'rejected',
      record,
      isFinal: true
    };
  }

  const statusInfo = attendanceStatusMap[record.status];
  if (statusInfo) {
    return {
      ...statusInfo,
      type: record.status,
      record,
      isFinal: false
    };
  }

  console.warn('Unknown status:', record.status, 'for date:', record.work_date);
  return {
    label: `غير معروف (${record.status || 'null'})`,
    icon: <CircleHelp className="h-3 w-3" />,
    color: 'bg-gray-400',
    type: 'unknown',
    record,
    isFinal: false
  };
};

const AttendanceCalendar = ({ onAbsenceDayClick }) => {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  const fetchAttendanceData = useCallback(async (month) => {
    if (!user) return;
    setLoading(true);
    try {
      const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          absence_justifications!attendance_records_justification_id_fkey (
            approval_type,
            status,
            is_final
          )
        `)
        .eq('user_id', user.id)
        .gte('work_date', monthStart)
        .lte('work_date', monthEnd);

      if (error) throw error;

      // ✅ تطبيع البيانات - تحويل المصفوفة إلى كائن واحد
      const normalizedData = (data || []).map(record => ({
        ...record,
        justification: record.absence_justifications && record.absence_justifications.length > 0
          ? record.absence_justifications[0]
          : null
      }));

      console.log('[AttendanceCalendar] Normalized data:', normalizedData);
      setAttendanceRecords(normalizedData);
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في تحميل بيانات الحضور.' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAttendanceData(currentMonth);
  }, [currentMonth, fetchAttendanceData]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`attendance-calendar-updates-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendance_records',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('Attendance record change received!', payload);
        fetchAttendanceData(currentMonth);
      }
      )
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'absence_justifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('Absence justification change received!', payload);
        // تحديث فوري عند أي تغيير في التبريرات (إضافة، تحديث، أو حذف)
        fetchAttendanceData(currentMonth);
      }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to calendar updates');
        } else if (err) {
          console.error('Realtime subscription error:', err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentMonth, fetchAttendanceData]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = getDay(monthStart);
  const today = new Date();

  const isWeekend = (date) => [5, 6].includes(getDay(date));

  const handleJustify = (e, date) => {
    e.stopPropagation();
    if (typeof onAbsenceDayClick === 'function') {
      onAbsenceDayClick(date);
    } else {
      console.error("onAbsenceDayClick is not a function or is not provided.");
    }
  }

  const renderDayCell = (day) => {
    const isToday = isSameDay(day, today);
    const weekend = isWeekend(day);

    if (weekend) {
      return (
        <div
          key={day.toISOString()}
          className="h-28 flex flex-col p-2 rounded-lg border bg-gray-100 dark:bg-gray-800 text-center"
        >
          <span className="font-bold text-gray-500">{format(day, 'd')}</span>
          <div className="flex-grow flex items-center justify-center">
            <span className="text-xs text-gray-500">عطلة الأسبوع</span>
          </div>
        </div>
      );
    }

    const status = getDayStatus(day, attendanceRecords);

    return (
      <Dialog key={day.toISOString()} onOpenChange={(isOpen) => !isOpen && setSelectedDay(null)}>
        <DialogTrigger asChild>
          <div
            className={`h-28 flex flex-col p-2 rounded-lg border text-right cursor-pointer transition-all duration-200 ease-in-out hover:shadow-md
              ${isToday ? 'border-2 border-primary' : 'border-border'}
              bg-card
            `}
            onClick={() => setSelectedDay({ day, status })}
          >
            <span className={`font-bold ${isToday ? 'text-primary' : ''}`}>{format(day, 'd')}</span>
            <div className="flex-grow flex flex-col justify-center items-center gap-1">
              {status && (
                <Badge className={`${status.color} text-white text-xs`}>
                  {status.icon}
                  <span className="mr-1">{status.label}</span>
                </Badge>
              )}
              {/* إخفاء زر التبرير للغياب النهائي */}
              {status?.type === 'absent' && !status?.isFinal && !status?.record?.justification_id && typeof onAbsenceDayClick === 'function' && (
                <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={(e) => handleJustify(e, day)}>
                  تبرير الغياب
                </Button>
              )}
              {status?.isFinal && (
                <span className="text-xs text-red-700 font-bold">لا يمكن التبرير</span>
              )}
            </div>
          </div>
        </DialogTrigger>
        {selectedDay && isSameDay(selectedDay.day, day) && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تفاصيل يوم {format(day, 'PPP', { locale: ar })}</DialogTitle>
              <DialogDescription>
                الحالة: {status?.label || 'لم يتم التسجيل'}
              </DialogDescription>
            </DialogHeader>
            {status?.record && (
              <div className="mt-4 space-y-2 text-sm">
                <p><strong>وقت الدخول:</strong> {status.record.check_in ? format(parseISO(status.record.check_in), 'p', { locale: ar }) : 'لم يسجل'}</p>
                <p><strong>وقت الخروج:</strong> {status.record.check_out ? format(parseISO(status.record.check_out), 'p', { locale: ar }) : 'لم يسجل'}</p>
                {status.record.late_minutes > 0 && (
                  <p><strong>دقائق التأخير:</strong> {status.record.late_minutes} دقيقة</p>
                )}
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          {!isSameMonth(currentMonth, today) && (
            <Button variant="outline" onClick={() => setCurrentMonth(today)}>
              <CalendarIcon className="h-4 w-4 ml-2" />
              اليوم
            </Button>
          )}
        </div>
        <CardTitle className="text-lg">
          {format(currentMonth, 'MMMM yyyy', { locale: ar })}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={() => fetchAttendanceData(currentMonth)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted-foreground mb-2">
          {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
          {loading
            ? Array.from({ length: daysInMonth.length }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
            : daysInMonth.map(day => renderDayCell(day))
          }
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceCalendar;