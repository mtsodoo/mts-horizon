
export const ROLES = {
  EMPLOYEE: 'employee',
  MANAGER: 'manager',
  FINANCE: 'financial_manager',
  PROJECT_MANAGER: 'project_manager',
  OPERATIONS_MANAGER: 'operations_manager',
  PUBLIC_RELATIONS_MANAGER: 'public_relations_manager',
  GENERAL_MANAGER: 'general_manager',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

export const ROLE_LIST = Object.values(ROLES);

export const ROLE_LABELS = {
  [ROLES.EMPLOYEE]: 'موظف',
  [ROLES.MANAGER]: 'مدير قسم',
  [ROLES.FINANCE]: 'مدير مالي',
  [ROLES.PROJECT_MANAGER]: 'مدير مشاريع',
  [ROLES.OPERATIONS_MANAGER]: 'مدير عمليات',
  [ROLES.PUBLIC_RELATIONS_MANAGER]: 'مدير علاقات عامة',
  [ROLES.GENERAL_MANAGER]: 'مدير عام',
  [ROLES.ADMIN]: 'مدير نظام',
  [ROLES.SUPER_ADMIN]: 'مشرف النظام',
};

export const PERMISSION_CATEGORIES = {
  PERSONAL: { label: 'الخدمات الذاتية', icon: 'User' },
  MANAGEMENT: { label: 'إدارة الموارد البشرية', icon: 'Users' },
  OPERATIONS: { label: 'العمليات والطلبات', icon: 'Activity' },
  FINANCE: { label: 'الإدارة المالية', icon: 'Wallet' },
  PROJECTS: { label: 'إدارة المشاريع', icon: 'Briefcase' },
  FILES: { label: 'المجلدات والملفات', icon: 'Folder' },
  SYSTEM: { label: 'النظام والإعدادات', icon: 'Settings' },
};

export const PAGE_CONFIG = {
  // Personal
  dashboard: { label: 'لوحة التحكم', category: 'PERSONAL' },
  profile: { label: 'الملف الشخصي', category: 'PERSONAL' },
  my_requests: { label: 'طلباتي', category: 'PERSONAL' },
  my_tasks: { label: 'مهامي', category: 'PERSONAL' },
  my_custody_settlements: { label: 'عهد وتسويات', category: 'PERSONAL' },
  files: { label: 'الملفات', category: 'PERSONAL' },
  employee_alerts: { label: 'تنبيهات الموظف', category: 'PERSONAL' },
  attendance: { label: 'سجل الحضور', category: 'PERSONAL' },

  // Operations
  request_approvals: { label: 'الموافقات والطلبات', category: 'OPERATIONS' },
  absence_justification_review: { label: 'مراجعة التبريرات', category: 'OPERATIONS' },
  manager_alerts: { label: 'تنبيهات إدارية', category: 'OPERATIONS' },

  // Management (HR)
  employees: { label: 'دليل الموظفين', category: 'MANAGEMENT' },
  employee_management: { label: 'إدارة الموظفين', category: 'MANAGEMENT' },
  attendance_management: { label: 'إدارة الحضور', category: 'MANAGEMENT' },
  leave_management: { label: 'إدارة الإجازات', category: 'MANAGEMENT' },
  permission_management: { label: 'إدارة الصلاحيات', category: 'MANAGEMENT' },
  admin_messages: { label: 'رسائل الإدارة', category: 'MANAGEMENT' },
  risk_dashboard: { label: 'تحليل المخاطر', category: 'MANAGEMENT' },

  // Projects
  projects: { label: 'المشاريع', category: 'PROJECTS' },
  task_management: { label: 'إدارة المهام', category: 'PROJECTS' },

  // Files
  file_designs: { label: 'مجلد: التصاميم', category: 'FILES' },
  file_monthly_reports: { label: 'مجلد: تقارير شهرية', category: 'FILES' },
  file_policies: { label: 'مجلد: سياسات وإجراءات', category: 'FILES' },
  file_contracts: { label: 'مجلد: عقود ومستندات', category: 'FILES' },
  file_invoices: { label: 'مجلد: فواتير', category: 'FILES' },
  file_attendance_sheets: { label: 'مجلد: كشوف الحضور', category: 'FILES' },
  file_government_docs: { label: 'مجلد: مستندات حكومية', category: 'FILES' },
  file_photo_gallery: { label: 'مجلد: معرض الصور', category: 'FILES' },
  file_employee_forms: { label: 'مجلد: نماذج الموظفين', category: 'FILES' },
  file_absence_justifications: { label: 'مجلد: تبريرات الغياب', category: 'FILES' },
  file_projects: { label: 'مجلد: ملفات المشاريع', category: 'FILES' },

  // Finance
  financial_management: { label: 'الإدارة المالية', category: 'FINANCE' },
  match_data_entry: { label: 'إدخال بيانات المباريات', category: 'FINANCE' },
  match_review: { label: 'مراجعة المباريات', category: 'FINANCE' },
  product_management: { label: 'إدارة الأصناف', category: 'FINANCE' },
  payroll: { label: 'مسير الرواتب', category: 'FINANCE' },
  custody_management: { label: 'إدارة العهد', category: 'FINANCE' },
  loan_management: { label: 'إدارة السلف', category: 'FINANCE' },

  // System
  activity_log: { label: 'سجل النشاطات', category: 'SYSTEM' },
  reports: { label: 'التقارير', category: 'SYSTEM' },
  settings: { label: 'الإعدادات', category: 'SYSTEM' },
  document_stamping: { label: 'ختم المستندات', category: 'SYSTEM' },
  gosi_integration: { label: 'ربط التأمينات (GOSI)', category: 'SYSTEM' },
};

export const PAGE_KEYS = Object.keys(PAGE_CONFIG);
export const PAGE_LABELS = Object.fromEntries(Object.entries(PAGE_CONFIG).map(([k, v]) => [k, v.label]));

export const PERMISSIONS = {
  // Personal
  dashboard: ROLE_LIST,
  attendance: ROLE_LIST,
  profile: ROLE_LIST,
  my_requests: ROLE_LIST,
  my_tasks: ROLE_LIST,
  my_custody_settlements: ROLE_LIST,
  files: ROLE_LIST,
  employee_alerts: ROLE_LIST,
  
  // Operations
  employees: [
    ROLES.MANAGER, 
    ROLES.OPERATIONS_MANAGER, 
    ROLES.PROJECT_MANAGER,
    ROLES.PUBLIC_RELATIONS_MANAGER,
    ROLES.FINANCE,
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  request_approvals: [
    ROLES.MANAGER, 
    ROLES.OPERATIONS_MANAGER, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  absence_justification_review: [
    ROLES.MANAGER, 
    ROLES.OPERATIONS_MANAGER, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  manager_alerts: [
    ROLES.MANAGER, 
    ROLES.OPERATIONS_MANAGER, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  
  // HR Management
  employee_management: [
    ROLES.MANAGER, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  attendance_management: [
    ROLES.MANAGER, 
    ROLES.OPERATIONS_MANAGER, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  leave_management: [
    ROLES.MANAGER, 
    ROLES.OPERATIONS_MANAGER, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  permission_management: [
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  admin_messages: [
    ROLES.MANAGER, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  risk_dashboard: [
    ROLES.MANAGER, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],

  // Projects
  projects: [
    ROLES.MANAGER, 
    ROLES.PROJECT_MANAGER, 
    ROLES.PUBLIC_RELATIONS_MANAGER,
    ROLES.OPERATIONS_MANAGER, 
    ROLES.FINANCE, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  task_management: [
    ROLES.MANAGER, 
    ROLES.PROJECT_MANAGER, 
    ROLES.PUBLIC_RELATIONS_MANAGER,
    ROLES.OPERATIONS_MANAGER, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],

  // Files
  file_designs: ROLE_LIST,
  file_monthly_reports: [
    ROLES.FINANCE, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  file_policies: ROLE_LIST,
  file_contracts: [
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  file_invoices: [
    ROLES.FINANCE, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  file_attendance_sheets: [
    ROLES.FINANCE, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  file_government_docs: ROLE_LIST,
  file_photo_gallery: ROLE_LIST,
  file_employee_forms: [
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  file_absence_justifications: [
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  file_projects: [
    ROLES.PROJECT_MANAGER,
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],

  // Finance
  financial_management: [
    ROLES.PUBLIC_RELATIONS_MANAGER,
    ROLES.FINANCE, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  match_data_entry: [
    ROLES.PUBLIC_RELATIONS_MANAGER,
    ROLES.FINANCE,
    ROLES.GENERAL_MANAGER,
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN
  ],
  match_review: [
    ROLES.FINANCE,
    ROLES.GENERAL_MANAGER,
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN
  ],
  product_management: [
    ROLES.FINANCE,
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN
  ],
  payroll: [
    ROLES.FINANCE, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  custody_management: [
    ROLES.FINANCE, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  loan_management: [
    ROLES.FINANCE, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],

  // System
  activity_log: [
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  reports: [
    ROLES.MANAGER, 
    ROLES.PUBLIC_RELATIONS_MANAGER,
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  settings: [
    ROLES.GENERAL_MANAGER,
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  document_stamping: [
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  gosi_integration: [
    ROLES.FINANCE, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
};

export const hasPermission = (p_user_role, p_required_permission) => {
  if (!p_user_role || !p_required_permission) return false;
  const allowedRoles = PERMISSIONS[p_required_permission];
  if (!allowedRoles) return false;
  return allowedRoles.includes(p_user_role);
};
