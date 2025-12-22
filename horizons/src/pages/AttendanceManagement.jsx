import React, { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, addMonths, subMonths } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { ClipboardCheck, Calendar as CalendarIcon, Trash2, Loader2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Helmet } from 'react-helmet';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const isSaudiWeekend = (date) => {
    const day = getDay(date);
    return day === 5 || day === 6;
};

const AttendanceManagement = () => {
    const { user, profile } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [records, setRecords] = useState([]);
    const [justifications, setJustifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(null);
    const [viewMode, setViewMode] = useState('today');
    const [selectedMonth, setSelectedMonth] = useState(new Date()); 
    const { toast } = useToast();

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, name_ar')
                .eq('is_active', true)
                .order('name_ar');
            
            if (profilesError) throw profilesError;
            setEmployees(profilesData || []);

            const start = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
            const end = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
                
            const { data: recMonthData, error: recError } = await supabase
                .from('attendance_records')
                .select('*')
                .gte('work_date', start)
                .lte('work_date', end);
            
            if (recError) throw recError;
            
            const { data: justMonthData, error: justError } = await supabase
                .from('absence_justifications')
                .select('user_id, absence_date')
                .gte('absence_date', start)
                .lte('absence_date', end)
                .in('status', ['approved', 'pending']);
            
            if (justError) throw justError;

            console.log('[fetchData] Records loaded:', recMonthData?.length || 0);
            setRecords(recMonthData || []);
            setJustifications(justMonthData || []);

        } catch (error) {
            console.error('Error fetching data:', error);
            toast({ variant: 'destructive', title: 'خطأ في جلب البيانات', description: 'فشل تحميل بيانات الحضور.' });
        } finally {
            setLoading(false);
        }
    }, [user, selectedMonth, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getRecord = useCallback((userId, dateStr) => 
        records.find(r => r.user_id === userId && r.work_date === dateStr),
    [records]);

    const isJustified = useCallback((userId, dateStr) =>
        justifications.some(j => j.user_id === userId && j.absence_date === dateStr),
    [justifications]);

    const handleAction = async (action, employeeId, payload) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'غير مصرح به', description: 'الرجاء تسجيل الدخول.' });
            return;
        }
        
        setProcessing(employeeId);

        try {
            if (action === 'mark_attendance') {
                const { day } = payload;
                const dateStr = format(day, 'yyyy-MM-dd');
                const checkIn = `${dateStr}T10:00:00+03:00`; 
                const checkOut = `${dateStr}T17:30:00+03:00`; 

                const { error } = await supabase.rpc('handle_check_in', {
                    p_user_id: employeeId, p_check_in_time: checkIn, p_check_out_time: checkOut
                });

                if (error) throw error;
                
                toast({ title: 'تم التسجيل', description: `تم تسجيل حضور ليوم ${format(day, 'dd/MM')}.` });
                await fetchData();
            } 
            else if (action === 'delete_record') {
                const { recordId } = payload;

                console.log('[DELETE] Attempting to delete:', recordId);

                const { error } = await supabase
                    .from('attendance_records')
                    .delete()
                    .eq('id', recordId);

                console.log('[DELETE] Result:', { error });

                if (error) {
                    console.error("Supabase DELETE error:", error);
                    throw new Error(`فشل حذف السجل: ${error.message}`);
                }

                toast({ title: 'تم الحذف', description: 'تم حذف سجل الحضور بنجاح.' });
                
                console.log('[DELETE] Fetching updated data...');
                await fetchData();
                console.log('[DELETE] Data refreshed, new count:', records.length);
            }
            else if (action === 'fill_month') {
                if (!window.confirm('هل أنت متأكد من تعبئة الشهر؟')) {
                     setProcessing(null);
                     return;
                }
                
                const start = startOfMonth(selectedMonth);
                let count = 0;

                const employeeRecords = new Set(records.filter(r => r.user_id === employeeId).map(r => r.work_date));
                const employeeJustifications = new Set(justifications.filter(j => j.user_id === employeeId).map(j => j.absence_date));
                
                // ✅ جلب التبريرات المرفوضة النهائية
                const { data: rejectedJustifications } = await supabase
                    .from('absence_justifications')
                    .select('absence_date')
                    .eq('user_id', employeeId)
                    .eq('status', 'rejected')
                    .eq('is_final', true)
                    .gte('absence_date', format(start, 'yyyy-MM-dd'))
                    .lte('absence_date', format(today, 'yyyy-MM-dd'));
                
                const rejectedDates = new Set(rejectedJustifications?.map(j => j.absence_date) || []);
                console.log('[fill_month] Rejected final dates to skip:', Array.from(rejectedDates));

                for (const day of eachDayOfInterval({ start, end: today })) {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    
                    // ✅ تخطي: الويكند، السجلات الموجودة، التبريرات المعلقة/المقبولة، والتبريرات المرفوضة النهائية
                    if (isSaudiWeekend(day) || employeeRecords.has(dateStr) || employeeJustifications.has(dateStr) || rejectedDates.has(dateStr)) {
                        if (rejectedDates.has(dateStr)) {
                            console.log('[fill_month] Skipping rejected final date:', dateStr);
                        }
                        continue;
                    }

                    const checkIn = `${dateStr}T10:00:00+03:00`;
                    const checkOut = `${dateStr}T17:30:00+03:00`;

                    const { error } = await supabase.rpc('handle_check_in', {
                         p_user_id: employeeId, p_check_in_time: checkIn, p_check_out_time: checkOut
                    });
                    
                    if (!error) count++;
                }
                
                toast({ title: 'اكتملت التعبئة', description: `تم تسجيل حضور لـ ${count} يوم عمل.` });
                await fetchData();
            }

        } catch (error) {
            console.error('Action failed:', error);
            toast({ variant: 'destructive', title: 'حدث خطأ', description: error.message });
        } finally {
            setProcessing(null);
        }
    };
    
    if (loading && records.length === 0) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!user) {
        return <div className="text-center p-8">الرجاء تسجيل الدخول لعرض هذه الصفحة.</div>;
    }

    const renderMonthView = () => (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedMonth(prev => subMonths(prev, 1))}
                    >
                        <ChevronRight className="h-4 w-4 ml-1" />
                        الشهر السابق
                    </Button>
                    
                    <CardTitle className="text-center">
                        {format(selectedMonth, 'MMMM yyyy', { locale: arSA })}
                    </CardTitle>
                    
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedMonth(prev => addMonths(prev, 1))}
                        disabled={isSameDay(startOfMonth(selectedMonth), startOfMonth(today))}
                    >
                        الشهر التالي
                        <ChevronLeft className="h-4 w-4 mr-1" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {employees.map(emp => (
                    <div key={emp.id} className="border rounded-xl p-4 bg-white shadow-sm">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b">
                            <p className="font-bold text-lg">{emp.name_ar}</p>
                            <Button size="sm" onClick={() => handleAction('fill_month', emp.id)} disabled={!!processing}>
                                {processing === emp.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تعبئة الشهر'}
                            </Button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-xs">
                            {eachDayOfInterval({ start: startOfMonth(selectedMonth), end: endOfMonth(selectedMonth) }).map(day => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const record = getRecord(emp.id, dateStr);
                                const justified = isJustified(emp.id, dateStr);
                                const isWeekend = isSaudiWeekend(day);
                                const isFuture = day > today;
                                
                                let dayClass = 'bg-gray-50';
                                if (isWeekend || isFuture) dayClass = 'bg-gray-100 text-gray-400';
                                else if (record) dayClass = 'bg-green-100 border-green-300';
                                else if (justified) dayClass = 'bg-yellow-100 border-yellow-300';
                                else dayClass = 'bg-red-50 border-red-200';
                                
                                return (
                                    <div key={dateStr} className={`relative p-2 rounded-lg border ${dayClass} min-h-[60px] flex flex-col justify-center items-center`}>
                                        <div className="font-bold">{format(day, 'd')}</div>
                                        <div className="text-gray-500">{format(day, 'EEE', { locale: arSA })}</div>
                                        {!isWeekend && !isFuture && (
                                            record ? (
                                                <button onClick={() => handleAction('delete_record', emp.id, { recordId: record.id })} disabled={!!processing} className="absolute top-1 left-1 p-0.5 text-red-500 hover:bg-red-100 rounded-full">
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            ) : !justified && (
                                                <button onClick={() => handleAction('mark_attendance', emp.id, { day: today })} disabled={!!processing} className="absolute top-1 right-1 p-0.5 text-blue-500 hover:bg-blue-100 rounded-full">
                                                    <Plus className="h-3 w-3" />
                                                </button>
                                            )
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );

    const renderTodayView = () => (
        <Card>
            <CardHeader><CardTitle>سجلات اليوم - {format(today, 'EEEE, dd MMMM yyyy', { locale: arSA })}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
                {employees.map(emp => {
                    const record = getRecord(emp.id, todayStr);
                    return (
                        <div key={emp.id} className={`flex items-center justify-between p-3 border rounded-xl ${record ? 'bg-green-50' : 'bg-white'}`}>
                            <p className="font-medium">{emp.name_ar}</p>
                            {record ? (
                                <Button size="sm" variant="destructive" onClick={() => handleAction('delete_record', emp.id, { recordId: record.id })} disabled={!!processing}>
                                    {processing === emp.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
                                </Button>
                            ) : (
                                <Button size="sm" onClick={() => handleAction('mark_attendance', emp.id, { day: today })} disabled={!!processing}>
                                    {processing === emp.id ? <Loader2 className="h-4 w-4 animate-spin"/> : 'تسجيل حضور'}
                                </Button>
                            )}
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
    
    return (
        <>
            <Helmet><title>إدارة الحضور والانصراف</title></Helmet>
            <div className="space-y-6 p-4 md:p-8">
                <PageTitle title="إدارة الحضور والانصراف" icon={ClipboardCheck} />
                <div className="flex gap-3">
                    <Button variant={viewMode === 'today' ? 'default' : 'outline'} onClick={() => setViewMode('today')}>اليوم</Button>
                    <Button variant={viewMode === 'month' ? 'default' : 'outline'} onClick={() => setViewMode('month')}>
                        <CalendarIcon className="ml-2 h-4 w-4" />عرض شهري
                    </Button>
                </div>
                {viewMode === 'today' ? renderTodayView() : renderMonthView()}
            </div>
        </>
    );
};

export default AttendanceManagement;