import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import {
    AlertTriangle,
    Users,
    Clock,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Activity,
    Eye
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePermission } from '@/contexts/PermissionContext';
import { supabase } from '@/lib/customSupabaseClient';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format, subDays } from 'date-fns';

const RiskDashboard = () => {
    const { profile } = useAuth();
    const { checkPermission } = usePermission();
    const [loading, setLoading] = useState(true);
    const [riskData, setRiskData] = useState([]);
    const [stats, setStats] = useState({
        high: 0,
        medium: 0,
        low: 0,
        total: 0
    });
    const [expandedEmployee, setExpandedEmployee] = useState(null);

    // ═══════════════════════════════════════════════════════════════
    // 🧮 حساب درجة المخاطرة
    // ═══════════════════════════════════════════════════════════════
    const calculateRiskScore = (employee, attendance, alerts, deductions) => {
        let score = 0;
        const factors = [];

        // 1. عدد الغيابات (0-40 نقطة)
        const absences = attendance.filter(a => a.status === 'absent').length;
        const absenceScore = Math.min(absences * 8, 40);
        score += absenceScore;
        if (absences > 0) {
            factors.push({
                label: `${absences} غياب`,
                impact: absenceScore > 20 ? 'high' : absenceScore > 10 ? 'medium' : 'low',
                points: absenceScore
            });
        }

        // 2. عدد التأخيرات (0-25 نقطة)
        const lates = attendance.filter(a => a.late_minutes > 0).length;
        const lateScore = Math.min(lates * 5, 25);
        score += lateScore;
        if (lates > 0) {
            factors.push({
                label: `${lates} تأخير`,
                impact: lateScore > 15 ? 'high' : lateScore > 8 ? 'medium' : 'low',
                points: lateScore
            });
        }

        // 3. إجمالي دقائق التأخير (0-15 نقطة)
        const totalLateMinutes = attendance.reduce((sum, a) => sum + (a.late_minutes || 0), 0);
        const lateMinutesScore = Math.min(Math.floor(totalLateMinutes / 30), 15);
        score += lateMinutesScore;
        if (totalLateMinutes > 30) {
            factors.push({
                label: `${totalLateMinutes} دقيقة تأخير`,
                impact: lateMinutesScore > 10 ? 'high' : lateMinutesScore > 5 ? 'medium' : 'low',
                points: lateMinutesScore
            });
        }

        // 4. الإنذارات النشطة (0-20 نقطة)
        const activeAlerts = alerts.filter(a => a.status !== 'resolved').length;
        const alertScore = activeAlerts * 10;
        score += Math.min(alertScore, 20);
        if (activeAlerts > 0) {
            factors.push({
                label: `${activeAlerts} إنذار نشط`,
                impact: 'high',
                points: Math.min(alertScore, 20)
            });
        }

        // 5. الخصومات المالية (0-15 نقطة)
        const totalDeductions = deductions.reduce((sum, d) => sum + (d.amount || 0), 0);
        const deductionScore = Math.min(Math.floor(totalDeductions / 100), 15);
        score += deductionScore;
        if (totalDeductions > 0) {
            factors.push({
                label: `${totalDeductions} ر.س خصومات`,
                impact: deductionScore > 10 ? 'high' : deductionScore > 5 ? 'medium' : 'low',
                points: deductionScore
            });
        }

        // 6. نمط غياب الخميس/الأحد (0-20 نقطة إضافية)
        const weekendAbsences = attendance.filter(a => {
            if (a.status !== 'absent') return false;
            const day = new Date(a.work_date).getDay();
            return day === 0 || day === 4; // الأحد أو الخميس
        }).length;
        const weekendScore = weekendAbsences * 10;
        score += Math.min(weekendScore, 20);
        if (weekendAbsences > 0) {
            factors.push({
                label: `${weekendAbsences} غياب خميس/أحد`,
                impact: 'high',
                points: Math.min(weekendScore, 20)
            });
        }

        // تحديد مستوى المخاطرة
        let level = 'low';
        if (score >= 50) {
            level = 'high';
        } else if (score >= 25) {
            level = 'medium';
        }

        return {
            score: Math.min(score, 100),
            level,
            factors,
            absences,
            lates,
            totalLateMinutes,
            activeAlerts,
            totalDeductions,
            weekendAbsences
        };
    };

    // ═══════════════════════════════════════════════════════════════
    // 📊 جلب البيانات وتحليلها
    // ═══════════════════════════════════════════════════════════════
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
            const today = format(new Date(), 'yyyy-MM-dd');

            // 1. جلب الموظفين النشطين
            const { data: emps, error: empError } = await supabase
                .from('profiles')
                .select('id, name_ar, employee_number, department, job_title')
                .eq('is_active', true)
                .neq('role', 'general_manager');

            if (empError) throw empError;

            // 2. جلب سجلات الحضور
            const { data: attendance, error: attError } = await supabase
                .from('attendance_records')
                .select('user_id, work_date, status, late_minutes')
                .gte('work_date', thirtyDaysAgo)
                .lte('work_date', today);

            if (attError) throw attError;

            // 3. جلب التنبيهات
            const { data: alerts, error: alertError } = await supabase
                .from('employee_alerts')
                .select('employee_id, alert_type, status')
                .gte('created_at', thirtyDaysAgo);

            if (alertError) throw alertError;

            // 4. جلب الخصومات
            const { data: deductions, error: dedError } = await supabase
                .from('attendance_deductions')
                .select('user_id, amount')
                .gte('deduction_date', thirtyDaysAgo);

            if (dedError) throw dedError;

            // 5. حساب المخاطرة لكل موظف
            const riskAnalysis = emps.map(emp => {
                const empAttendance = attendance?.filter(a => a.user_id === emp.id) || [];
                const empAlerts = alerts?.filter(a => a.employee_id === emp.id) || [];
                const empDeductions = deductions?.filter(d => d.user_id === emp.id) || [];

                const risk = calculateRiskScore(emp, empAttendance, empAlerts, empDeductions);

                return {
                    ...emp,
                    risk
                };
            });

            // ترتيب حسب درجة المخاطرة (الأعلى أولاً)
            riskAnalysis.sort((a, b) => b.risk.score - a.risk.score);

            // حساب الإحصائيات
            const statsCalc = {
                high: riskAnalysis.filter(e => e.risk.level === 'high').length,
                medium: riskAnalysis.filter(e => e.risk.level === 'medium').length,
                low: riskAnalysis.filter(e => e.risk.level === 'low').length,
                total: riskAnalysis.length
            };

            setRiskData(riskAnalysis);
            setStats(statsCalc);

        } catch (error) {
            console.error('Error fetching risk data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (checkPermission('risk_dashboard')) {
            fetchData();
        }
    }, [fetchData, checkPermission]);

    // ═══════════════════════════════════════════════════════════════
    // 🎨 مكونات العرض
    // ═══════════════════════════════════════════════════════════════
    const getRiskBadge = (level) => {
        switch (level) {
            case 'high':
                return <Badge className="bg-red-500 text-white">🔴 عالي</Badge>;
            case 'medium':
                return <Badge className="bg-yellow-500 text-white">🟡 متوسط</Badge>;
            default:
                return <Badge className="bg-green-500 text-white">🟢 منخفض</Badge>;
        }
    };

    const getProgressColor = (score) => {
        if (score >= 50) return 'bg-red-500';
        if (score >= 25) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getImpactColor = (impact) => {
        switch (impact) {
            case 'high': return 'text-red-600 bg-red-50';
            case 'medium': return 'text-yellow-600 bg-yellow-50';
            default: return 'text-green-600 bg-green-50';
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // 🔒 التحقق من الصلاحية
    // ═══════════════════════════════════════════════════════════════
    if (!checkPermission('risk_dashboard')) {
        return (
            <div className="p-8 flex justify-center items-center h-[60vh]">
                <Alert variant="destructive" className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>وصول مرفوض</AlertTitle>
                    <AlertDescription>ليس لديك صلاحية للوصول إلى هذه الصفحة.</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="space-y-6 p-4 md:p-6"
        >
            <Helmet><title>تحليل المخاطر | MTS Supreme</title></Helmet>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <PageTitle title="تحليل المخاطر" icon={AlertTriangle} />
                <Button onClick={fetchData} variant="outline" disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
                    تحديث
                </Button>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 📊 إحصائيات سريعة */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-red-600 mb-1">خطورة عالية</p>
                                <p className="text-3xl font-bold text-red-700">{stats.high}</p>
                            </div>
                            <div className="h-12 w-12 bg-red-200 rounded-full flex items-center justify-center">
                                <XCircle className="h-6 w-6 text-red-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-yellow-600 mb-1">خطورة متوسطة</p>
                                <p className="text-3xl font-bold text-yellow-700">{stats.medium}</p>
                            </div>
                            <div className="h-12 w-12 bg-yellow-200 rounded-full flex items-center justify-center">
                                <AlertCircle className="h-6 w-6 text-yellow-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-green-600 mb-1">خطورة منخفضة</p>
                                <p className="text-3xl font-bold text-green-700">{stats.low}</p>
                            </div>
                            <div className="h-12 w-12 bg-green-200 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-blue-600 mb-1">إجمالي الموظفين</p>
                                <p className="text-3xl font-bold text-blue-700">{stats.total}</p>
                            </div>
                            <div className="h-12 w-12 bg-blue-200 rounded-full flex items-center justify-center">
                                <Users className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 📋 قائمة الموظفين */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        تحليل مخاطر الموظفين (آخر 30 يوم)
                    </CardTitle>
                    <CardDescription>
                        تحليل شامل لأنماط الحضور والغياب والتأخير
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : riskData.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            لا يوجد بيانات للتحليل
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {riskData.map((emp) => (
                                <motion.div
                                    key={emp.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`border rounded-lg overflow-hidden transition-all ${
                                        emp.risk.level === 'high' ? 'border-red-200 bg-red-50/30' :
                                        emp.risk.level === 'medium' ? 'border-yellow-200 bg-yellow-50/30' :
                                        'border-green-200 bg-green-50/30'
                                    }`}
                                >
                                    {/* Header Row */}
                                    <div 
                                        className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                        onClick={() => setExpandedEmployee(
                                            expandedEmployee === emp.id ? null : emp.id
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                {/* Avatar */}
                                                <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-bold ${
                                                    emp.risk.level === 'high' ? 'bg-red-500' :
                                                    emp.risk.level === 'medium' ? 'bg-yellow-500' :
                                                    'bg-green-500'
                                                }`}>
                                                    {emp.name_ar?.charAt(0) || '?'}
                                                </div>
                                                
                                                {/* Info */}
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-gray-900">{emp.name_ar}</span>
                                                        {getRiskBadge(emp.risk.level)}
                                                    </div>
                                                    <div className="text-sm text-gray-500 flex items-center gap-2">
                                                        <span>{emp.employee_number}</span>
                                                        <span>•</span>
                                                        <span>{emp.department}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Risk Score */}
                                            <div className="flex items-center gap-4">
                                                <div className="text-left w-32 hidden md:block">
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-gray-500">درجة المخاطرة</span>
                                                        <span className="font-bold">{emp.risk.score}%</span>
                                                    </div>
                                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full ${getProgressColor(emp.risk.score)} transition-all`}
                                                            style={{ width: `${emp.risk.score}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Quick Stats */}
                                                <div className="flex items-center gap-3 text-sm">
                                                    <div className="flex items-center gap-1 text-red-600" title="غيابات">
                                                        <XCircle className="h-4 w-4" />
                                                        <span>{emp.risk.absences}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-yellow-600" title="تأخيرات">
                                                        <Clock className="h-4 w-4" />
                                                        <span>{emp.risk.lates}</span>
                                                    </div>
                                                </div>

                                                {/* Expand Button */}
                                                <Button variant="ghost" size="sm">
                                                    {expandedEmployee === emp.id ? (
                                                        <ChevronUp className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {expandedEmployee === emp.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t bg-white p-4"
                                        >
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                <div className="bg-gray-50 rounded-lg p-3">
                                                    <div className="text-xs text-gray-500 mb-1">إجمالي الغيابات</div>
                                                    <div className="text-xl font-bold text-red-600">{emp.risk.absences}</div>
                                                </div>
                                                <div className="bg-gray-50 rounded-lg p-3">
                                                    <div className="text-xs text-gray-500 mb-1">إجمالي التأخيرات</div>
                                                    <div className="text-xl font-bold text-yellow-600">{emp.risk.lates}</div>
                                                </div>
                                                <div className="bg-gray-50 rounded-lg p-3">
                                                    <div className="text-xs text-gray-500 mb-1">دقائق التأخير</div>
                                                    <div className="text-xl font-bold text-orange-600">{emp.risk.totalLateMinutes}</div>
                                                </div>
                                                <div className="bg-gray-50 rounded-lg p-3">
                                                    <div className="text-xs text-gray-500 mb-1">غياب خميس/أحد</div>
                                                    <div className="text-xl font-bold text-purple-600">{emp.risk.weekendAbsences}</div>
                                                </div>
                                            </div>

                                            {/* Risk Factors */}
                                            <div className="mb-4">
                                                <h4 className="text-sm font-semibold text-gray-700 mb-2">عوامل المخاطرة:</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {emp.risk.factors.length > 0 ? (
                                                        emp.risk.factors.map((factor, idx) => (
                                                            <span
                                                                key={idx}
                                                                className={`px-3 py-1 rounded-full text-xs font-medium ${getImpactColor(factor.impact)}`}
                                                            >
                                                                {factor.label} (+{factor.points})
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-green-600 text-sm">✅ لا توجد عوامل خطورة</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline">
                                                    <Eye className="h-4 w-4 ml-2" />
                                                    عرض الملف الكامل
                                                </Button>
                                                {emp.risk.level === 'high' && (
                                                    <Button size="sm" variant="destructive">
                                                        <AlertTriangle className="h-4 w-4 ml-2" />
                                                        إرسال إنذار
                                                    </Button>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 💡 نصائح وتوصيات */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {stats.high > 0 && (
                <Alert className="bg-red-50 border-red-200">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertTitle className="text-red-800">تنبيه هام!</AlertTitle>
                    <AlertDescription className="text-red-700">
                        يوجد {stats.high} موظف في منطقة الخطر العالي. يُنصح بمراجعة ملفاتهم واتخاذ الإجراءات اللازمة.
                    </AlertDescription>
                </Alert>
            )}
        </motion.div>
    );
};

export default RiskDashboard;