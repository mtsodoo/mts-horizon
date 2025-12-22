import React from 'react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Briefcase } from 'lucide-react'; // Changed icon import

const PageTitle = ({ title, icon: Icon }) => {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{title} | {t('appName')}</title>
      </Helmet>
      <motion.div
        className="flex items-center space-x-4 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {Icon && <Icon className="h-10 w-10 text-blue-500" />}
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{title}</h1>
      </motion.div>
    </>
  );
};

export default PageTitle;