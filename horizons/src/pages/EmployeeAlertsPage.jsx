import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Bell, Clock, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getEmployeeAlerts } from '@/utils/alertOperations';
import AlertChatDialog from '@/components/alerts/AlertChatDialog';

const EmployeeAlertsPage = () => {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [chatOpen, setChatOpen] = useState(false);

    useEffect(() => {
        loadAlerts();
    }, [filter, profile]);

    const loadAlerts = async () => {
        if (!profile?.id) return;
        
        setLoading(true);
        try {
            const status = filter === 'all' ? null : filter;
            const data = await getEmployeeAlerts(profile.id, status);
            setAlerts(data);
        } catch (error) {
            console.error('Error loading alerts:', error);
            toast({
                variant: 'destructive',
                title: 'خطأ',
                description: 'فشل تحميل التنبيهات'
            });
        } finally {
            setLoading(false);
        }
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
            pending: { label: 'معلق - يتطلب الرد', color: 'destructive' },
            responded: { label: 'تم الرد - بانتظار المراجعة', color: 'default' },
            resolved: { label: 'تم الحل', color: 'outline' },
            dismissed: { label: 'ملغي', color: 'outline' }
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

    const handleOpenChat = (alert) => {
        setSelectedAlert(alert);
        setChatOpen(true);
    };

    const handleChatComplete = () => {
        setChatOpen(false);
        setSelectedAlert(null);
        loadAlerts();
    };

    return (
        <>
            <Helmet>
                <title>تنبيهاتي - MTS Supreme</title>
            </Helmet>
            <div className="container mx-auto p-6 space-y-6">
                <PageTitle title="تنبيهاتي" icon={Bell} />

                <div className="flex gap-2 flex-wrap">
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
                        تم الرد
                    </Button>
                    <Button 
                        variant={filter === 'resolved' ? 'default' : 'outline'}
                        onClick={() => setFilter('resolved')}
                    >
                        محلولة
                    </Button>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground font-cairo">جاري التحميل...</p>
                    </div>
                ) : alerts.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
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
                                                    <CardTitle className="text-lg font-cairo">
                                                        <span className={`inline-block px-3 py-1 rounded-full text-sm ${getAlertTypeColor(alert.alert_type)}`}>
                                                            {getAlertTypeLabel(alert.alert_type)}
                                                        </span>
                                                    </CardTitle>
                                                    <p className="text-sm text-muted-foreground mt-1">
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
                                                <p>تاريخ التنبيه: {new Date(alert.created_at).toLocaleDateString('ar-SA', { 
                                                    year: 'numeric', 
                                                    month: 'long', 
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}</p>
                                            </div>
                                            {alert.status === 'pending' && (
                                                <Button onClick={() => handleOpenChat(alert)} className="gap-2">
                                                    <MessageSquare className="h-4 w-4" />
                                                    الرد على التنبيه
                                                </Button>
                                            )}
                                            {alert.status === 'responded' && (
                                                <Button variant="outline" onClick={() => handleOpenChat(alert)} className="gap-2">
                                                    <MessageSquare className="h-4 w-4" />
                                                    عرض المحادثة
                                                </Button>
                                            )}
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
                onComplete={handleChatComplete}
            />
        </>
    );
};

export default EmployeeAlertsPage;