import { supabase } from '@/lib/customSupabaseClient';

// ═══════════════════════════════════════════════════════════════
// 🎨 إعدادات حالات الحضور الموحدة
// ═══════════════════════════════════════════════════════════════
const attendanceStatusConfig = {
    present: { label: 'حاضر', color: 'bg-green-500' },
    late: { label: 'متأخر', color: 'bg-orange-500' },
    absent: { label: 'غائب', color: 'bg-red-500' },
    on_leave: { label: 'إجازة', color: 'bg-blue-500' },
    permission: { label: 'استئذان', color: 'bg-pink-500' },
    medical_permission: { label: 'استئذان طبي', color: 'bg-cyan-500' },
    justified: { label: 'مبرر', color: 'bg-green-400' },
    default: { label: 'غير معروف', color: 'bg-gray-400' },
};

// ═══════════════════════════════════════════════════════════════
// 🎯 الثوابت المهمة
// ═══════════════════════════════════════════════════════════════
const GRACE_PERIOD_MINUTES = 20;  // فترة السماح
const WORK_START_HOUR_SAUDI = 10; // بداية الدوام 10:00 صباحاً سعودي
const WORK_START_HOUR_UTC = 7;    // = 07:00 UTC

/**
 * تحويل الوقت السعودي إلى UTC
 * السعودية = UTC+3
 */
const toUTCTime = (dateStr, saudiHour, minutes = 0) => {
    const utcHour = saudiHour - 3;

    if (utcHour < 0) {
        // اليوم السابق بتوقيت UTC
        const prevDate = new Date(dateStr);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];
        return `${prevDateStr}T${String(utcHour + 24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`;
    }

    return `${dateStr}T${String(utcHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`;
};

/**
 * Returns the color class for a given attendance status.
 */
export const getAttendanceColor = (status) => {
    return attendanceStatusConfig[status]?.color || attendanceStatusConfig.default.color;
};

/**
 * Returns the label for a given attendance status.
 */
export const getAttendanceLabel = (status) => {
    return attendanceStatusConfig[status]?.label || attendanceStatusConfig.default.label;
};

// ═══════════════════════════════════════════════════════════════
// 🛠️ دوال إدارة الحضور
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ تحضير موظف (حاضر)
 * - يحذف أي سجل وخصم سابق لنفس اليوم
 * - ينشئ سجل حضور جديد بدون خصم
 */
export const checkInEmployee = async (userId, date) => {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];

    // ✅ حذف الخصم والسجل القديم أولاً
    await supabase.from('attendance_deductions').delete().eq('user_id', userId).eq('deduction_date', dateStr);
    await supabase.from('attendance_records').delete().eq('user_id', userId).eq('work_date', dateStr);

    // ✅ إنشاء سجل حضور (10:00 سعودي = 07:00 UTC)
    const { data: record, error } = await supabase
        .from('attendance_records')
        .insert({
            user_id: userId,
            work_date: dateStr,
            status: 'present',
            check_in: toUTCTime(dateStr, WORK_START_HOUR_SAUDI, 0),
            late_minutes: 0
        })
        .select()
        .single();

    if (error) throw error;

    return { success: true, record };
};

/**
 * ✅ تغييب موظف
 * - يحذف أي سجل وخصم سابق لنفس اليوم
 * - ينشئ سجل غياب + خصم يدوي
 */
export const markAbsent = async (userId, date) => {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];

    // ✅ حذف الخصم والسجل القديم أولاً
    await supabase.from('attendance_deductions').delete().eq('user_id', userId).eq('deduction_date', dateStr);
    await supabase.from('attendance_records').delete().eq('user_id', userId).eq('work_date', dateStr);

    // ✅ إنشاء سجل غياب
    const { data: record, error: recordError } = await supabase
        .from('attendance_records')
        .insert({
            user_id: userId,
            work_date: dateStr,
            status: 'absent',
            late_minutes: 0
        })
        .select()
        .single();

    if (recordError) throw recordError;

    // ✅ جلب بيانات الراتب من profiles (وليس employees!)
    const { data: employee } = await supabase
        .from('profiles')
        .select('base_salary, housing_allowance, transportation_allowance')
        .eq('id', userId)
        .single();

    if (employee) {
        // ✅ حساب خصم الغياب = الراتب اليومي
        const totalSalary = (employee.base_salary || 0) +
            (employee.housing_allowance || 0) +
            (employee.transportation_allowance || 0);
        const dailyDeduction = Math.round(totalSalary / 30);

        // ✅ إنشاء الخصم مع ربطه بسجل الحضور
        const { error: deductionError } = await supabase
            .from('attendance_deductions')
            .insert({
                user_id: userId,
                deduction_date: dateStr,
                deduction_type: 'absence',
                violation_type: 'absent',
                amount: dailyDeduction,
                attendance_record_id: record.id
            });

        if (deductionError) {
            console.error('فشل إنشاء خصم الغياب:', deductionError);
        }
    }

    return { success: true, record };
};

/**
 * ✅ تسجيل تأخير (مع فترة السماح 20 دقيقة)
 * - تأخير أقل من 20 دقيقة = حاضر (لا يُسجل كتأخير)
 * - تأخير 20+ دقيقة = متأخر + خصم تلقائي
 */
export const markLate = async (userId, date, lateMinutes) => {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const minutes = parseInt(lateMinutes) || 0;

    // ✅ سياسة فترة السماح: أقل من 20 دقيقة = حاضر
    if (minutes < GRACE_PERIOD_MINUTES) {
        console.log(`تأخير ${minutes} دقيقة < ${GRACE_PERIOD_MINUTES} دقيقة → يُسجل حاضر`);
        return checkInEmployee(userId, date);
    }

    // ✅ حذف الخصم والسجل القديم أولاً
    await supabase.from('attendance_deductions').delete().eq('user_id', userId).eq('deduction_date', dateStr);
    await supabase.from('attendance_records').delete().eq('user_id', userId).eq('work_date', dateStr);

    // ✅ حساب وقت الدخول الفعلي
    const actualArrivalHour = WORK_START_HOUR_SAUDI + Math.floor(minutes / 60);
    const actualArrivalMinute = minutes % 60;

    // ✅ إنشاء سجل تأخير
    const { data: record, error: recordError } = await supabase
        .from('attendance_records')
        .insert({
            user_id: userId,
            work_date: dateStr,
            status: 'late',
            check_in: toUTCTime(dateStr, actualArrivalHour, actualArrivalMinute),
            late_minutes: minutes
        })
        .select()
        .single();

    if (recordError) throw recordError;

    // ✅ جلب بيانات الراتب وإنشاء الخصم
    const { data: employee } = await supabase
        .from('profiles')
        .select('base_salary, housing_allowance, transportation_allowance')
        .eq('id', userId)
        .single();

    if (employee) {
        // ✅ حساب خصم التأخير = (الراتب اليومي / 60) × دقائق التأخير
        const totalSalary = (employee.base_salary || 0) +
            (employee.housing_allowance || 0) +
            (employee.transportation_allowance || 0);
        const dailySalary = totalSalary / 30;
        const lateDeduction = Math.round((dailySalary / 60) * minutes);

        // ✅ إنشاء الخصم مع ربطه بسجل الحضور
        const { error: deductionError } = await supabase
            .from('attendance_deductions')
            .insert({
                user_id: userId,
                deduction_date: dateStr,
                deduction_type: 'late',
                violation_type: 'late',
                amount: lateDeduction,
                late_minutes: minutes,
                attendance_record_id: record.id
            });

        if (deductionError) {
            console.error('فشل إنشاء خصم التأخير:', deductionError);
        }
    }

    return { success: true, record };
};

/**
 * ✅ تسجيل إجازة
 * - يحذف أي سجل وخصم سابق
 * - ينشئ سجل إجازة بدون خصم
 */
export const markLeave = async (userId, date) => {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];

    // ✅ حذف الخصم والسجل القديم
    await supabase.from('attendance_deductions').delete().eq('user_id', userId).eq('deduction_date', dateStr);
    await supabase.from('attendance_records').delete().eq('user_id', userId).eq('work_date', dateStr);

    const { data: record, error } = await supabase
        .from('attendance_records')
        .insert({
            user_id: userId,
            work_date: dateStr,
            status: 'on_leave',
            late_minutes: 0
        })
        .select()
        .single();

    if (error) throw error;
    return { success: true, record };
};

/**
 * ✅ تسجيل استئذان
 * - يحذف أي سجل سابق
 * - ينشئ سجل استئذان مع أوقات الخروج والدخول
 */
export const markPermission = async (userId, date, fromTime, toTime, isMedical = false) => {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];

    // ✅ حذف الخصم والسجل القديم
    await supabase.from('attendance_deductions').delete().eq('user_id', userId).eq('deduction_date', dateStr);
    await supabase.from('attendance_records').delete().eq('user_id', userId).eq('work_date', dateStr);

    const { data: record, error } = await supabase
        .from('attendance_records')
        .insert({
            user_id: userId,
            work_date: dateStr,
            status: isMedical ? 'medical_permission' : 'permission',
            late_minutes: 0,
            check_in: `${dateStr}T${fromTime}:00.000Z`,
            check_out: `${dateStr}T${toTime}:00.000Z`,
            justification: isMedical ? 'استئذان طبي' : 'استئذان'
        })
        .select()
        .single();

    if (error) throw error;
    return { success: true, record };
};

/**
 * ✅ تحويل حالة الحضور إلى "مبرر"
 * - يُستخدم عند اعتماد التبرير
 * - يحذف الخصم المرتبط
 */
export const markAsJustified = async (userId, date) => {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];

    // ✅ تحديث حالة الحضور إلى مبرر
    const { error: updateError } = await supabase
        .from('attendance_records')
        .update({ status: 'justified', justified_status: 'approved' })
        .eq('user_id', userId)
        .eq('work_date', dateStr);

    if (updateError) throw updateError;

    // ✅ حذف الخصم المرتبط
    const { error: deleteError } = await supabase
        .from('attendance_deductions')
        .delete()
        .eq('user_id', userId)
        .eq('deduction_date', dateStr);

    if (deleteError) {
        console.error('فشل حذف الخصم بعد التبرير:', deleteError);
    }

    return { success: true };
};

// ═══════════════════════════════════════════════════════════════
// 📋 دوال إدارة الطلبات
// ═══════════════════════════════════════════════════════════════

/**
 * الموافقة على طلب
 */
export const approveRequest = async (requestId, reviewedBy = null) => {
    const { data: request, error: fetchError } = await supabase
        .from('employee_requests')
        .select('*')
        .eq('id', requestId)
        .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase
        .from('employee_requests')
        .update({
            status: 'approved',
            reviewed_at: new Date().toISOString(),
            reviewed_by: reviewedBy
        })
        .eq('id', requestId);

    if (error) throw error;
    return { success: true, request };
};

/**
 * رفض طلب
 */
export const rejectRequest = async (requestId, reviewedBy = null, notes = null) => {
    const { data: request, error: fetchError } = await supabase
        .from('employee_requests')
        .select('*')
        .eq('id', requestId)
        .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase
        .from('employee_requests')
        .update({
            status: 'rejected',
            reviewed_at: new Date().toISOString(),
            reviewed_by: reviewedBy,
            review_notes: notes
        })
        .eq('id', requestId);

    if (error) throw error;
    return { success: true, request };
};

// ═══════════════════════════════════════════════════════════════
// 🏖️ دوال إدارة الإجازات
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ خصم من رصيد الإجازة السنوية مع التحقق
 * @param {string} userId - معرف الموظف
 * @param {number} days - عدد أيام الإجازة
 */
export const deductAnnualLeave = async (userId, days = 1) => {
    try {
        // التحقق من رصيد الإجازة أولاً
        const { data: currentBalance, error: balanceError } = await supabase
            .rpc('calculate_annual_leave_balance', { p_user_id: userId });

        if (balanceError) {
            console.error('فشل جلب رصيد الإجازة:', balanceError);
            throw new Error('فشل التحقق من رصيد الإجازة');
        }

        // التحقق من كفاية الرصيد
        if (currentBalance < days) {
            throw new Error(`رصيد الإجازة غير كافٍ (المتبقي: ${currentBalance} يوم)`);
        }

        // خصم الإجازة
        const { data, error } = await supabase
            .rpc('deduct_annual_leave', {
                p_user_id: userId,
                p_days: days
            });

        if (error) {
            console.error('فشل خصم الإجازة:', error);
            throw new Error('فشل خصم الإجازة من الرصيد');
        }

        // التحقق من الخصم
        const { data: newBalance } = await supabase
            .rpc('calculate_annual_leave_balance', { p_user_id: userId });

        const expectedBalance = currentBalance - days;
        if (newBalance !== expectedBalance) {
            console.warn(`تحذير: الرصيد الجديد (${newBalance}) لا يطابق المتوقع (${expectedBalance})`);
        }

        return {
            success: true,
            previousBalance: currentBalance,
            newBalance: newBalance,
            deductedDays: days
        };

    } catch (error) {
        console.error('خطأ في خصم الإجازة السنوية:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// ═══════════════════════════════════════════════════════════════
// 📊 دوال مساعدة
// ═══════════════════════════════════════════════════════════════

/**
 * جلب إعدادات النظام
 */
export const getSystemSettings = async () => {
    const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();

    if (error) {
        console.warn('فشل جلب إعدادات النظام، استخدام الافتراضية');
        return {
            work_start_time: '10:00:00',
            work_end_time: '17:30:00',
            grace_period_minutes: 20,
            weekend_days: [5, 6]
        };
    }
    return data;
};

/**
 * التحقق من يوم عمل (ليس جمعة أو سبت)
 */
export const isWorkingDay = (date) => {
    const day = date.getDay();
    return day !== 5 && day !== 6; // 5 = الجمعة، 6 = السبت
};

/**
 * تصدير الإعدادات والدوال
 */
export default {
    attendanceStatusConfig,
    getAttendanceColor,
    getAttendanceLabel,
    checkInEmployee,
    markAbsent,
    markLate,
    markLeave,
    markPermission,
    markAsJustified,
    approveRequest,
    rejectRequest,
    deductAnnualLeave,
    getSystemSettings,
    isWorkingDay,
    GRACE_PERIOD_MINUTES,
    WORK_START_HOUR_SAUDI
};