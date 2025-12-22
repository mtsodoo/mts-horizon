import { supabase } from '@/lib/customSupabaseClient';

// إنشاء تنبيه جديد
export const createAlert = async (employeeId, alertType, referenceDate, details = {}) => {
  try {
    const { data, error } = await supabase
      .from('employee_alerts')
      .insert({
        employee_id: employeeId,
        alert_type: alertType,
        alert_date: new Date().toISOString().split('T')[0],
        reference_date: referenceDate,
        details: details,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ خطأ في إنشاء التنبيه:', error);
    throw error;
  }
};

// جلب تنبيهات الموظف
export const getEmployeeAlerts = async (employeeId, status = null) => {
  try {
    let query = supabase
      .from('employee_alerts')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ خطأ في جلب تنبيهات الموظف:', error);
    throw error;
  }
};

// 🆕 جلب كل التنبيهات مع بيانات الموظف (للمدير)
export const getAllAlerts = async (status = null) => {
  try {
    let query = supabase
      .from('employee_alerts')
      .select(`
        *,
        profiles:profiles!employee_alerts_employee_id_fkey(
          name_ar,
          employee_number,
          department,
          job_title
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ خطأ في جلب جميع التنبيهات:', error);
    throw error;
  }
};

// حفظ رسالة في المحادثة
export const saveConversationMessage = async (alertId, messageFrom, messageText, questionNumber = null, attachmentUrl = null) => {
  try {
    const { data, error } = await supabase
      .from('alert_conversations')
      .insert({
        alert_id: alertId,
        message_from: messageFrom,
        message_text: messageText,
        question_number: questionNumber,
        attachment_url: attachmentUrl
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ خطأ في حفظ الرسالة:', error);
    throw error;
  }
};

// جلب محادثة تنبيه
export const getAlertConversation = async (alertId) => {
  try {
    const { data, error } = await supabase
      .from('alert_conversations')
      .select('*')
      .eq('alert_id', alertId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ خطأ في جلب المحادثة:', error);
    throw error;
  }
};

// تحديث حالة التنبيه
export const updateAlertStatus = async (alertId, status, resolvedBy = null) => {
  try {
    const updateData = { status };
    
    if (status === 'responded') {
      updateData.responded_at = new Date().toISOString();
    }
    
    if (status === 'resolved' && resolvedBy) {
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by = resolvedBy;
    }

    const { data, error } = await supabase
      .from('employee_alerts')
      .update(updateData)
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ خطأ في تحديث حالة التنبيه:', error);
    throw error;
  }
};

// عدد التنبيهات المعلقة
export const getPendingAlertsCount = async (employeeId) => {
  try {
    const { count, error } = await supabase
      .from('employee_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', employeeId)
      .eq('status', 'pending');

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('❌ خطأ في عد التنبيهات المعلقة:', error);
    return 0;
  }
};

// إحصائيات التنبيهات (للمدير)
export const getAlertsStats = async () => {
  try {
    const { data, error } = await supabase
      .from('employee_alerts')
      .select('status');

    if (error) throw error;

    const stats = {
      pending: 0,
      responded: 0,
      resolved: 0,
      dismissed: 0,
      total: data.length
    };

    data.forEach(alert => {
      if (alert.status && stats[alert.status] !== undefined) {
        stats[alert.status]++;
      }
    });

    return stats;
  } catch (error) {
    console.error('❌ خطأ في جلب إحصائيات التنبيهات:', error);
    return { pending: 0, responded: 0, resolved: 0, dismissed: 0, total: 0 };
  }
};

// 🆕 جلب تنبيهات موظف برقمه
export const getAlertsByEmployeeNumber = async (employeeNumber) => {
  try {
    // أولاً نجيب الموظف
    const { data: employee, error: empError } = await supabase
      .from('profiles')
      .select('id')
      .eq('employee_number', employeeNumber)
      .single();

    if (empError) throw empError;
    if (!employee) return [];

    // ثم نجيب تنبيهاته
    return await getEmployeeAlerts(employee.id);
  } catch (error) {
    console.error('❌ خطأ في جلب التنبيهات برقم الموظف:', error);
    return [];
  }
};

// 🆕 إحصائيات التنبيهات حسب القسم
export const getAlertsByDepartment = async () => {
  try {
    const { data, error } = await supabase
      .from('employee_alerts')
      .select(`
        id,
        status,
        alert_type,
        profiles!employee_alerts_employee_id_fkey(department)
      `);

    if (error) throw error;

    // تجميع حسب القسم
    const statsByDepartment = {};
    
    data.forEach(alert => {
      const dept = alert.profiles?.department || 'غير محدد';
      if (!statsByDepartment[dept]) {
        statsByDepartment[dept] = {
          total: 0,
          pending: 0,
          responded: 0,
          resolved: 0
        };
      }
      statsByDepartment[dept].total++;
      if (alert.status) {
        statsByDepartment[dept][alert.status]++;
      }
    });

    return statsByDepartment;
  } catch (error) {
    console.error('❌ خطأ في جلب إحصائيات الأقسام:', error);
    return {};
  }
};