import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { CalendarDays, DollarSign, AlertCircle } from 'lucide-react';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { usePermission } from '@/contexts/PermissionContext';

const EventManagement = () => {
    const { toast } = useToast();
    const { checkPermission } = usePermission();

    // 🔒 التحقق من الصلاحية
    if (!checkPermission('financial_management')) {
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

    const handleCreateEvent = () => {
        toast({
            title: "🚧 هذه الميزة ليست جاهزة بعد",
            description: "يمكنك طلبها في طلبك التالي! 🚀",
        });
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="p-4 md:p-6 space-y-6"
        >
            <Helmet><title>إدارة الفعاليات | MTS Supreme</title></Helmet>
            
            <PageTitle title="إدارة الفعاليات المالية" icon={CalendarDays} />

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        نظرة عامة على الفعاليات
                    </CardTitle>
                    <CardDescription>إدارة الفعاليات والمصروفات والإيرادات المرتبطة بها.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>
                        هذه الصفحة مخصصة لإدارة الفعاليات الخاصة بالشركة، مثل المؤتمرات، ورش العمل، أو المشاريع الكبيرة ذات الميزانيات المحددة.
                        يمكنك تتبع الإيرادات والمصروفات لكل فعالية لحساب صافي الربح أو الخسارة.
                    </p>
                    <Button onClick={handleCreateEvent}>
                        إنشاء فعالية جديدة
                    </Button>
                    <Alert className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>ميزة قيد التطوير</AlertTitle>
                        <AlertDescription>
                            وظائف إدارة الفعاليات قيد التطوير حاليًا. يمكنك طلبها في طلبك التالي! 🚀
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            {/* Placeholder for future event list, details, etc. */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="min-h-[200px] flex items-center justify-center">
                    <CardContent className="text-center text-gray-500">
                        قائمة الفعاليات ستظهر هنا
                    </CardContent>
                </Card>
                <Card className="min-h-[200px] flex items-center justify-center">
                    <CardContent className="text-center text-gray-500">
                        تحليلات وإحصائيات الفعاليات
                    </CardContent>
                </Card>
            </div>
        </motion.div>
    );
};

export default EventManagement;