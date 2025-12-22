import React from 'react';
import { Navigate } from 'react-router-dom';

const EmployeeRequestsPage = () => {
  // This page is now RequestApprovals.jsx
  // Redirecting to the new consolidated page.
  return <Navigate to="/request-approvals" replace />;
};

export default EmployeeRequestsPage;