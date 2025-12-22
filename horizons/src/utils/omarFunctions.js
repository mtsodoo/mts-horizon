import { supabase } from '@/lib/supabaseClient';

// 1. معلومات الموظف الكاملة
export const getEmployeeProfile = async (employeeId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        name_ar,
        email,
        employee_number,
        role,
        department,
        hire_date,
        base_salary,
        job_title,
        phone
      `)
      .eq('id', employeeId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ خطأ في جلب بيانات الموظف:', error);
    return null;
  }
};

// 2. سجل الحضور (آخر 6 شهور)
export const getAttendanceHistory = async (employeeId, months = 6) => {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', employeeId)
      .gte('work_date', startDate.toISOString().split('T')[0])
      .order('work_date', { ascending: false });

    if (error) throw error;

    const stats = {
      total_days: data.length,
      absences: data.filter(d => d.status === 'absent').length,
      late_arrivals: data.filter(d => d.late_minutes && d.late_minutes > 0).length,
      early_leaves: data.filter(d => d.early_leave_minutes && d.early_leave_minutes > 0).length,
      total_late_minutes: data.reduce((sum, d) => sum + (d.late_minutes || 0), 0),
      thursday_absences: data.filter(d => {
        const dayOfWeek = new Date(d.work_date).getDay();
        return dayOfWeek === 4 && d.status === 'absent';
      }).length,
      sunday_absences: data.filter(d => {
        const dayOfWeek = new Date(d.work_date).getDay();
        return dayOfWeek === 0 && d.status === 'absent';
      }).length,
      recent_absences: data.filter(d => d.status === 'absent').slice(0, 10)
    };

    return stats;
  } catch (error) {
    console.error('❌ خطأ في جلب سجل الحضور:', error);
    return null;
  }
};

// 3. الإنذارات والمخالفات
export const getEmployeeWarnings = async (employeeId) => {
  try {
    const { data, error } = await supabase
      .from('employee_alerts')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const warnings = {
      total_alerts: data.length,
      pending: data.filter(a => a.status === 'pending').length,
      responded: data.filter(a => a.status === 'responded').length,
      resolved: data.filter(a => a.status === 'resolved').length,
      dismissed: data.filter(a => a.status === 'dismissed').length,
      by_type: {
        absence: data.filter(a => a.alert_type === 'absence').length,
        late: data.filter(a => a.alert_type === 'late').length,
        early_leave: data.filter(a => a.alert_type === 'early_leave').length,
      },
      recent_alerts: data.slice(0, 5)
    };

    return warnings;
  } catch (error) {
    console.error('❌ خطأ في جلب الإنذارات:', error);
    return null;
  }
};

// 4. رصيد الإجازات
export const getLeaveBalance = async (employeeId) => {
  try {
    const { data, error } = await supabase
      .from('employee_requests')
      .select('*')
      .eq('user_id', employeeId)
      .eq('request_type', 'leave');

    if (error) throw error;

    const approvedLeaves = data.filter(l => l.status === 'approved');
    const totalUsed = approvedLeaves.reduce((sum, l) => {
      if (!l.start_date || !l.end_date) return sum;
      const start = new Date(l.start_date);
      const end = new Date(l.end_date);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return sum + days;
    }, 0);

    return {
      annual_balance: 30,
      used: totalUsed,
      remaining: 30 - totalUsed,
      pending_requests: data.filter(l => l.status === 'pending').length,
      recent_leaves: approvedLeaves.slice(0, 5)
    };
  } catch (error) {
    console.error('❌ خطأ في جلب رصيد الإجازات:', error);
    return null;
  }
};

// 5. السلف والقروض
export const getLoanBalance = async (employeeId) => {
  try {
    const { data, error } = await supabase
      .from('employee_requests')
      .select('*')
      .eq('user_id', employeeId)
      .eq('request_type', 'loan')
      .eq('status', 'approved');

    if (error) throw error;

    const totalLoans = data.reduce((sum, l) => sum + (l.amount || 0), 0);
    const totalPaid = 0; // لا يوجد حقل paid_amount في الجدول

    // حساب المتبقي من الأقساط
    const remaining = data.reduce((sum, l) => {
      const monthlyInstallment = l.monthly_installment || 0;
      const installmentsCount = l.installments_count || 0;
      return sum + (monthlyInstallment * installmentsCount);
    }, 0);

    return {
      total_loans: totalLoans,
      total_paid: totalPaid,
      remaining: remaining,
      active_loans: data.filter(l => l.installments_count > 0).length,
      monthly_deduction: data.reduce((sum, l) => sum + (l.monthly_installment || 0), 0)
    };
  } catch (error) {
    console.error('❌ خطأ في جلب رصيد السلف:', error);
    return null;
  }
};

// 6. سياسات الشركة
export const getCompanyPolicies = () => {
  return {
    high_risk_days: ['thursday', 'sunday'],
    thursday_leave_policy: 'ممنوع منعاً باتاً',
    absence_penalties: {
      first_absence: 'خصم يوم',
      fifth_absence: 'إنذار أول',
      tenth_absence: 'إنذار ثاني',
      fifteenth_absence: 'إنذار نهائي'
    },
    late_policy: {
      grace_period: 15,
      deduction_per_hour: 'حسب الراتب الساعي'
    },
    acceptable_excuses: [
      'تقرير طبي رسمي مختوم',
      'موعد حكومي مثبت',
      'استدعاء رسمي (شرطة/محكمة)',
      'ظرف عائلي قاهر مثبت'
    ],
    rejected_excuses: [
      'نمت عن الدوام',
      'زحمة طريق',
      'ظرف خاص بدون إثبات',
      'السيارة تعطلت بدون فاتورة',
      'نسيت'
    ]
  };
};

// 7. 🎯 جمع كل المعلومات عن موظف
export const getCompleteEmployeeContext = async (employeeId) => {
  try {
    const [profile, attendance, warnings, leaves, loans, policies] = await Promise.all([
      getEmployeeProfile(employeeId),
      getAttendanceHistory(employeeId, 6),
      getEmployeeWarnings(employeeId),
      getLeaveBalance(employeeId),
      getLoanBalance(employeeId),
      Promise.resolve(getCompanyPolicies())
    ]);

    return {
      profile,
      attendance,
      warnings,
      leaves,
      loans,
      policies,
      summary: `
🆔 رقم الموظف: ${profile?.employee_number || 'غير محدد'}
👤 الاسم: ${profile?.name_ar || 'غير معروف'}
📧 الإيميل: ${profile?.email || '-'}
🏢 القسم: ${profile?.department || '-'}
💼 المسمى الوظيفي: ${profile?.job_title || '-'}
📅 تاريخ التعيين: ${profile?.hire_date || '-'}
💰 الراتب الأساسي: ${profile?.base_salary || '-'} ريال

📊 سجل الحضور (آخر 6 شهور):
- إجمالي الأيام: ${attendance?.total_days || 0}
- الغيابات: ${attendance?.absences || 0}
- غيابات الخميس: ${attendance?.thursday_absences || 0} ⚠️ (أيام عالية الخطورة)
- غيابات الأحد: ${attendance?.sunday_absences || 0} ⚠️ (أيام عالية الخطورة)
- التأخيرات: ${attendance?.late_arrivals || 0}
- إجمالي دقائق التأخير: ${attendance?.total_late_minutes || 0}

⚠️ التنبيهات والإنذارات:
- إجمالي التنبيهات: ${warnings?.total_alerts || 0}
- تنبيهات الغياب: ${warnings?.by_type?.absence || 0}
- تنبيهات التأخير: ${warnings?.by_type?.late || 0}
- معلقة: ${warnings?.pending || 0}
- تم الرد عليها: ${warnings?.responded || 0}

🏖️ رصيد الإجازات:
- المستخدم: ${leaves?.used || 0} يوم
- المتبقي: ${leaves?.remaining || 0} يوم
- طلبات معلقة: ${leaves?.pending_requests || 0}

💰 السلف:
- المبلغ الإجمالي: ${loans?.total_loans || 0} ريال
- المبلغ المتبقي: ${loans?.remaining || 0} ريال
- الخصم الشهري: ${loans?.monthly_deduction || 0} ريال
- عدد السلف النشطة: ${loans?.active_loans || 0}
      `.trim()
    };
  } catch (error) {
    console.error('❌ خطأ في جلب سياق الموظف الكامل:', error);
    return null;
  }
};

// 8. 🔍 البحث عن موظف برقمه
export const getEmployeeByNumber = async (employeeNumber) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('employee_number', employeeNumber)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ خطأ في البحث برقم الموظف:', error);
    return null;
  }
};

// 9. 🔍 البحث عن موظفين
export const searchEmployees = async (searchTerm) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, employee_number, name_ar, email, department, role')
      .or(`name_ar.ilike.%${searchTerm}%,employee_number.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ خطأ في البحث عن الموظفين:', error);
    return [];
  }
};