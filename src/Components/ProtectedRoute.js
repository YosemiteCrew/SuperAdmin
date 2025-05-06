import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../services/authService'; // Make sure to import your authService for token checking

const ProtectedRoute = ({ children }) => {
  const location = useLocation();

  // Check if the user is authenticated by checking the token
  const token = authService.getToken(); // Get token from localStorage or sessionStorage

  if (!token) {
    // If no token, redirect the user to the login page, preserving the current location
    return <Navigate to="/login" state={{ from: location }} />;
  }

  // If the user is authenticated, render the requested route (children)
  return children;
};

export default ProtectedRoute;
