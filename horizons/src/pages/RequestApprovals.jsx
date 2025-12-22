import React from 'react';
import { Navigate } from 'react-router-dom';

const RequestApprovalsPage = () => {
  // This page is now replaced by Operations.jsx
  // Redirecting to the new consolidated page.
  return <Navigate to="/operations" replace />;
};

export default RequestApprovalsPage;