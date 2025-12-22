import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, UserCheck, Users, Trash2, DollarSign, Clock, Building, Save, Loader2, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Helmet } from 'react-helmet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

const SettingsPage = () => {
  const { profile } = useAuth();
  const [settings, setSettings] = useState({
    company_name: '',
    work_start_time: '10:00',
    work_end_time: '17:30',
    late_threshold_minutes: 10
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // أدوات المدير States
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [checkInTime, setCheckInTime] = useState('10:00');
  const [checkOutTime, setCheckOutTime] = useState('17:30');
  const [attendanceMode, setAttendanceMode] = useState('both'); // 'checkin', 'checkout', 'both'
  const [processing, setProcessing] = useState(false);

  // تسجيل جماعي
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [bulkAttendanceMode, setBulkAttendanceMode] = useState('both');

  // حذف رسائل عمر
  const [deleteMessagesEmployee, setDeleteMessagesEmployee] = useState('');

  // حذف الخصومات
  const [deleteDeductionsEmployee, setDeleteDeductionsEmployee] = useState('');
  const [deleteDeductionsDate, setDeleteDeductionsDate] = useState('');

  // دالة تنسيق الوقت للتأكد من الصيغة الصحيحة
  const formatTimeForDB = (date, time) => {
    // التأكد من أن الوقت بصيغة HH:MM فقط
    const timeParts = time.split(':');
    const hours = timeParts[0].padStart(2, '0');
    const minutes = (timeParts[1] || '00').padStart(2, '0');
    return `${date}T${hours}:${minutes}:00+03:00`;
  };

  // جلب الإعدادات
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (!error && data) {
      setSettings(data);
    }
    setLoading(false);
  }, []);

  // جلب الموظفين
  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name_ar, employee_number')
      .eq('is_active', true)
      .neq('role', 'ai_manager')
      .order('employee_number');

    if (data) {
      setEmployees(data);
    }
  }, []);

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'general_manager') {
      fetchSettings();
      fetchEmployees();
    }
  }, [profile, fetchSettings, fetchEmployees]);

  // تحديث أوقات الحضور من إعدادات النظام
  useEffect(() => {
    if (settings.work_start_time) {
      setCheckInTime(settings.work_start_time.substring(0, 5));
    }
    if (settings.work_end_time) {
      setCheckOutTime(settings.work_end_time.substring(0, 5));
    }
  }, [settings.work_start_time, settings.work_end_time]);

  // حفظ الإعدادات
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from('system_settings')
      .update({
        company_name: settings.company_name,
        work_start_time: settings.work_start_time,
        work_end_time: settings.work_end_time,
        late_threshold_minutes: settings.late_threshold_minutes,
      })
      .eq('id', 1);

    if (error) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في حفظ الإعدادات' });
    } else {
      toast({ title: 'تم الحفظ', description: 'تم حفظ الإعدادات بنجاح' });
    }
    setSaving(false);
  };

  // تسجيل حضور/انصراف فردي
  const handleSingleAttendance = async () => {
    if (!selectedEmployee || !selectedDate) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'اختر الموظف والتاريخ' });
      return;
    }

    setProcessing(true);
    try {
      // جلب السجل الحالي إن وجد
      const { data: existingRecord } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', selectedEmployee)
        .eq('work_date', selectedDate)
        .maybeSingle();

      const checkInTimestamp = formatTimeForDB(selectedDate, checkInTime);
      const checkOutTimestamp = formatTimeForDB(selectedDate, checkOutTime);

      if (attendanceMode === 'checkin') {
        // تسجيل حضور فقط
        if (existingRecord) {
          // تحديث الحضور فقط
          const { error } = await supabase
            .from('attendance_records')
            .update({
              check_in: checkInTimestamp,
              status: 'present',
              late_minutes: 0
            })
            .eq('id', existingRecord.id);
          if (error) throw error;
        } else {
          // إنشاء سجل جديد بالحضور فقط
          const { error } = await supabase
            .from('attendance_records')
            .insert({
              user_id: selectedEmployee,
              work_date: selectedDate,
              check_in: checkInTimestamp,
              check_out: null,
              status: 'present',
              late_minutes: 0
            });
          if (error) throw error;
        }
      } else if (attendanceMode === 'checkout') {
        // تسجيل انصراف فقط
        if (existingRecord) {
          // تحديث الانصراف فقط
          const { error } = await supabase
            .from('attendance_records')
            .update({
              check_out: checkOutTimestamp
            })
            .eq('id', existingRecord.id);
          if (error) throw error;
        } else {
          toast({ variant: 'destructive', title: 'خطأ', description: 'لا يوجد سجل حضور لهذا اليوم. سجّل الحضور أولاً.' });
          setProcessing(false);
          return;
        }
      } else {
        // تسجيل حضور وانصراف معاً
        if (existingRecord) {
          const { error } = await supabase
            .from('attendance_records')
            .update({
              check_in: checkInTimestamp,
              check_out: checkOutTimestamp,
              status: 'present',
              late_minutes: 0
            })
            .eq('id', existingRecord.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('attendance_records')
            .insert({
              user_id: selectedEmployee,
              work_date: selectedDate,
              check_in: checkInTimestamp,
              check_out: checkOutTimestamp,
              status: 'present',
              late_minutes: 0
            });
          if (error) throw error;
        }
      }

      const emp = employees.find(e => e.id === selectedEmployee);
      const modeText = attendanceMode === 'checkin' ? 'حضور' : attendanceMode === 'checkout' ? 'انصراف' : 'حضور وانصراف';
      toast({ title: 'تم التسجيل', description: `تم تسجيل ${modeText} ${emp?.name_ar} بنجاح` });
    } catch (error) {
      console.error('Attendance error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: error.message });
    }
    setProcessing(false);
  };

  // تسجيل حضور/انصراف جماعي
  const handleBulkAttendance = async () => {
    if (selectedEmployees.length === 0 || !selectedDate) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'اختر الموظفين والتاريخ' });
      return;
    }

    setProcessing(true);
    try {
      const checkInTimestamp = formatTimeForDB(selectedDate, checkInTime);
      const checkOutTimestamp = formatTimeForDB(selectedDate, checkOutTime);

      for (const empId of selectedEmployees) {
        // جلب السجل الحالي إن وجد
        const { data: existingRecord } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('user_id', empId)
          .eq('work_date', selectedDate)
          .maybeSingle();

        if (bulkAttendanceMode === 'checkin') {
          if (existingRecord) {
            await supabase
              .from('attendance_records')
              .update({
                check_in: checkInTimestamp,
                status: 'present',
                late_minutes: 0
              })
              .eq('id', existingRecord.id);
          } else {
            await supabase
              .from('attendance_records')
              .insert({
                user_id: empId,
                work_date: selectedDate,
                check_in: checkInTimestamp,
                check_out: null,
                status: 'present',
                late_minutes: 0
              });
          }
        } else if (bulkAttendanceMode === 'checkout') {
          if (existingRecord) {
            await supabase
              .from('attendance_records')
              .update({
                check_out: checkOutTimestamp
              })
              .eq('id', existingRecord.id);
          }
          // إذا ما فيه سجل حضور، نتجاهل
        } else {
          if (existingRecord) {
            await supabase
              .from('attendance_records')
              .update({
                check_in: checkInTimestamp,
                check_out: checkOutTimestamp,
                status: 'present',
                late_minutes: 0
              })
              .eq('id', existingRecord.id);
          } else {
            await supabase
              .from('attendance_records')
              .insert({
                user_id: empId,
                work_date: selectedDate,
                check_in: checkInTimestamp,
                check_out: checkOutTimestamp,
                status: 'present',
                late_minutes: 0
              });
          }
        }
      }

      const modeText = bulkAttendanceMode === 'checkin' ? 'حضور' : bulkAttendanceMode === 'checkout' ? 'انصراف' : 'حضور وانصراف';
      toast({ title: 'تم التسجيل', description: `تم تسجيل ${modeText} ${selectedEmployees.length} موظف بنجاح` });
      setSelectedEmployees([]);
    } catch (error) {
      console.error('Bulk attendance error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: error.message });
    }
    setProcessing(false);
  };

  // حذف رسائل عمر
  const handleDeleteMessages = async () => {
    if (!deleteMessagesEmployee) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'اختر الموظف' });
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase
        .from('bot_messages')
        .delete()
        .eq('employee_id', deleteMessagesEmployee)
        .select();

      if (error) throw error;

      const count = data?.length || 0;
      const emp = employees.find(e => e.id === deleteMessagesEmployee);
      toast({ title: 'تم الحذف', description: `تم حذف ${count} رسالة لـ ${emp?.name_ar}` });
      setDeleteMessagesEmployee('');
    } catch (error) {
      toast({ variant: 'destructive', title: 'خطأ', description: error.message });
    }
    setProcessing(false);
  };

  // حذف الخصومات
  const handleDeleteDeductions = async () => {
    if (!deleteDeductionsEmployee) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'اختر الموظف' });
      return;
    }

    setProcessing(true);
    try {
      let query = supabase
        .from('attendance_deductions')
        .delete()
        .eq('user_id', deleteDeductionsEmployee);

      if (deleteDeductionsDate) {
        query = query.eq('deduction_date', deleteDeductionsDate);
      }

      const { data, error } = await query.select();

      if (error) throw error;

      const count = data?.length || 0;
      const emp = employees.find(e => e.id === deleteDeductionsEmployee);
      toast({ title: 'تم الحذف', description: `تم حذف ${count} خصم لـ ${emp?.name_ar}` });
      setDeleteDeductionsEmployee('');
      setDeleteDeductionsDate('');
    } catch (error) {
      toast({ variant: 'destructive', title: 'خطأ', description: error.message });
    }
    setProcessing(false);
  };

  // التحقق من الصلاحية
  if (profile?.role !== 'admin' && profile?.role !== 'general_manager') {
    return (
      <>
        <Helmet><title>الإعدادات</title></Helmet>
        <div className="p-8">
          <PageTitle title="الإعدادات" icon={SettingsIcon} />
          <Card className="mt-4">
            <CardContent className="p-8 text-center text-gray-500">
              ليس لديك صلاحية للوصول لهذه الصفحة
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-8">
      <Helmet><title>الإعدادات</title></Helmet>
      <PageTitle title="الإعدادات" icon={SettingsIcon} />

      <Tabs defaultValue="tools" className="mt-6">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="tools" className="gap-2">
            <UserCheck className="w-4 h-4" />
            أدوات المدير
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Building className="w-4 h-4" />
            إعدادات النظام
          </TabsTrigger>
        </TabsList>

        {/* ═══ تبويب أدوات المدير ═══ */}
        <TabsContent value="tools" className="space-y-6">
          
          {/* تسجيل حضور/انصراف فردي */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCheck className="w-5 h-5 text-green-600" />
                تسجيل حضور / انصراف
              </CardTitle>
              <CardDescription>تسجيل حضور أو انصراف موظف واحد</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* اختيار نوع التسجيل */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
                <Button
                  type="button"
                  variant={attendanceMode === 'checkin' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setAttendanceMode('checkin')}
                  className="gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  حضور فقط
                </Button>
                <Button
                  type="button"
                  variant={attendanceMode === 'checkout' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setAttendanceMode('checkout')}
                  className="gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  انصراف فقط
                </Button>
                <Button
                  type="button"
                  variant={attendanceMode === 'both' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setAttendanceMode('both')}
                  className="gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  حضور وانصراف
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>الموظف</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الموظف" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name_ar} ({emp.employee_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>التاريخ</Label>
                  <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                </div>
                {(attendanceMode === 'checkin' || attendanceMode === 'both') && (
                  <div className="space-y-2">
                    <Label>وقت الحضور</Label>
                    <Input type="time" value={checkInTime} onChange={e => setCheckInTime(e.target.value)} />
                  </div>
                )}
                {(attendanceMode === 'checkout' || attendanceMode === 'both') && (
                  <div className="space-y-2">
                    <Label>وقت الانصراف</Label>
                    <Input type="time" value={checkOutTime} onChange={e => setCheckOutTime(e.target.value)} />
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSingleAttendance} disabled={processing} className="gap-2">
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  تسجيل
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* تسجيل حضور/انصراف جماعي */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-blue-600" />
                تسجيل جماعي
              </CardTitle>
              <CardDescription>تسجيل حضور أو انصراف عدة موظفين دفعة واحدة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* اختيار نوع التسجيل الجماعي */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
                <Button
                  type="button"
                  variant={bulkAttendanceMode === 'checkin' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setBulkAttendanceMode('checkin')}
                  className="gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  حضور فقط
                </Button>
                <Button
                  type="button"
                  variant={bulkAttendanceMode === 'checkout' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setBulkAttendanceMode('checkout')}
                  className="gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  انصراف فقط
                </Button>
                <Button
                  type="button"
                  variant={bulkAttendanceMode === 'both' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setBulkAttendanceMode('both')}
                  className="gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  حضور وانصراف
                </Button>
              </div>

              <div className="space-y-2">
                <Label>اختر الموظفين</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-4 border rounded-lg max-h-48 overflow-y-auto">
                  {employees.map(emp => (
                    <div key={emp.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`bulk-${emp.id}`}
                        checked={selectedEmployees.includes(emp.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          if (checked) {
                            setSelectedEmployees([...selectedEmployees, emp.id]);
                          } else {
                            setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      />
                      <Label htmlFor={`bulk-${emp.id}`} className="cursor-pointer text-sm">
                        {emp.name_ar}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500">المحدد: {selectedEmployees.length} موظف</p>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEmployees(employees.map(e => e.id))}
                >
                  تحديد الكل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEmployees([])}
                >
                  إلغاء التحديد
                </Button>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleBulkAttendance} disabled={processing || selectedEmployees.length === 0} className="gap-2">
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  تسجيل للجميع ({selectedEmployees.length})
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* حذف رسائل عمر */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trash2 className="w-5 h-5 text-orange-600" />
                حذف رسائل عمر
              </CardTitle>
              <CardDescription>حذف جميع رسائل البوت لموظف معين</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <Label>الموظف</Label>
                  <Select value={deleteMessagesEmployee} onValueChange={setDeleteMessagesEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الموظف" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name_ar} ({emp.employee_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleDeleteMessages} disabled={processing} variant="destructive" className="gap-2">
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  حذف الرسائل
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* حذف الخصومات */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="w-5 h-5 text-red-600" />
                حذف الخصومات
              </CardTitle>
              <CardDescription>حذف خصومات موظف (كل الخصومات أو تاريخ محدد)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <Label>الموظف</Label>
                  <Select value={deleteDeductionsEmployee} onValueChange={setDeleteDeductionsEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الموظف" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name_ar} ({emp.employee_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-48 space-y-2">
                  <Label>التاريخ (اختياري)</Label>
                  <Input 
                    type="date" 
                    value={deleteDeductionsDate} 
                    onChange={e => setDeleteDeductionsDate(e.target.value)}
                    placeholder="اتركه فارغ لحذف الكل"
                  />
                </div>
                <Button onClick={handleDeleteDeductions} disabled={processing} variant="destructive" className="gap-2">
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  حذف الخصومات
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">* اترك التاريخ فارغاً لحذف جميع خصومات الموظف</p>
            </CardContent>
          </Card>

        </TabsContent>

        {/* ═══ تبويب إعدادات النظام ═══ */}
        <TabsContent value="system">
          <form onSubmit={handleSaveSettings}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  إعدادات الشركة
                </CardTitle>
                <CardDescription>إعدادات النظام العامة وأوقات الدوام</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">اسم الشركة</Label>
                    <Input
                      id="company_name"
                      value={settings.company_name || ''}
                      onChange={e => setSettings({ ...settings, company_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="late_threshold_minutes">حد التأخير (دقائق)</Label>
                    <Input
                      id="late_threshold_minutes"
                      type="number"
                      value={settings.late_threshold_minutes || ''}
                      onChange={e => setSettings({ ...settings, late_threshold_minutes: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="work_start_time">وقت بداية الدوام</Label>
                    <Input
                      id="work_start_time"
                      type="time"
                      value={settings.work_start_time || ''}
                      onChange={e => setSettings({ ...settings, work_start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="work_end_time">وقت نهاية الدوام</Label>
                    <Input
                      id="work_end_time"
                      type="time"
                      value={settings.work_end_time || ''}
                      onChange={e => setSettings({ ...settings, work_end_time: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ الإعدادات
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default SettingsPage;