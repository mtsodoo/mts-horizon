import { supabase } from '@/lib/customSupabaseClient';
import dayjs from 'dayjs';
import { handleSupabaseError } from './supabaseErrorHandler';

/**
 * Calculates salary deduction for late arrival with 20-minute grace period.
 * Deducts minute by minute after grace period.
 * Formula: (Deduction Base ÷ 30 days ÷ 8 hours ÷ 60 minutes) × Late Minutes
 * Deduction Base = Base Salary + Housing Allowance + Transportation Allowance
 * 
 * @param {number} lateMinutes - Total minutes late (before grace period)
 * @param {object} salaryData - Object containing base_salary, housing_allowance, transportation_allowance
 * @param {number} graceMinutes - Grace period in minutes (default: 20)
 * @returns {number} The calculated deduction amount
 */
export const calculateLateDeduction = (lateMinutes, salaryData, graceMinutes = 20) => {
    const { base_salary = 0, housing_allowance = 0, transportation_allowance = 0 } = salaryData || {};
    
    // حساب وعاء الخصومات (أساسي + سكن + مواصلات)
    const deductionBase = base_salary + housing_allowance + transportation_allowance;
    
    if (!deductionBase || lateMinutes <= 0) {
        return 0;
    }

    // Apply grace period
    const deductibleMinutes = Math.max(0, lateMinutes - graceMinutes);

    if (deductibleMinutes <= 0) {
        return 0; // Within grace period, no deduction
    }

    // Calculate per-minute rate: Deduction Base ÷ 30 days ÷ 8 hours ÷ 60 minutes
    const minuteRate = deductionBase / 30 / 8 / 60;
    const deduction = minuteRate * deductibleMinutes;

    return parseFloat(deduction.toFixed(2));
};

/**
 * Calculates salary deduction for being absent (one full day).
 * Deduction Base = Base Salary + Housing Allowance + Transportation Allowance
 * @param {object} salaryData - Object containing base_salary, housing_allowance, transportation_allowance
 * @returns {number} The calculated deduction amount (one day's salary).
 */
export const calculateAbsenceDeduction = (salaryData) => {
    const { base_salary = 0, housing_allowance = 0, transportation_allowance = 0 } = salaryData || {};
    
    // حساب وعاء الخصومات
    const deductionBase = base_salary + housing_allowance + transportation_allowance;
    
    if (!deductionBase) return 0;
    return parseFloat((deductionBase / 30).toFixed(2));
};

/**
 * Calculates salary deduction for not checking out (4 hours penalty).
 * Deduction Base = Base Salary + Housing Allowance + Transportation Allowance
 * @param {object} salaryData - Object containing base_salary, housing_allowance, transportation_allowance
 * @returns {number} The calculated deduction amount (4 hours).
 */
export const calculateMissedCheckoutDeduction = (salaryData) => {
    const { base_salary = 0, housing_allowance = 0, transportation_allowance = 0 } = salaryData || {};
    
    // حساب وعاء الخصومات
    const deductionBase = base_salary + housing_allowance + transportation_allowance;
    
    if (!deductionBase) return 0;
    const hourlyRate = deductionBase / 30 / 8;
    return parseFloat((hourlyRate * 4).toFixed(2));
};

/**
 * Calculates GOSI (التأمينات الاجتماعية) deduction based on registration date.
 * GOSI Base = Base Salary + Housing Allowance (max 45,000 SAR)
 * Old employees (before July 3, 2024): 9.75%
 * New employees (after July 3, 2024): 10.25%
 * 
 * @param {object} employeeData - Object containing base_salary, housing_allowance, gosi_registration_date
 * @returns {number} The calculated GOSI deduction amount
 */
export const calculateGosiDeduction = (employeeData) => {
    const { base_salary = 0, housing_allowance = 0, gosi_registration_date } = employeeData || {};
    
    // حساب وعاء التأمينات (أساسي + سكن، بحد أقصى 45,000)
    const gosiBase = Math.min(base_salary + housing_allowance, 45000);
    
    if (!gosiBase) return 0;
    
    // تحديد نسبة الخصم بناءً على تاريخ التسجيل
    const cutoffDate = new Date('2024-07-03');
    const registrationDate = gosi_registration_date ? new Date(gosi_registration_date) : new Date('2024-01-01');
    
    const gosiRate = registrationDate >= cutoffDate ? 0.1025 : 0.0975;
    
    return parseFloat((gosiBase * gosiRate).toFixed(2));
};

/**
 * Records a deduction in the database using UPSERT to prevent duplicates.
 * @param {object} deductionData - The deduction data to insert.
 * @param {string} deductionData.user_id - The user's ID.
 * @param {string} deductionData.deduction_date - The date of the deduction (YYYY-MM-DD).
 * @param {string} deductionData.deduction_type - The type of deduction (e.g., 'late', 'absent').
 * @param {string} deductionData.violation_type - The violation type (e.g., 'late', 'absent', 'late_checkout').
 * @param {number} deductionData.amount - The deduction amount.
 * @param {number} [deductionData.minutes_late] - Minutes late (for late deductions).
 * @param {string} [deductionData.notes] - Optional notes.
 * @param {string} [deductionData.attendance_record_id] - Optional related attendance record ID.
 */
export const recordDeduction = async (deductionData) => {
    try {
        // Use upsert with unique constraint to prevent duplicates
        const { error } = await supabase
            .from('attendance_deductions')
            .upsert(deductionData, {
                onConflict: 'user_id,deduction_date,violation_type'
            });

        if (error) {
            throw error;
        }
    } catch (error) {
        console.error('Error recording deduction:', error);
        handleSupabaseError(error, 'Failed to record deduction');
    }
};

/**
 * Fetches and summarizes deductions for a user for the current month.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<{total: number, breakdown: object}>} An object with total deductions and a breakdown by type.
 */
export const getMonthlyDeductionSummary = async (userId) => {
    const today = dayjs();
    const monthStart = today.startOf('month').format('YYYY-MM-DD');
    const monthEnd = today.endOf('month').format('YYYY-MM-DD');

    try {
        const { data, error } = await supabase
            .from('attendance_deductions')
            .select('violation_type, amount')
            .eq('user_id', userId)
            .gte('deduction_date', monthStart)
            .lte('deduction_date', monthEnd);

        if (error) {
            throw error;
        }

        const summary = data.reduce(
            (acc, deduction) => {
                const { violation_type, amount } = deduction;
                const numericAmount = Number(amount) || 0;
                acc.total += numericAmount;

                // Use violation_type for breakdown
                const type = violation_type || 'other';
                acc.breakdown[type] = (acc.breakdown[type] || 0) + numericAmount;
                return acc;
            },
            { total: 0, breakdown: {} }
        );

        // Round to 2 decimal places
        summary.total = parseFloat(summary.total.toFixed(2));
        for (const key in summary.breakdown) {
            summary.breakdown[key] = parseFloat(summary.breakdown[key].toFixed(2));
        }

        return summary;

    } catch (error) {
        console.error('Error fetching monthly deductions:', error);
        handleSupabaseError(error, 'Failed to fetch monthly deduction summary');
        return { total: 0, breakdown: {} };
    }
};