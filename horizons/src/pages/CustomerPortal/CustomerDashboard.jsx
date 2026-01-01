import React from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerLayout from '@/components/CustomerPortal/CustomerLayout';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Warehouse, MoreHorizontal, ListOrdered, PhoneCall, Clock, Sparkles, Package, FileText, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion } from 'framer-motion';

// ✅ الشعار
const LOGO_URL = 'https://sys.mtserp.com/logo/b-logo.png';

// ✅ بطاقة موحدة - نفس تصميم الداشبورد الرئيسي
const ActionCard = ({ title, description, icon: Icon, onClick, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
    amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
    teal: 'bg-teal-50 text-teal-600 group-hover:bg-teal-100',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
    gray: 'bg-gray-50 text-gray-600 group-hover:bg-gray-100',
    green: 'bg-green-50 text-green-600 group-hover:bg-green-100',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400 }}
      className="rounded-xl px-4 py-4 flex items-center gap-4 shadow-sm hover:shadow-md border transition-all duration-200 cursor-pointer bg-white hover:border-blue-200 group"
      onClick={onClick}
    >
      <div className={`p-3 rounded-xl flex-shrink-0 transition-colors ${colorClasses[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-gray-800 truncate">{title}</h3>
        {description && (
          <p className="text-xs text-gray-500 truncate">{description}</p>
        )}
      </div>
    </motion.div>
  );
};

// ✅ بطاقة ثانوية صغيرة
const SecondaryCard = ({ title, description, icon: Icon, onClick }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    transition={{ type: 'spring', stiffness: 400 }}
    className="rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm hover:shadow-md border transition-all duration-200 cursor-pointer bg-white hover:border-gray-300 group"
    onClick={onClick}
  >
    <div className="p-2 rounded-lg flex-shrink-0 bg-gray-100 text-gray-600 group-hover:bg-gray-200 transition-colors">
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-bold text-gray-700 truncate">{title}</h3>
      {description && (
        <p className="text-xs text-gray-400 truncate">{description}</p>
      )}
    </div>
  </motion.div>
);

const CustomerDashboard = () => {
  const { customer } = useCustomerAuth();
  const navigate = useNavigate();

  const mainActions = [
    { 
      title: 'طلب توريد جماهير', 
      description: 'أدوات تشجيع للمباريات والفعاليات', 
      icon: Users, 
      color: 'amber',
      onClick: () => navigate('/customer-portal/fans-order') 
    },
    { 
      title: 'طلب من المستودع', 
      description: 'شالات، أعلام، بنرات، وغيرها', 
      icon: Warehouse, 
      color: 'teal',
      onClick: () => navigate('/customer-portal/new-order') 
    },
    { 
      title: 'طلبات أخرى', 
      description: 'خدمات خاصة وطلبات مخصصة', 
      icon: MoreHorizontal, 
      color: 'purple',
      onClick: () => navigate('/customer-portal/other-orders') 
    },
  ];

  const secondaryActions = [
    { 
      title: 'طلباتي السابقة', 
      description: 'متابعة حالة الطلبات', 
      icon: ListOrdered, 
      onClick: () => navigate('/customer-portal/my-orders') 
    },
    { 
      title: 'تواصل معنا', 
      description: 'الدعم الفني', 
      icon: PhoneCall, 
      onClick: () => window.location.href = 'tel:0539755999' 
    },
  ];

  return (
    <CustomerLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        
        {/* ✅ Header مع الشعار */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border"
        >
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <img 
                src={LOGO_URL} 
                alt="MTS Logo" 
                className="h-14 w-auto object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="text-center sm:text-right">
                <h1 className="text-xl font-bold text-gray-900">
                  مرحباً، {customer?.customer_name}
                </h1>
                <p className="text-gray-500 text-sm">اختر نوع الطلب الذي تريده</p>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-2 rounded-xl border flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{format(new Date(), 'EEEE، d MMMM yyyy', { locale: ar })}</span>
            </div>
          </div>
        </motion.div>

        {/* ✅ أنواع الطلبات الرئيسية */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            أنواع الطلبات
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mainActions.map((action, index) => (
              <ActionCard
                key={index}
                title={action.title}
                description={action.description}
                icon={action.icon}
                color={action.color}
                onClick={action.onClick}
              />
            ))}
          </div>
        </motion.div>

        {/* ✅ الإجراءات الثانوية */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" />
            خدمات أخرى
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {secondaryActions.map((action, index) => (
              <SecondaryCard
                key={index}
                title={action.title}
                description={action.description}
                icon={action.icon}
                onClick={action.onClick}
              />
            ))}
          </div>
        </motion.div>

        {/* ✅ معلومات التواصل */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border text-center"
        >
          <HelpCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-1">تحتاج مساعدة؟</p>
          <a 
            href="tel:0539755999" 
            className="text-lg font-bold text-teal-600 hover:text-teal-700 transition-colors"
            dir="ltr"
          >
            0539755999
          </a>
          <p className="text-xs text-gray-400 mt-1">متاحين على مدار الساعة</p>
        </motion.div>

        {/* ✅ Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center py-4"
        >
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} مؤسسة الحلول الفنية المتعددة للخدمات التجارية
          </p>
        </motion.div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerDashboard;