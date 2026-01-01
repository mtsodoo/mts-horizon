
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CustomerAuthContext = createContext();

export const CustomerAuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for session
    const storedSession = localStorage.getItem('customer_session');
    if (storedSession) {
      try {
        setCustomer(JSON.parse(storedSession));
      } catch (e) {
        console.error('Failed to parse customer session', e);
        localStorage.removeItem('customer_session');
      }
    }
    setLoading(false);
  }, []);

  const login = (customerData) => {
    setCustomer(customerData);
    localStorage.setItem('customer_session', JSON.stringify(customerData));
  };

  const logout = () => {
    setCustomer(null);
    localStorage.removeItem('customer_session');
    // We'll handle navigation in the component or use window.location if needed, 
    // but usually state change triggers rerender in protected route.
    window.location.href = '/customer-portal';
  };

  return (
    <CustomerAuthContext.Provider value={{ customer, loading, login, logout }}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  return useContext(CustomerAuthContext);
};
