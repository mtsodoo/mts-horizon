
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';

const CustomerProtectedRoute = ({ children }) => {
  const { customer, loading } = useCustomerAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!customer) {
    return <Navigate to="/customer-portal" replace />;
  }

  return children;
};

export default CustomerProtectedRoute;
