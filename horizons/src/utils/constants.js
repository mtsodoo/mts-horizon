// Constants for the application

export const OMAR_ID = '57cc2b3c-2666-4097-af22-1235c393762e';
export const OMAR_EMPLOYEE_NUMBER = 'M25009';
export const OMAR_NAME = 'عمر';

export const ANNUAL_LEAVE_DAYS = 21;

// Warning thresholds for attendance or performance metrics
export const WARNING_THRESHOLDS = {
    late: {
        minutes: 30,
        period: 'monthly'
    },
    absence: {
        days: 1,
        period: 'monthly'
    },
    performance: {
        score: 70,
        period: 'quarterly'
    }
};

// Deduction formulas (calculated based on employee salary)
export const DEDUCTION_FORMULAS = {
    late: {
        // الخصم = (الراتب اليومي / 60) × دقائق التأخير
        minMinutes: 20,  // لا خصم إذا أقل من 20 دقيقة
        formula: 'daily_salary / 60 * late_minutes'
    },
    absence: {
        // الخصم = الراتب اليومي
        formula: 'total_salary / 30'
    }
};

// Roles in the system
export const ROLES = {
    EMPLOYEE: 'employee',
    PROJECT_MANAGER: 'project_manager',
    OPERATIONS_MANAGER: 'operations_manager',
    GENERAL_MANAGER: 'general_manager',
    FINANCIAL_MANAGER: 'financial_manager',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin',
};

// Request types
export const REQUEST_TYPES = {
    LEAVE: 'leave',
    CUSTODY: 'custody',
    LOAN: 'loan',
    PERMISSION: 'permission',
    OTHER: 'other',
};

// Request statuses
export const REQUEST_STATUSES = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
    SETTLED: 'settled',
};

// Attendance statuses
export const ATTENDANCE_STATUSES = {
    PRESENT: 'present',
    ABSENT: 'absent',
    LATE: 'late',
    ON_LEAVE: 'on_leave',
    PERMISSION: 'permission',
    MEDICAL_PERMISSION: 'medical_permission',
    JUSTIFIED: 'justified',
    OFFICIAL_HOLIDAY: 'official_holiday',
    UNKNOWN: 'unknown',
};

// Task priorities
export const TASK_PRIORITIES = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent',
};

// Task statuses
export const TASK_STATUSES = {
    TODO: 'todo',
    IN_PROGRESS: 'in_progress',
    REVIEW: 'review',
    COMPLETED: 'completed',
    BLOCKED: 'blocked',
};

// Default system settings (can be overridden by database settings)
export const DEFAULT_SYSTEM_SETTINGS = {
    work_start_time: '10:00:00',
    work_end_time: '17:30:00',
    GRACE_PERIOD_MINUTES: 20,
    LATE_THRESHOLD_MINUTES: 30,
    AUTO_CHECKOUT_TIME: '20:00',
    WEEKEND_DAYS: [5, 6],
    DEFAULT_LEAVE_BALANCE: 21,
    WARNING_PERIOD_MONTHS: 3,
    LATE_CHECKOUT_PENALTY_HOURS: 0,
};

// File storage folders
export const FILE_FOLDERS = {
    PROFILE_PHOTOS: 'profile_photos',
    ID_COPIES: 'id_copies',
    CONTRACT_COPIES: 'contract_copies',
    LEAVE_ATTACHMENTS: 'leave_attachments',
    REQUEST_ATTACHMENTS: 'request_attachments',
    RECEIPT_ATTACHMENTS: 'receipt_attachments',
    TASK_ATTACHMENTS: 'task_attachments',
    OTHER_DOCUMENTS: 'other_documents',
};