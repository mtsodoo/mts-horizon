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
  LOGISTICS: { label: 'النظام اللوجستي', icon: 'Truck' },
  FILES: { label: 'المجلدات والملفات', icon: 'Folder' },
  MANAGEMENT_FILES: { label: 'ملفات الإدارة', icon: 'FolderLock' },
  SYSTEM: { label: 'النظام والإعدادات', icon: 'Settings' },
  EXTERNAL_PORTALS: { label: 'البوابات الخارجية', icon: 'ExternalLink' },
};

export const PAGE_CONFIG = {
  // ========== PERSONAL ==========
  dashboard: { label: 'لوحة التحكم', category: 'PERSONAL' },
  profile: { label: 'الملف الشخصي', category: 'PERSONAL' },
  my_requests: { label: 'طلباتي', category: 'PERSONAL' },
  my_tasks: { label: 'مهامي', category: 'PERSONAL' },
  my_custody_settlements: { label: 'عهد وتسويات', category: 'PERSONAL' },
  files: { label: 'الملفات', category: 'PERSONAL' },
  employee_alerts: { label: 'تنبيهات الموظف', category: 'PERSONAL' },
  attendance: { label: 'سجل الحضور', category: 'PERSONAL' },
  can_clock_in_out: { label: 'تسجيل الحضور والانصراف', category: 'PERSONAL' },
  can_view_salary: { label: 'الراتب والأداء', category: 'PERSONAL' },
  can_view_attendance_calendar: { label: 'كالندر الحضور', category: 'PERSONAL' },

  // ========== OPERATIONS ==========
  request_approvals: { label: 'الموافقات والطلبات', category: 'OPERATIONS' },
  absence_justification_review: { label: 'مراجعة التبريرات', category: 'OPERATIONS' },
  manager_alerts: { label: 'تنبيهات إدارية', category: 'OPERATIONS' },
  quotation_approvals: { label: 'موافقات عروض الأسعار', category: 'OPERATIONS' },
  activity_log: { label: 'سجل العمليات', category: 'OPERATIONS' },

  // ========== MANAGEMENT (HR) ==========
  employees: { label: 'دليل الموظفين', category: 'MANAGEMENT' },
  employee_management: { label: 'إدارة الموظفين', category: 'MANAGEMENT' },
  attendance_management: { label: 'إدارة الحضور', category: 'MANAGEMENT' },
  leave_management: { label: 'إدارة الإجازات', category: 'MANAGEMENT' },
  permission_management: { label: 'إدارة الصلاحيات', category: 'MANAGEMENT' },
  admin_messages: { label: 'رسائل الإدارة', category: 'MANAGEMENT' },
  risk_dashboard: { label: 'تحليل المخاطر', category: 'MANAGEMENT' },
  omar_conversations_management: { label: 'محادثات عمر', category: 'MANAGEMENT' },
  admin_calendar_panel: { label: 'لوحة كالندر الموظفين', category: 'MANAGEMENT' },
  gosi_integration: { label: 'التأمينات (GOSI)', category: 'MANAGEMENT' },

  // ========== PROJECTS ==========
  projects: { label: 'إدارة المشاريع', category: 'PROJECTS' },
  create_project: { label: 'إنشاء مشروع', category: 'PROJECTS' },
  task_management: { label: 'إدارة المهام', category: 'PROJECTS' },
  quotation_create: { label: 'إنشاء عرض سعر', category: 'PROJECTS' },
  quotations_list: { label: 'عروض الأسعار', category: 'PROJECTS' },
  my_clients: { label: 'عملائي', category: 'PROJECTS' },
  add_client: { label: 'إضافة عميل', category: 'PROJECTS' },
  project_discussions: { label: 'مناقشات المشاريع', category: 'PROJECTS' },

  // ========== LOGISTICS ==========
  logistics_management: { label: 'النظام اللوجستي', category: 'LOGISTICS' },
  warehouse_management: { label: 'إدارة المخزون', category: 'LOGISTICS' },
  supply_orders: { label: 'طلبات التوريد', category: 'LOGISTICS' },
  delivery_reports: { label: 'تقارير التوصيل', category: 'LOGISTICS' },
  fleet_management: { label: 'إدارة الأسطول', category: 'LOGISTICS' },
  external_staff: { label: 'الموظفين الخارجيين', category: 'LOGISTICS' },
  handover_certificates: { label: 'محاضر التسليم', category: 'LOGISTICS' },

  // ========== FILES (العامة) ==========
  file_designs: { label: 'مجلد: التصاميم', category: 'FILES' },
  file_monthly_reports: { label: 'مجلد: تقارير شهرية', category: 'FILES' },
  file_policies: { label: 'مجلد: سياسات وإجراءات', category: 'FILES' },
  file_government_docs: { label: 'مجلد: مستندات حكومية', category: 'FILES' },
  file_photo_gallery: { label: 'مجلد: معرض الصور', category: 'FILES' },

  // ========== MANAGEMENT FILES (ملفات الإدارة - خاصة) ==========
  file_contracts: { label: 'مجلد: عقود ومستندات', category: 'MANAGEMENT_FILES' },
  file_invoices: { label: 'مجلد: فواتير', category: 'MANAGEMENT_FILES' },
  file_attendance_sheets: { label: 'مجلد: كشوف الحضور', category: 'MANAGEMENT_FILES' },
  file_employee_forms: { label: 'مجلد: نماذج الموظفين', category: 'MANAGEMENT_FILES' },
  file_absence_justifications: { label: 'مجلد: تبريرات الغياب', category: 'MANAGEMENT_FILES' },
  file_projects: { label: 'مجلد: ملفات المشاريع', category: 'MANAGEMENT_FILES' },
  file_operations: { label: 'مجلد: ملفات العمليات', category: 'MANAGEMENT_FILES' },
  file_financial: { label: 'مجلد: ملفات مالية', category: 'MANAGEMENT_FILES' },

  // ========== FINANCE ==========
  financial_management: { label: 'الإدارة المالية', category: 'FINANCE' },
  match_data_entry: { label: 'إدخال بيانات المباريات', category: 'FINANCE' },
  match_review: { label: 'مراجعة المباريات', category: 'FINANCE' },
  product_management: { label: 'إدارة الأصناف', category: 'FINANCE' },
  payroll: { label: 'مسير الرواتب', category: 'FINANCE' },
  custody_management: { label: 'إدارة العهد', category: 'FINANCE' },
  loan_management: { label: 'إدارة السلف', category: 'FINANCE' },
  reports: { label: 'التقارير', category: 'FINANCE' },

  // ========== SYSTEM ==========
  settings: { label: 'الإعدادات', category: 'SYSTEM' },
  document_stamping: { label: 'ختم المستندات', category: 'SYSTEM' },
  system_reports: { label: 'تقارير النظام', category: 'SYSTEM' },

  // ========== EXTERNAL PORTALS ==========
  customer_portal: { label: 'بوابة العملاء', category: 'EXTERNAL_PORTALS' },
  delivery_portal: { label: 'بوابة المندوبين', category: 'EXTERNAL_PORTALS' },
};

export const PAGE_KEYS = Object.keys(PAGE_CONFIG);
export const PAGE_LABELS = Object.fromEntries(Object.entries(PAGE_CONFIG).map(([k, v]) => [k, v.label]));

// ✅ الصلاحيات الافتراضية لكل دور
export const PERMISSIONS = {
  // ========== PERSONAL - للجميع ==========
  dashboard: ROLE_LIST,
  attendance: ROLE_LIST,
  profile: ROLE_LIST,
  my_requests: ROLE_LIST,
  my_tasks: ROLE_LIST,
  my_custody_settlements: ROLE_LIST,
  files: ROLE_LIST,
  employee_alerts: ROLE_LIST,
  can_clock_in_out: ROLE_LIST,
  can_view_salary: ROLE_LIST,
  can_view_attendance_calendar: ROLE_LIST,
  
  // ========== OPERATIONS ==========
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
  quotation_approvals: [
    ROLES.OPERATIONS_MANAGER,
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  activity_log: [
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  
  // ========== HR MANAGEMENT ==========
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
  omar_conversations_management: [
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  admin_calendar_panel: [
    ROLES.MANAGER,
    ROLES.OPERATIONS_MANAGER,
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

  // ========== PROJECTS ==========
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
  // ✅ إنشاء مشروع - مدير المشاريع + مدير العمليات + المدير العام
  create_project: [
    ROLES.PROJECT_MANAGER, 
    ROLES.OPERATIONS_MANAGER, 
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
  quotation_create: [
    ROLES.PROJECT_MANAGER, 
    ROLES.OPERATIONS_MANAGER, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  quotations_list: [
    ROLES.PROJECT_MANAGER, 
    ROLES.OPERATIONS_MANAGER, 
    ROLES.FINANCE,
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  // ✅ العملاء - مدير المشاريع + مدير العمليات + المدير العام
  my_clients: [
    ROLES.PROJECT_MANAGER, 
    ROLES.OPERATIONS_MANAGER, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  // ✅ إضافة عميل - مدير المشاريع + مدير العمليات + المدير العام
  add_client: [
    ROLES.PROJECT_MANAGER, 
    ROLES.OPERATIONS_MANAGER, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  project_discussions: [
    ROLES.PROJECT_MANAGER, 
    ROLES.OPERATIONS_MANAGER, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],

  // ========== LOGISTICS ==========
  logistics_management: [
    ROLES.OPERATIONS_MANAGER,
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  warehouse_management: [
    ROLES.OPERATIONS_MANAGER,
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  supply_orders: [
    ROLES.OPERATIONS_MANAGER,
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  delivery_reports: [
    ROLES.OPERATIONS_MANAGER,
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  fleet_management: [
    ROLES.OPERATIONS_MANAGER,
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  external_staff: [
    ROLES.OPERATIONS_MANAGER,
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  handover_certificates: [
    ROLES.OPERATIONS_MANAGER,
    ROLES.PROJECT_MANAGER,
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],

  // ========== FILES العامة - للجميع ==========
  file_designs: ROLE_LIST,
  file_policies: ROLE_LIST,
  file_government_docs: ROLE_LIST,
  file_photo_gallery: ROLE_LIST,

  // ========== MANAGEMENT FILES - ملفات الإدارة (خاصة) ==========
  // ✅ التقارير الشهرية - المالية + الإدارة العليا
  file_monthly_reports: [
    ROLES.FINANCE, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  // ✅ العقود - الإدارة العليا فقط
  file_contracts: [
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  // ✅ الفواتير - المالية + الإدارة العليا
  file_invoices: [
    ROLES.FINANCE, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  // ✅ كشوف الحضور - المالية + الإدارة العليا
  file_attendance_sheets: [
    ROLES.FINANCE, 
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  // ✅ نماذج الموظفين - الإدارة العليا فقط
  file_employee_forms: [
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  // ✅ تبريرات الغياب - الإدارة العليا فقط
  file_absence_justifications: [
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  // ✅ ملفات المشاريع - مدير المشاريع + مدير العمليات + المدير العام
  file_projects: [
    ROLES.PROJECT_MANAGER,
    ROLES.OPERATIONS_MANAGER,
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  // ✅ ملفات العمليات - مدير العمليات + المدير العام
  file_operations: [
    ROLES.OPERATIONS_MANAGER,
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  // ✅ ملفات مالية - المالية + المدير العام
  file_financial: [
    ROLES.FINANCE,
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],

  // ========== FINANCE ==========
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
  reports: [
    ROLES.MANAGER, 
    ROLES.PUBLIC_RELATIONS_MANAGER,
    ROLES.FINANCE,
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],

  // ========== SYSTEM ==========
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
  system_reports: [
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],

  // ========== EXTERNAL PORTALS ==========
  customer_portal: [
    ROLES.OPERATIONS_MANAGER,
    ROLES.GENERAL_MANAGER, 
    ROLES.ADMIN, 
    ROLES.SUPER_ADMIN
  ],
  delivery_portal: [
    ROLES.OPERATIONS_MANAGER,
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