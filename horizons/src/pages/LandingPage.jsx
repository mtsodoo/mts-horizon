
import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Building, Truck, ArrowRight, ShieldCheck, Zap, HeartHandshake } from 'lucide-react';
import { motion } from 'framer-motion';

const LandingPage = () => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col items-center justify-center p-4 md:p-8 font-['Cairo']" dir="rtl">
      
      {/* Header / Logo Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 text-center"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl shadow-lg mb-6 border border-slate-200 dark:border-slate-700">
          <ShieldCheck className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
          MTS Supreme
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
          النظام المتكامل لإدارة العمليات والموارد والعلاقات اللوجستية
        </p>
      </motion.div>

      {/* Login Cards Grid */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl px-4"
      >
        {/* Employee Login Card */}
        <motion.div variants={item} className="h-full">
          <Link to="/login" className="group block h-full bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 dark:border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-blue-900/20 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110 duration-500" />
            
            <div className="relative z-10">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                <Briefcase className="w-7 h-7" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                بوابة الموظفين
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                الدخول للنظام الإداري للموظفين والمدراء لإدارة المهام والطلبات
              </p>
              
              <div className="flex items-center text-blue-600 dark:text-blue-400 font-bold group-hover:translate-x-[-8px] transition-transform duration-300">
                تسجيل الدخول <ArrowRight className="w-5 h-5 mr-2" />
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Customer Login Card */}
        <motion.div variants={item} className="h-full">
          <Link to="/customer-portal" className="group block h-full bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 dark:border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/20 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110 duration-500" />
            
            <div className="relative z-10">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                <Building className="w-7 h-7" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                بوابة العملاء
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                مساحة مخصصة للعملاء لمتابعة المشاريع والفواتير وتقديم الطلبات
              </p>
              
              <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-bold group-hover:translate-x-[-8px] transition-transform duration-300">
                دخول العملاء <ArrowRight className="w-5 h-5 mr-2" />
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Delivery Login Card */}
        <motion.div variants={item} className="h-full">
          <Link to="/delivery/login" className="group block h-full bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 dark:border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 dark:bg-orange-900/20 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110 duration-500" />
            
            <div className="relative z-10">
              <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/50 rounded-2xl flex items-center justify-center mb-6 text-orange-600 dark:text-orange-400 group-hover:bg-orange-600 group-hover:text-white transition-colors duration-300">
                <Truck className="w-7 h-7" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                بوابة التوصيل
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                منصة خاصة لشركاء التوصيل لإدارة الشحنات وتحديث حالات التسليم
              </p>
              
              <div className="flex items-center text-orange-600 dark:text-orange-400 font-bold group-hover:translate-x-[-8px] transition-transform duration-300">
                دخول السائقين <ArrowRight className="w-5 h-5 mr-2" />
              </div>
            </div>
          </Link>
        </motion.div>
      </motion.div>

      {/* Footer Info */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-16 text-center"
      >
        <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>نظام آمن ومشفر</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span>أداء عالي السرعة</span>
          </div>
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-4 h-4" />
            <span>دعم فني متواصل</span>
          </div>
        </div>
        <p className="mt-8 text-xs text-slate-400 dark:text-slate-600">
          © {new Date().getFullYear()} MTS Supreme. جميع الحقوق محفوظة.
        </p>
      </motion.div>
    </div>
  );
};

export default LandingPage;
