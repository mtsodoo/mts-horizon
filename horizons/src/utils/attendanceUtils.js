
import React from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const attendanceStatusConfig = {
    present: { label: 'حاضر', color: 'bg-green-500' },
    late: { label: 'متأخر', color: 'bg-orange-500' },
    absent: { label: 'غائب', color: 'bg-red-500' },
    on_leave: { label: 'إجازة', color: 'bg-blue-500' },
    permission: { label: 'استئذان', color: 'bg-pink-500' },
    medical_permission: { label: 'استئذان طبي', color: 'bg-cyan-500' },
    
    // Justification based statuses
    unjustified_absence: { label: 'قيد التبرير', color: 'bg-yellow-500' },
    medical_excuse: { label: 'عذر طبي', color: 'bg-cyan-500' },
    annual_leave: { label: 'إجازة سنوية', color: 'bg-lime-500' },
    acceptable_reason: { label: 'سبب مقبول', color: 'bg-purple-500' },
    field_work: { label: 'مهمة عمل', color: 'bg-teal-500' },
    rejected: { label: 'غياب مرفوض', color: 'bg-red-700' },
    
    default: { label: 'غير معروف', color: 'bg-gray-400' },
};

/**
 * Returns the color class for a given attendance status.
 * @param {string} status - The attendance status.
 * @returns {string} The Tailwind CSS background color class.
 */
export const getAttendanceColor = (status) => {
    return attendanceStatusConfig[status]?.color || attendanceStatusConfig.default.color;
};

/**
 * Returns the label for a given attendance status.
 * @param {string} status - The attendance status.
 * @returns {string} The display label in Arabic.
 */
export const getAttendanceLabel = (status) => {
    return attendanceStatusConfig[status]?.label || attendanceStatusConfig.default.label;
};

// تحضير موظف
export const checkInEmployee = async (userId, date) => {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  
  await supabase.from('attendance_records').delete().eq('user_id', userId).eq('work_date', dateStr);
  await supabase.from('attendance_deductions').delete().eq('user_id', userId).eq('deduction_date', dateStr);
  
  const { error } = await supabase.rpc('handle_check_in', {
    p_user_id: userId,
    p_check_in_time: dateStr + 'T07:00:00.000Z',
    p_check_out_time: null
  });
  
  if (error) throw error;
  return { success: true };
};

// تغييب موظف
export const markAbsent = async (userId, date) => {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  
  await supabase.from('attendance_records').delete().eq('user_id', userId).eq('work_date', dateStr);
  
  const { error } = await supabase.from('attendance_records').insert({
    user_id: userId,
    work_date: dateStr,
    status: 'absent',
    late_minutes: 0
  });
  
  if (error) throw error;
  return { success: true };
};

// تسجيل تأخير
export const markLate = async (userId, date, lateMinutes) => {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  
  await supabase.from('attendance_records').delete().eq('user_id', userId).eq('work_date', dateStr);
  await supabase.from('attendance_deductions').delete().eq('user_id', userId).eq('deduction_date', dateStr);
  
  const h = 7 + Math.floor(lateMinutes / 60);
  const m = lateMinutes % 60;
  
  const { error } = await supabase.rpc('handle_check_in', {
    p_user_id: userId,
    p_check_in_time: `${dateStr}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00.000Z`,
    p_check_out_time: null
  });
  
  if (error) throw error;
  return { success: true };
};

// تسجيل إجازة
export const markLeave = async (userId, date) => {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  
  await supabase.from('attendance_records').delete().eq('user_id', userId).eq('work_date', dateStr);
  await supabase.from('attendance_deductions').delete().eq('user_id', userId).eq('deduction_date', dateStr);
  
  const { error } = await supabase.from('attendance_records').insert({
    user_id: userId,
    work_date: dateStr,
    status: 'on_leave',
    late_minutes: 0
  });
  
  if (error) throw error;
  return { success: true };
};

// تسجيل استئذان
export const markPermission = async (userId, date, fromTime, toTime, isMedical = false) => {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  
  await supabase.from('attendance_records').delete().eq('user_id', userId).eq('work_date', dateStr);
  
  const { error } = await supabase.from('attendance_records').insert({
    user_id: userId,
    work_date: dateStr,
    status: isMedical ? 'medical_permission' : 'permission',
    late_minutes: 0,
    check_in: dateStr + 'T' + fromTime + ':00.000Z',
    check_out: dateStr + 'T' + toTime + ':00.000Z',
    justification: isMedical ? 'استئذان طبي' : 'استئذان'
  });
  
  if (error) throw error;
  return { success: true };
};

// الموافقة على طلب
export const approveRequest = async (requestId) => {
  const { error } = await supabase.from('employee_requests')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', requestId);
  
  if (error) throw error;
  return { success: true };
};

// رفض طلب
export const rejectRequest = async (requestId) => {
  const { error } = await supabase.from('employee_requests')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', requestId);
  
  if (error) throw error;
  return { success: true };
};
