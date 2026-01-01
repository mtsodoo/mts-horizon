import { supabase } from '@/lib/customSupabaseClient';

// ═══════════════════════════════════════════════════════════════
// 📊 إعدادات النظام - System Settings Utility
// ═══════════════════════════════════════════════════════════════

// Cache للإعدادات (5 دقائق)
let cachedSettings = null;
let cacheExpiry = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

/**
 * الإعدادات الافتراضية (تُستخدم إذا فشل الجلب من الداتابيز)
 */
const DEFAULT_SYSTEM_SETTINGS = {
  work_start_time: '10:00:00',      // ✅ 10:00 صباحاً سعودي
  work_end_time: '17:30:00',        // ✅ 5:30 مساءً سعودي
  grace_period_minutes: 20,          // ✅ فترة السماح 20 دقيقة
  late_threshold_minutes: 15,        // عتبة التنبيه
  weekend_days: [5, 6],              // ✅ الجمعة والسبت
  auto_checkout_time: '20:00:00',    // خروج تلقائي 8 مساءً
  annual_leave_days: 21,             // الإجازة السنوية
  timezone: 'Asia/Riyadh'            // التوقيت
};

/**
 * جلب إعدادات النظام مع التخزين المؤقت
 */
export const getSystemSettings = async () => {
  // تحقق من الـ Cache أولاً
  if (cachedSettings && cacheExpiry && Date.now() < cacheExpiry) {
    return cachedSettings;
  }

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .single();
      
    if (error) {
      console.warn('فشل جلب إعدادات النظام، استخدام الافتراضية:', error);
      return DEFAULT_SYSTEM_SETTINGS;
    }
    
    // تخزين في الـ Cache
    cachedSettings = { ...DEFAULT_SYSTEM_SETTINGS, ...data };
    cacheExpiry = Date.now() + CACHE_DURATION;
    
    return cachedSettings;
  } catch (error) {
    console.warn('خطأ في جلب إعدادات النظام:', error);
    return DEFAULT_SYSTEM_SETTINGS;
  }
};

/**
 * مسح الـ Cache (يُستخدم بعد تحديث الإعدادات)
 */
export const clearSettingsCache = () => {
  cachedSettings = null;
  cacheExpiry = null;
};

/**
 * جلب أوقات العمل
 */
export const getWorkHours = async () => {
  const settings = await getSystemSettings();
  return {
    start: settings.work_start_time,
    end: settings.work_end_time,
    startHour: parseInt(settings.work_start_time.split(':')[0]),
    endHour: parseInt(settings.work_end_time.split(':')[0])
  };
};

/**
 * جلب فترة السماح بالدقائق
 */
export const getGracePeriod = async () => {
  const settings = await getSystemSettings();
  return settings.grace_period_minutes;
};

/**
 * جلب أيام العطلة الأسبوعية
 */
export const getWeekendDays = async () => {
  const settings = await getSystemSettings();
  return settings.weekend_days;
};

/**
 * التحقق إذا اليوم عطلة
 * @param {Date} date - التاريخ للتحقق
 */
export const isWeekend = async (date) => {
  const weekendDays = await getWeekendDays();
  const dayOfWeek = date.getDay();
  return weekendDays.includes(dayOfWeek);
};

/**
 * التحقق إذا اليوم يوم عمل
 * @param {Date} date - التاريخ للتحقق
 */
export const isWorkingDay = async (date) => {
  return !(await isWeekend(date));
};

/**
 * حساب دقائق التأخير بناءً على وقت الحضور
 * @param {Date} checkInTime - وقت الحضور
 */
export const calculateLateMinutes = async (checkInTime) => {
  const settings = await getSystemSettings();
  const [startHour, startMinute] = settings.work_start_time.split(':').map(Number);
  
  const workStart = new Date(checkInTime);
  workStart.setHours(startHour, startMinute, 0, 0);
  
  if (checkInTime <= workStart) {
    return 0; // حضر في الوقت أو قبله
  }
  
  const diffMs = checkInTime - workStart;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  return diffMinutes;
};

/**
 * التحقق إذا التأخير يستوجب خصم
 * @param {number} lateMinutes - دقائق التأخير
 */
export const shouldDeductForLateness = async (lateMinutes) => {
  const gracePeriod = await getGracePeriod();
  return lateMinutes >= gracePeriod;
};

/**
 * تصدير الإعدادات الافتراضية
 */
export { DEFAULT_SYSTEM_SETTINGS };

export default {
  getSystemSettings,
  clearSettingsCache,
  getWorkHours,
  getGracePeriod,
  getWeekendDays,
  isWeekend,
  isWorkingDay,
  calculateLateMinutes,
  shouldDeductForLateness,
  DEFAULT_SYSTEM_SETTINGS
};