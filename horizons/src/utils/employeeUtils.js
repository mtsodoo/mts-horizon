import { supabase } from '@/lib/customSupabaseClient';

// 🔍 البحث عن موظف برقمه
export const getEmployeeByNumber = async (employeeNumber) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        employee_number,
        name_ar,
        name_en,
        email,
        phone,
        department,
        job_title,
        role,
        hire_date,
        base_salary,
        is_active,
        status
      `)
      .eq('employee_number', employeeNumber)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ خطأ في البحث برقم الموظف:', error);
    return null;
  }
};

// 🔍 البحث المتقدم عن الموظفين
export const searchEmployees = async (searchTerm) => {
  try {
    if (!searchTerm || searchTerm.trim() === '') {
      return [];
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, employee_number, name_ar, email, department, job_title, role, is_active')
      .or(`name_ar.ilike.%${searchTerm}%,employee_number.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .eq('is_active', true)
      .order('employee_number', { ascending: true })
      .limit(20);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ خطأ في البحث عن الموظفين:', error);
    return [];
  }
};

// 📊 جلب كل الموظفين النشطين
export const getAllActiveEmployees = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, employee_number, name_ar, department, job_title, role, email')
      .eq('is_active', true)
      .order('employee_number', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ خطأ في جلب الموظفين النشطين:', error);
    return [];
  }
};

// 🏢 جلب موظفين حسب القسم
export const getEmployeesByDepartment = async (department) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, employee_number, name_ar, job_title, role, email, hire_date')
      .eq('department', department)
      .eq('is_active', true)
      .order('employee_number', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ خطأ في جلب موظفي القسم:', error);
    return [];
  }
};

// 👔 جلب موظفين حسب المسمى الوظيفي
export const getEmployeesByRole = async (role) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, employee_number, name_ar, department, email, hire_date')
      .eq('role', role)
      .eq('is_active', true)
      .order('employee_number', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ خطأ في جلب الموظفين حسب الدور:', error);
    return [];
  }
};

// 📈 إحصائيات الموظفين
export const getEmployeesStats = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, department, role, is_active, hire_date');

    if (error) throw error;

    const stats = {
      total: data.length,
      active: data.filter(e => e.is_active).length,
      inactive: data.filter(e => !e.is_active).length,
      by_department: {},
      by_role: {},
      new_this_month: 0
    };

    // إحصائيات الأقسام
    data.forEach(emp => {
      if (emp.department) {
        stats.by_department[emp.department] = (stats.by_department[emp.department] || 0) + 1;
      }
      if (emp.role) {
        stats.by_role[emp.role] = (stats.by_role[emp.role] || 0) + 1;
      }
    });

    // الموظفين الجدد هذا الشهر
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    stats.new_this_month = data.filter(emp => {
      if (!emp.hire_date) return false;
      const hireDate = new Date(emp.hire_date);
      return hireDate.getMonth() === currentMonth && hireDate.getFullYear() === currentYear;
    }).length;

    return stats;
  } catch (error) {
    console.error('❌ خطأ في جلب إحصائيات الموظفين:', error);
    return null;
  }
};

// ✅ التحقق من وجود رقم موظف
export const isEmployeeNumberExists = async (employeeNumber) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('employee_number', employeeNumber)
      .single();

    if (error && error.code === 'PGRST116') {
      // لا يوجد موظف بهذا الرقم
      return false;
    }

    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error('❌ خطأ في التحقق من رقم الموظف:', error);
    return false;
  }
};

// 🎯 الحصول على معلومات موظف كاملة (مع التحقق)
export const getEmployeeFullInfo = async (identifier) => {
  try {
    let query = supabase
      .from('profiles')
      .select('*');

    // التحقق إذا كان UUID أو رقم موظف
    if (identifier.includes('-')) {
      // UUID
      query = query.eq('id', identifier);
    } else {
      // رقم موظف
      query = query.eq('employee_number', identifier);
    }

    const { data, error } = await query.single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ خطأ في جلب معلومات الموظف:', error);
    return null;
  }
};

// 🆔 توليد رقم موظف جديد (للسنة الحالية)
export const generateNextEmployeeNumber = async () => {
  try {
    const currentYear = new Date().getFullYear().toString().slice(-2); // آخر رقمين من السنة
    const prefix = `M${currentYear}`;

    // جلب آخر رقم للسنة الحالية
    const { data, error } = await supabase
      .from('profiles')
      .select('employee_number')
      .like('employee_number', `${prefix}%`)
      .order('employee_number', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      // أول موظف للسنة
      return `${prefix}001`;
    }

    // استخراج الرقم التسلسلي وزيادته
    const lastNumber = data[0].employee_number;
    const lastSequence = parseInt(lastNumber.slice(-3));
    const nextSequence = lastSequence + 1;

    return `${prefix}${nextSequence.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('❌ خطأ في توليد رقم الموظف:', error);
    return null;
  }
};

// 📋 تصدير قائمة الموظفين (للتقارير)
export const exportEmployeesList = async (filters = {}) => {
  try {
    let query = supabase
      .from('profiles')
      .select('employee_number, name_ar, email, department, job_title, role, hire_date, base_salary, is_active');

    // تطبيق الفلاتر
    if (filters.department) {
      query = query.eq('department', filters.department);
    }
    if (filters.role) {
      query = query.eq('role', filters.role);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    query = query.order('employee_number', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ خطأ في تصدير قائمة الموظفين:', error);
    return [];
  }
};