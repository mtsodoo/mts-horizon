
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/SupabaseAuthContext';
import { PermissionProvider, usePermission } from '@/contexts/PermissionContext';
import I18nProvider from '@/contexts/I18nProvider';
import DashboardLayout from '@/layouts/DashboardLayout';
import LoginPage from '@/pages/Login';
import DashboardPage from '@/pages/Dashboard';
import AttendancePage from '@/pages/Attendance';
import EmployeesPage from '@/pages/Employees';
import ProfilePage from '@/pages/Profile';
import MyRequestsPage from '@/pages/MyRequests';
import OperationsPage from '@/pages/Operations';
import PayrollPage from '@/pages/Payroll';
import MyTasksPage from '@/pages/MyTasks';
import MyCustodySettlements from '@/pages/MyCustodySettlements';
import CustodySettlementDetails from '@/pages/CustodySettlementDetails';
import FinancialManagement from '@/pages/FinancialManagement';
import EmployeeManagement from '@/pages/EmployeeManagement';
import AttendanceManagement from '@/pages/AttendanceManagement';
import AbsenceJustificationReview from '@/pages/AbsenceJustificationReview';
import LeaveManagement from '@/pages/LeaveManagement';
import RequestLeave from '@/pages/RequestLeave';
import RequestCustody from '@/pages/RequestCustody';
import RequestLoan from '@/pages/RequestLoan';
import RequestPermission from '@/pages/RequestPermission';
import RequestOther from '@/pages/RequestOther';
import ActivityLog from '@/pages/ActivityLog';
import TaskManagementPage from '@/pages/TaskManagement';
import CustodyManagement from '@/pages/CustodyManagement';
import PermissionManagement from '@/pages/PermissionManagement';
import LoanManagement from '@/pages/LoanManagement';
import AdminMessages from '@/pages/AdminMessages';
import FilesPage from '@/pages/FilesPage';
import ComingSoon from '@/pages/ComingSoon';
import EmployeeAlertsPage from '@/pages/EmployeeAlertsPage';
import ManagerAlertsPage from '@/pages/ManagerAlertsPage';
import RiskDashboard from '@/pages/RiskDashboard'; 
import DocumentStamping from '@/pages/DocumentStamping';
import ProjectsPage from '@/pages/Projects';
import ProjectDetailsPage from '@/pages/ProjectDetails';
import CreateProjectPage from '@/pages/CreateProject';
import OdooDashboardPage from '@/pages/FinancialManagement/OdooDashboard';
import FinanceDashboard from '@/pages/FinancialManagement/FinanceDashboard'; 
import EventManagement from '@/pages/FinancialManagement/EventManagement';
import MatchManagement from '@/pages/FinancialManagement/MatchManagement';
import MatchDataEntry from '@/pages/FinancialManagement/MatchDataEntry';
import CustodySettlementReviewPage from '@/pages/FinancialManagement/CustodySettlementReviewPage';
import MasterMonitor from '@/pages/MasterMonitor'; 
import SystemMessages from '@/pages/SystemMessages';
import ProductCategories from '@/pages/ProductCategories';
import MatchReview from '@/pages/MatchReview';
import Reports from '@/pages/Reports';
import TeamAttendanceCalendar from '@/pages/TeamAttendanceCalendar';
import Settings from './pages/Settings';
import GOSIIntegration from './pages/GOSIIntegration';
import CustomerLogin from './pages/customer/CustomerLogin';
import CustomerVerify from './pages/customer/CustomerVerify';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import DeliveryLogin from './pages/delivery/DeliveryLogin';
import DeliveryVerify from './pages/delivery/DeliveryVerify';
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';
import SupplyOrders from './pages/SupplyOrders';
import DeliveryReports from './pages/DeliveryReports';
import SystemReports from './pages/SystemReports';
import OmarConversations from './pages/OmarConversations';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import { ConfigProvider } from 'antd';
import arEG from 'antd/locale/ar_EG';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import 'date-fns/locale/ar-SA';

dayjs.locale('ar');

const ProtectedRoute = ({ children, requiredPermission }) => {
    const { profile, loading: authLoading } = useAuth();
    const { checkPermission, loading: permLoading } = usePermission();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [isChecking, setIsChecking] = React.useState(true);
    const [hasAccess, setHasAccess] = React.useState(false);

    React.useEffect(() => {
        if (!authLoading && !permLoading) {
            if (!profile) {
                setHasAccess(false);
                setIsChecking(false);
                return;
            }

            const access = checkPermission(requiredPermission);
            setHasAccess(access);
            setIsChecking(false);

            if (!access) {
                toast({
                    variant: "destructive",
                    title: "تم رفض الوصول",
                    description: "ليس لديك صلاحية لعرض هذه الصفحة.",
                });
                navigate('/', { replace: true });
            }
        }
    }, [authLoading, permLoading, profile, requiredPermission, checkPermission, navigate, toast]);

    if (authLoading || permLoading || isChecking) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                 <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <div className="text-primary font-bold text-lg animate-pulse">جاري التحقق من الصلاحيات...</div>
                 </div>
            </div>
        );
    }

    return hasAccess ? children : null;
};

const AppRoutes = () => {
    const { session, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <div className="text-primary font-bold text-lg animate-pulse">جاري تحميل النظام...</div>
                 </div>
            </div>
        );
    }

    return (
        <Routes>
            <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/" />} />

            <Route path="/customer/login" element={<CustomerLogin />} />
            <Route path="/customer/verify" element={<CustomerVerify />} />
            <Route path="/customer/dashboard" element={<CustomerDashboard />} />
            <Route path="/delivery/login" element={<DeliveryLogin />} />
            <Route path="/delivery/verify" element={<DeliveryVerify />} />
            <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />

            <Route
                path="/*"
                element={
                    session ? (
                        <DashboardLayout>
                            <Routes>
                                <Route path="/" element={<ProtectedRoute requiredPermission="dashboard"><DashboardPage /></ProtectedRoute>} />
                                <Route path="/attendance" element={<ProtectedRoute requiredPermission="attendance"><AttendancePage /></ProtectedRoute>} />
                                <Route path="/profile" element={<ProtectedRoute requiredPermission="profile"><ProfilePage /></ProtectedRoute>} />
                                <Route path="/profile/:id" element={<ProtectedRoute requiredPermission="profile"><ProfilePage /></ProtectedRoute>} />
                                <Route path="/my-requests" element={<ProtectedRoute requiredPermission="my_requests"><MyRequestsPage /></ProtectedRoute>} />
                                <Route path="/request-leave" element={<ProtectedRoute requiredPermission="my_requests"><RequestLeave /></ProtectedRoute>} />
                                <Route path="/request-custody" element={<ProtectedRoute requiredPermission="my_requests"><RequestCustody /></ProtectedRoute>} />
                                <Route path="/request-loan" element={<ProtectedRoute requiredPermission="my_requests"><RequestLoan /></ProtectedRoute>} />
                                <Route path="/request-permission" element={<ProtectedRoute requiredPermission="my_requests"><RequestPermission /></ProtectedRoute>} />
                                <Route path="/request-other" element={<ProtectedRoute requiredPermission="my_requests"><RequestOther /></ProtectedRoute>} />
                                <Route path="/activity-log" element={<ProtectedRoute requiredPermission="activity_log"><ActivityLog /></ProtectedRoute>} />
                                <Route path="/my-tasks" element={<ProtectedRoute requiredPermission="my_tasks"><MyTasksPage /></ProtectedRoute>} />
                                <Route path="/my-custody-settlements" element={<ProtectedRoute requiredPermission="my_custody_settlements"><MyCustodySettlements /></ProtectedRoute>} />
                                <Route path="/custody-settlement/:settlementId" element={<ProtectedRoute requiredPermission="my_custody_settlements"><CustodySettlementDetails /></ProtectedRoute>} />
                                <Route path="/files" element={<ProtectedRoute requiredPermission="files"><FilesPage /></ProtectedRoute>} />

                                <Route path="/employees" element={<ProtectedRoute requiredPermission="employees"><EmployeesPage /></ProtectedRoute>} />
                                <Route path="/operations" element={<ProtectedRoute requiredPermission="request_approvals"><OperationsPage /></ProtectedRoute>} />
                                <Route path="/absence-justifications" element={<ProtectedRoute requiredPermission="absence_justification_review"><AbsenceJustificationReview /></ProtectedRoute>} />
                                <Route path="/leave-management" element={<ProtectedRoute requiredPermission="leave_management"><LeaveManagement /></ProtectedRoute>} />
                                <Route path="/task-management" element={<ProtectedRoute requiredPermission="task_management"><TaskManagementPage /></ProtectedRoute>} />
                                <Route path="/payroll" element={<ProtectedRoute requiredPermission="payroll"><PayrollPage /></ProtectedRoute>} />
                                
                                <Route path="/financial-management" element={<ProtectedRoute requiredPermission="financial_management"><FinancialManagement /></ProtectedRoute>} />
                                <Route path="/financial-management/odoo-dashboard" element={<ProtectedRoute requiredPermission="financial_management"><OdooDashboardPage /></ProtectedRoute>} />
                                <Route path="/financial/odoo-integration" element={<ProtectedRoute requiredPermission="financial_management"><OdooDashboardPage /></ProtectedRoute>} />
                                <Route path="/financial-management/finance-dashboard" element={<ProtectedRoute requiredPermission="financial_management"><FinanceDashboard /></ProtectedRoute>} />
                                <Route path="/financial-management/event-management" element={<ProtectedRoute requiredPermission="financial_management"><EventManagement /></ProtectedRoute>} />
                                <Route path="/financial-management/match-management" element={<ProtectedRoute requiredPermission="financial_management"><MatchManagement /></ProtectedRoute>} />
                                <Route path="/financial-management/match-data-entry" element={<ProtectedRoute requiredPermission="match_data_entry"><MatchDataEntry /></ProtectedRoute>} />
                                <Route path="/financial-management/match-review" element={<ProtectedRoute requiredPermission="financial_management"><MatchReview /></ProtectedRoute>} />
                                <Route path="/financial-management/custody-settlement-review" element={<ProtectedRoute requiredPermission="financial_management"><CustodySettlementReviewPage /></ProtectedRoute>} />
                                <Route path="/gosi-integration" element={<ProtectedRoute requiredPermission="gosi_integration"><GOSIIntegration /></ProtectedRoute>} />
                                <Route path="/supply-orders" element={<ProtectedRoute requiredPermission="supply_orders_management"><SupplyOrders /></ProtectedRoute>} />
                                <Route path="/delivery-reports" element={<ProtectedRoute requiredPermission="delivery_reports_management"><DeliveryReports /></ProtectedRoute>} />
                                <Route path="/system-reports" element={<ProtectedRoute requiredPermission="reports"><SystemReports /></ProtectedRoute>} />

                                <Route path="/employee-management" element={<ProtectedRoute requiredPermission="employee_management"><EmployeeManagement /></ProtectedRoute>} />
                                <Route path="/attendance-management" element={<ProtectedRoute requiredPermission="attendance_management"><AttendanceManagement /></ProtectedRoute>} />
                                <Route path="/team-attendance" element={<ProtectedRoute requiredPermission="attendance_management"><TeamAttendanceCalendar /></ProtectedRoute>} />
                                <Route path="/custody-management" element={<ProtectedRoute requiredPermission="custody_management"><CustodyManagement /></ProtectedRoute>} />
                                <Route path="/permission-management" element={<ProtectedRoute requiredPermission="permission_management"><PermissionManagement /></ProtectedRoute>} />
                                <Route path="/loan-management" element={<ProtectedRoute requiredPermission="loan_management"><LoanManagement /></ProtectedRoute>} />
                                <Route path="/admin-messages" element={<ProtectedRoute requiredPermission="admin_messages"><AdminMessages /></ProtectedRoute>} />
                                <Route path="/employee-alerts" element={<ProtectedRoute requiredPermission="employee_alerts"><EmployeeAlertsPage /></ProtectedRoute>} />
                                <Route path="/manager-alerts" element={<ProtectedRoute requiredPermission="manager_alerts"><ManagerAlertsPage /></ProtectedRoute>} />
                                <Route path="/risk-dashboard" element={<ProtectedRoute requiredPermission="risk_dashboard"><RiskDashboard /></ProtectedRoute>} />
                                <Route path="/document-stamping" element={<ProtectedRoute requiredPermission="document_stamping"><DocumentStamping /></ProtectedRoute>} />
                                
                                <Route path="/projects" element={<ProtectedRoute requiredPermission="projects"><ProjectsPage /></ProtectedRoute>} />
                                <Route path="/projects/new" element={<ProtectedRoute requiredPermission="projects"><CreateProjectPage /></ProtectedRoute>} />
                                <Route path="/projects/:projectId" element={<ProtectedRoute requiredPermission="projects"><ProjectDetailsPage /></ProtectedRoute>} />
                                <Route path="/master-monitor" element={<ProtectedRoute requiredPermission="risk_dashboard"><MasterMonitor /></ProtectedRoute>} /> 
                                <Route path="/system-messages" element={<ProtectedRoute requiredPermission="dashboard"><SystemMessages /></ProtectedRoute>} />
                                <Route path="/product-categories" element={<ProtectedRoute requiredPermission="product_management"><ProductCategories /></ProtectedRoute>} />
                                <Route path="/omar-conversations" element={<ProtectedRoute requiredPermission="omar_conversations_management"><OmarConversations /></ProtectedRoute>} />

                                <Route path="/request-approvals" element={<Navigate to="/operations" replace />} />

                                <Route path="/reports" element={<ProtectedRoute requiredPermission="reports"><Reports /></ProtectedRoute>} />
                                <Route path="/settings" element={<ProtectedRoute requiredPermission="settings"><Settings /></ProtectedRoute>} />

                                <Route path="*" element={<Navigate to="/" />} />
                            </Routes>
                        </DashboardLayout>
                    ) : (
                        <Navigate to="/login" />
                    )
                }
            />
        </Routes>
    );
};

function App() {
    return (
        <ConfigProvider direction="rtl" locale={arEG}>
            <I18nProvider>
                <AuthProvider>
                    <PermissionProvider>
                        <Router>
                            <AppRoutes />
                            <Toaster />
                        </Router>
                    </PermissionProvider>
                </AuthProvider>
            </I18nProvider>
        </ConfigProvider>
    );
}

export default App;
