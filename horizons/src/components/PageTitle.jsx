
import React from 'react';
import { Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const PageTitle = ({ title, icon: Icon, children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const LOGISTICS_PATHS = [
    '/fleet', 
    '/external-staff', 
    '/handover-certificates', 
    '/delivery-reports', 
    '/supply-orders'
  ];

  const showHomeButton = LOGISTICS_PATHS.some(path => location.pathname.startsWith(path));

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {Icon && <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <Icon className="w-6 h-6" />
        </div>}
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{title}</h1>
        {children}
      </div>
      
      {showHomeButton && (
        <Button 
           variant="outline" 
           size="sm" 
           onClick={() => navigate('/dashboard')}
           className="gap-2 text-gray-600 hover:text-primary"
        >
           <Home className="w-4 h-4" />
           الرئيسية
        </Button>
      )}
    </div>
  );
};

export default PageTitle;
