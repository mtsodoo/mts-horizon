import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { ClipboardCheck, Bell, Clock, CheckCircle, AlertCircle, MessageSquare, User, Calendar, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getAllAlerts, getAlertsStats, updateAlertStatus } from '@/utils/alertOperations';
import AlertChatDialog from '@/components/alerts/AlertChatDialog';

const ManagerAlertsPage = () => {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [alerts, setAlerts] = useState([]);
    const [stats, setStats] = useState({ pending: 0, responded: 0, resolved: 0, dismissed: 0, total: 0 });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [chatOpen, setChatOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [filter]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [alertsData, statsData] = await Promise.all([
                getAllAlerts(filter === 'all' ? null : filter),
                getAlertsStats()
            ]);
            setAlerts(alertsData);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading data:', error);
            toast({
                variant: 'destructive',
                title: 'خطأ',
                description: 'فشل تحميل البيانات'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleResolveAlert = async (alertId, action) => {
        try {
            await updateAlertStatus(alertId, action === 'accept' ? 'resolved' : 'dismissed', profile.id);
            toast({
                title: 'تم',
                description: action === 'accept' ? 'تم قبول العذر' : 'تم رفض العذر'
            });
            loadData();
        } catch (error) {
            console.error('Error resolving alert:', error);
            toast({
                variant: 'destructive',
                title: 'خطأ',
                description: 'فشل تحديث التنبيه'
            });
        }
    };

    const handleViewConversation = (alert) => {
        setSelectedAlert(alert);
        setChatOpen(true);
    };

    const handleChatClose = () => {
        setChatOpen(false);
        setSelectedAlert(null);
        loadData();
    };

    const getAlertTypeLabel = (type) => {
        const types = {
            absence: 'غياب',
            late: 'تأخير',
            early_leave: 'انصراف مبكر',
            loan_reminder: 'تذكير سلفة'
        };
        return types[type] || type;
    };

    const getAlertTypeColor = (type) => {
        const colors = {
            absence: 'bg-red-100 text-red-800',
            late: 'bg-orange-100 text-orange-800',
            early_leave: 'bg-yellow-100 text-yellow-800',
            loan_reminder: 'bg-blue-100 text-blue-800'
        };
        return colors[type] || 'bg-gray-100 text-gray-800';
    };

    const getStatusBadge = (status) => {
        const statuses = {
            pending: { label: 'معلق', color: 'destructive' },
            responded: { label: 'بانتظار المراجعة', color: 'default' },
            resolved: { label: 'تم الحل', color: 'outline' },
            dismissed: { label: 'مرفوض', color: 'outline' }
        };
        const s = statuses[status] || { label: status, color: 'default' };
        return <Badge variant={s.color}>{s.label}</Badge>;
    };

    const getStatusIcon = (status) => {
        const icons = {
            pending: AlertCircle,
            responded: Clock,
            resolved: CheckCircle,
            dismissed: CheckCircle
        };
        const Icon = icons[status] || AlertCircle;
        const colors = {
            pending: 'text-red-500',
            responded: 'text-yellow-500',
            resolved: 'text-green-500',
            dismissed: 'text-gray-500'
        };
        return <Icon className={`h-6 w-6 ${colors[status]}`} />;
    };

    return (
        <>
            <Helmet>
                <title>مراجعة التنبيهات - MTS Supreme</title>
            </Helmet>
            <div className="container mx-auto p-6 space-y-6">
                <PageTitle title="مراجعة التنبيهات" icon={ClipboardCheck} />

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground font-cairo">إجمالي التنبيهات</p>
                                    <p className="text-2xl font-bold">{stats.total}</p>
                                </div>
                                <Bell className="h-8 w-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground font-cairo">معلقة</p>
                                    <p className="text-2xl font-bold text-red-600">{stats.pending}</p>
                                </div>
                                <AlertCircle className="h-8 w-8 text-red-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground font-cairo">بانتظار المراجعة</p>
                                    <p className="text-2xl font-bold text-yellow-600">{stats.responded}</p>
                                </div>
                                <Clock className="h-8 w-8 text-yellow-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground font-cairo">محلولة</p>
                                    <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                                </div>
                                <CheckCircle className="h-8 w-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground font-cairo">مرفوضة</p>
                                    <p className="text-2xl font-bold text-gray-600">{stats.dismissed}</p>
                                </div>
                                <CheckCircle className="h-8 w-8 text-gray-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex gap-2 flex-wrap items-center">
                    <Filter className="h-5 w-5 text-muted-foreground" />
                    <Button 
                        variant={filter === 'all' ? 'default' : 'outline'}
                        onClick={() => setFilter('all')}
                    >
                        الكل
                    </Button>
                    <Button 
                        variant={filter === 'pending' ? 'default' : 'outline'}
                        onClick={() => setFilter('pending')}
                    >
                        معلقة
                    </Button>
                    <Button 
                        variant={filter === 'responded' ? 'default' : 'outline'}
                        onClick={() => setFilter('responded')}
                    >
                        بانتظار المراجعة
                    </Button>
                    <Button 
                        variant={filter === 'resolved' ? 'default' : 'outline'}
                        onClick={() => setFilter('resolved')}
                    >
                        محلولة
                    </Button>
                    <Button 
                        variant={filter === 'dismissed' ? 'default' : 'outline'}
                        onClick={() => setFilter('dismissed')}
                    >
                        مرفوضة
                    </Button>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground font-cairo">جاري التحميل...</p>
                    </div>
                ) : alerts.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <ClipboardCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-muted-foreground font-cairo">لا توجد تنبيهات</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {alerts.map((alert) => (
                            <motion.div
                                key={alert.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Card className="hover:shadow-lg transition-shadow">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                {getStatusIcon(alert.status)}
                                                <div>
                                                    <CardTitle className="text-lg font-cairo flex items-center gap-2">
                                                        <span className={`inline-block px-3 py-1 rounded-full text-sm ${getAlertTypeColor(alert.alert_type)}`}>
                                                            {getAlertTypeLabel(alert.alert_type)}
                                                        </span>
                                                        <span className="text-base text-muted-foreground flex items-center gap-1">
                                                            <User className="h-4 w-4" />
                                                            {alert.profiles?.name_ar || 'موظف'}
                                                        </span>
                                                    </CardTitle>
                                                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                                                        <Calendar className="h-4 w-4" />
                                                        التاريخ: {new Date(alert.reference_date).toLocaleDateString('ar-SA')}
                                                    </p>
                                                </div>
                                            </div>
                                            {getStatusBadge(alert.status)}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex justify-between items-center">
                                            <div className="text-sm text-muted-foreground">
                                                {/* Removed employee_number display as it doesn't exist in DB */}
                                                <p>تاريخ التنبيه: {new Date(alert.created_at).toLocaleDateString('ar-SA', { 
                                                    year: 'numeric', 
                                                    month: 'long', 
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {alert.status === 'responded' && (
                                                    <>
                                                        <Button 
                                                            variant="outline" 
                                                            onClick={() => handleViewConversation(alert)}
                                                            className="gap-2"
                                                        >
                                                            <MessageSquare className="h-4 w-4" />
                                                            عرض المحادثة
                                                        </Button>
                                                        <Button 
                                                            variant="default"
                                                            onClick={() => handleResolveAlert(alert.id, 'accept')}
                                                            className="gap-2 bg-green-600 hover:bg-green-700"
                                                        >
                                                            <CheckCircle className="h-4 w-4" />
                                                            قبول العذر
                                                        </Button>
                                                        <Button 
                                                            variant="destructive"
                                                            onClick={() => handleResolveAlert(alert.id, 'reject')}
                                                            className="gap-2"
                                                        >
                                                            رفض
                                                        </Button>
                                                    </>
                                                )}
                                                {(alert.status === 'resolved' || alert.status === 'dismissed') && (
                                                    <Button 
                                                        variant="outline" 
                                                        onClick={() => handleViewConversation(alert)}
                                                        className="gap-2"
                                                    >
                                                        <MessageSquare className="h-4 w-4" />
                                                        عرض المحادثة
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            <AlertChatDialog 
                open={chatOpen}
                onOpenChange={setChatOpen}
                alert={selectedAlert}
                onComplete={handleChatClose}
            />
        </>
    );
};

export default ManagerAlertsPage;