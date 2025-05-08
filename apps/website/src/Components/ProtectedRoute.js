import React, {useEffect} from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import authService from '../services/authService'; // Make sure to import your authService for token checking

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // You can conditionally check the user's auth status here
    const isAuthenticated = authService.getToken(); 

    if (!isAuthenticated) {
      // Redirect to login page if not authenticated
      navigate('/signin');
    }
  }, [navigate]);

  // If the user is authenticated, render the requested route (children)
  return children;
};

export default ProtectedRoute;
