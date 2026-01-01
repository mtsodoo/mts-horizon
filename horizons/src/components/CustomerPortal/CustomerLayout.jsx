
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { LogOut, Home, PackagePlus, ListOrdered, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const CustomerLayout = ({
  children
}) => {
  const {
    customer,
    logout
  } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = path => location.pathname === path;

  // Custom accent color class for consistency
  const accentColor = "text-[#a31d22]";
  const bgAccentColor = "bg-[#a31d22]";
  const hoverBgAccentColor = "hover:bg-[#a31d22]";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans" dir="rtl">
      {/* Header */}
      <header className="bg-black text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/customer-portal/dashboard')}>
              <div className="bg-white p-1.5 rounded-lg w-12 h-12 flex items-center justify-center overflow-hidden">
                 <img src="https://horizons-cdn.hostinger.com/7f70f011-64fe-4b0e-986f-58e20162a8c4/eb6e5181052fdae943a0201a9ad1cd22.png" alt="MTS Supreme Logo" className="w-full h-full object-contain" src="https://images.unsplash.com/photo-1554750338-8993ad810455" />
              </div>
              <div>
                <h1 className="text-lg font-bold">بوابة العملاء</h1>
                <p className="text-xs text-gray-400 hidden sm:block">MTS Supreme</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-medium">{customer?.customer_name}</span>
                <span className="text-xs text-gray-400">{customer?.customer_code}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className={`text-white hover:text-white hover:bg-[#a31d22] transition-colors`} 
                onClick={logout} 
                title="تسجيل الخروج"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-b overflow-x-auto whitespace-nowrap">
        <div className="flex p-2 gap-2">
            <Button 
              variant={isActive('/customer-portal/dashboard') ? "default" : "ghost"} 
              size="sm" 
              className={isActive('/customer-portal/dashboard') ? `bg-[#a31d22] hover:bg-[#8a181c] text-white` : "text-gray-600 hover:text-[#a31d22]"} 
              onClick={() => navigate('/customer-portal/dashboard')}
            >
              <Home className="w-4 h-4 ml-2" />
              الرئيسية
            </Button>
            <Button 
              variant={isActive('/customer-portal/new-order') ? "default" : "ghost"} 
              size="sm" 
              className={isActive('/customer-portal/new-order') ? `bg-[#a31d22] hover:bg-[#8a181c] text-white` : "text-gray-600 hover:text-[#a31d22]"} 
              onClick={() => navigate('/customer-portal/new-order')}
            >
              <PackagePlus className="w-4 h-4 ml-2" />
              طلب جديد
            </Button>
            <Button 
              variant={isActive('/customer-portal/my-orders') ? "default" : "ghost"} 
              size="sm" 
              className={isActive('/customer-portal/my-orders') ? `bg-[#a31d22] hover:bg-[#8a181c] text-white` : "text-gray-600 hover:text-[#a31d22]"} 
              onClick={() => navigate('/customer-portal/my-orders')}
            >
              <ListOrdered className="w-4 h-4 ml-2" />
              طلباتي
            </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} MTS - جميع الحقوق محفوظة</p>
          <div className="flex items-center gap-6">
            <a href="#" className={`hover:text-[#a31d22] flex items-center gap-1 transition-colors`}>
              <Phone className="w-4 h-4" />
              الدعم الفني: 920000000
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CustomerLayout;
