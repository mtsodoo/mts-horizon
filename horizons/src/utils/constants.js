// Constants for the application

export const OMAR_ID = 'your-omar-user-id-here'; // Replace with the actual Omar user ID
export const OMAR_EMAIL = 'omar@example.com'; // Replace with Omar's actual email
export const OMAR_NAME = 'Omar Hassan'; // Replace with Omar's actual name

export const ANNUAL_LEAVE_DAYS = 21; // Default annual leave days for employees

// Warning thresholds for attendance or performance metrics
export const WARNING_THRESHOLDS = {
    late: {
        minutes: 30, // Late by 30 minutes triggers a warning
        period: 'monthly' // Apply monthly
    },
    absence: {
        days: 1, // 1 day of unjustified absence triggers a warning
        period: 'monthly'
    },
    performance: {
        score: 70, // Performance score below 70 triggers a warning
        period: 'quarterly'
    }
};

// Deduction amounts or percentages for various violations
export const DEDUCTION_AMOUNTS = {
    late: {
        perMinute: 0.1, // 0.1 SAR deduction per late minute
        maxDaily: 60 // Maximum 60 SAR deduction per day for lateness
    },
    absence: {
        perDayPercentage: 0.033, // 3.33% of daily salary for each unjustified absence day (1/30)
        fixedAmount: 100 // Example: fixed 100 SAR per unjustified absence day
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
    WORK_START_TIME: '08:00',
    WORK_END_TIME: '17:00',
    GRACE_PERIOD_MINUTES: 20,
    LATE_THRESHOLD_MINUTES: 30, // For reporting/warning purposes
    AUTO_CHECKOUT_TIME: '17:00',
    WEEKEND_DAYS: [5, 6], // Friday and Saturday (0=Sunday, 6=Saturday)
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