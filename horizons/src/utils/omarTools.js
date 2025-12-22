import { supabase } from '@/lib/supabaseClient';
import { OMAR_ID, ANNUAL_LEAVE_DAYS } from '@/utils/constants';

// ====================================
// 📝 SYSTEM LOGGER (نظام المراقبة)
// ====================================
export const logSystemActivity = async (userId, actionType, entityType, details = {}, entityId = null) => {
  try {
    // Fire and forget - تسجيل سريع بدون انتظار
    supabase.from('activity_logs').insert({
      user_id: userId,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      details: details
    }).then(({ error }) => {
      if (error) console.error('Log Error:', error);
    });
  } catch (err) {
    console.error('Logger Exception:', err);
  }
};

// ====================================
// 🤖 OMAR MESSAGING
// ====================================
export const sendBotMessage = async (employeeId, title, message, type = 'info', actionRequired = false) => {
  try {
    const { data, error } = await supabase
      .from('bot_messages')
      .insert({
        employee_id: employeeId,
        title,
        message,
        type,
        action_required: actionRequired
      })
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send bot message:', error);
    return { success: false, error: error.message };
  }
};

// ====================================
// 💰 SALARY & FINANCIALS
// ====================================
export const calculateCurrentMonthSalary = async (employeeId) => {
  try {
    const { data: profile } = await supabase.from('profiles')
      .select('base_salary, housing_allowance, transportation_allowance, other_allowances, name_ar')
      .eq('id', employeeId).single();
    if (!profile) throw new Error("الموظف غير موجود");

    const gross = (Number(profile.base_salary) || 0) + (Number(profile.housing_allowance) || 0) + (Number(profile.transportation_allowance) || 0);
    const gosi = Math.round((Number(profile.base_salary) || 0 + Number(profile.housing_allowance) || 0) * 0.0975);

    return { success: true, data: { gross_salary: gross, net_salary: gross - gosi, gosi_deduction: gosi } };
  } catch (error) { return { success: false, error: error.message }; }
};

export const getAttendanceDeductions = async (employeeId) => {
  const { data } = await supabase.from('attendance_deductions').select('*').eq('user_id', employeeId);
  return { success: true, data: { deductions: data || [], total: data?.reduce((s, d) => s + d.amount, 0) || 0 } };
};

export const getEmployeeLoans = async (employeeId) => {
  const { data } = await supabase.from('employee_requests').select('*').eq('user_id', employeeId).eq('request_type', 'loan').eq('status', 'approved');
  return { success: true, data: { total_loans: data?.reduce((s, l) => s + l.amount, 0) || 0 } };
};

// ====================================
// 📊 ATTENDANCE & RISK
// ====================================
export const getEmployeeAttendance = async (employeeId) => {
  const { data } = await supabase.from('attendance_records').select('*').eq('user_id', employeeId).order('work_date', { ascending: false }).limit(30);
  return { success: true, data: { absent: data?.filter(r => r.status === 'absent').length || 0, late: data?.filter(r => r.late_minutes > 0).length || 0 } };
};

export const getEmployeeLeaves = async (employeeId) => {
  const { data } = await supabase.from('leaves').select('*').eq('user_id', employeeId);
  return { success: true, data: { used: data?.filter(l => l.status === 'approved').reduce((s, l) => s + l.total_days, 0) || 0 } };
};

export const getEmployeeAlerts = async (employeeId) => {
  const { data } = await supabase.from('employee_alerts').select('*').eq('employee_id', employeeId);
  return { success: true, data: { alerts: data || [], pending: data?.filter(a => a.status === 'pending').length || 0 } };
};

export const calculateRiskScore = async (employeeId) => {
  return { success: true, data: { risk_score: 0, risk_level: 'low' } }; // Placeholder logic
};

export const getAllEmployeesRiskScores = async () => {
  return { success: true, data: [] };
};

export const getCompanyRiskOverview = async () => {
  return { success: true, data: { high_risk: 0, medium_risk: 0, low_risk: 0 } };
};

export const getTopRiskyEmployees = async () => {
  return { success: true, data: [] };
};

export const getEmployee360View = async (employeeId) => {
  return { success: true, data: {} };
};