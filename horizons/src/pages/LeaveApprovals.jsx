import React from 'react';
import { Navigate } from 'react-router-dom';

const LeaveApprovalsPage = () => {
  // This page is now part of EmployeeRequests.jsx
  // Redirecting to the new consolidated page.
  return <Navigate to="/employee-requests" replace />;
};

export default LeaveApprovalsPage;