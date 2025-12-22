import React from 'react';
import { Helmet } from 'react-helmet';
import PageTitle from '@/components/PageTitle';
import { 
    DollarSign, 
    Database, 
    Trophy, 
    ClipboardEdit, 
    Package, 
    CalendarDays, 
    PieChart,
    Wallet,
    FileSpreadsheet,
    ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from 'framer-motion';

const FinancialManagement = () => {
    const navigate = useNavigate();

    const menuItems = [
        {
            id: 'odoo',
            title: 'لوحة بيانات Odoo',
            description: 'الفواتير والسجلات المحاسبية',
            icon: Database,
            route: '/financial-management/odoo-dashboard',
            color: 'bg-blue-500',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200'
        },
        {
            id: 'match-management',
            title: 'إدارة المباريات',
            description: 'التكاليف والأرباح والموردين',
            icon: Trophy,
            route: '/financial-management/match-management',
            color: 'bg-amber-500',
            bgColor: 'bg-amber-50',
            borderColor: 'border-amber-200'
        },
        {
            id: 'match-data-entry',
            title: 'إدخال بيانات المباريات',
            description: 'إدخال معلومات المباريات الأساسية',
            icon: ClipboardEdit,
            route: '/financial-management/match-data-entry',
            color: 'bg-green-500',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200'
        },
        {
            id: 'custody-review',
            title: 'مراجعة تسويات العهد',
            description: 'مراجعة واعتماد تسويات الموظفين',
            icon: Package,
            route: '/financial-management/custody-settlement-review',
            color: 'bg-purple-500',
            bgColor: 'bg-purple-50',
            borderColor: 'border-purple-200'
        },
        {
            id: 'events',
            title: 'إدارة الفعاليات',
            description: 'الفعاليات والمناسبات',
            icon: CalendarDays,
            route: '/financial-management/event-management',
            color: 'bg-rose-500',
            bgColor: 'bg-rose-50',
            borderColor: 'border-rose-200'
        },
        {
            id: 'finance-dashboard',
            title: 'التقارير المالية',
            description: 'ملخص الأداء المالي',
            icon: PieChart,
            route: '/financial-management/finance-dashboard',
            color: 'bg-teal-500',
            bgColor: 'bg-teal-50',
            borderColor: 'border-teal-200'
        },
        {
            id: 'payroll',
            title: 'مسير الرواتب',
            description: 'إدارة رواتب الموظفين',
            icon: Wallet,
            route: '/payroll',
            color: 'bg-emerald-500',
            bgColor: 'bg-emerald-50',
            borderColor: 'border-emerald-200'
        }
    ];

    return (
        <>
            <Helmet><title>الإدارة المالية</title></Helmet>
            <div className="space-y-6 p-4 md:p-6">
                <PageTitle 
                    title="الإدارة المالية" 
                    icon={DollarSign} 
                    description="إدارة الشؤون المالية والمحاسبية"
                />
                
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {menuItems.map((item, index) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Card 
                                className={`cursor-pointer hover:shadow-lg transition-all duration-200 border-2 ${item.borderColor} ${item.bgColor} h-full`}
                                onClick={() => navigate(item.route)}
                            >
                                <CardContent className="p-4 flex flex-col items-center text-center">
                                    <div className={`p-3 rounded-xl ${item.color} text-white mb-3 shadow-md`}>
                                        <item.icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-gray-800 text-sm mb-1">
                                        {item.title}
                                    </h3>
                                    <p className="text-xs text-gray-500 line-clamp-2">
                                        {item.description}
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Quick Stats Section */}
                <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-2 mb-3">
                        <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                        <h3 className="font-bold text-gray-700">روابط سريعة</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button 
                            onClick={() => navigate('/financial-management/match-management')}
                            className="px-3 py-1.5 bg-white rounded-lg text-xs font-medium text-gray-600 hover:bg-blue-100 hover:text-blue-700 transition-colors border shadow-sm"
                        >
                            🏆 آخر مباراة
                        </button>
                        <button 
                            onClick={() => navigate('/payroll')}
                            className="px-3 py-1.5 bg-white rounded-lg text-xs font-medium text-gray-600 hover:bg-green-100 hover:text-green-700 transition-colors border shadow-sm"
                        >
                            💰 رواتب الشهر
                        </button>
                        <button 
                            onClick={() => navigate('/financial-management/custody-settlement-review')}
                            className="px-3 py-1.5 bg-white rounded-lg text-xs font-medium text-gray-600 hover:bg-purple-100 hover:text-purple-700 transition-colors border shadow-sm"
                        >
                            📦 عهد معلقة
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default FinancialManagement;