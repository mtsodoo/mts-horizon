import React from 'react';
import { Navigate } from 'react-router-dom';

const LeavesPage = () => {
  // This page is now part of MyRequests.jsx
  // Redirecting to the new consolidated page.
  return <Navigate to="/my-requests" replace />;
};

export default LeavesPage;