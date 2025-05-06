import axios from 'axios';

const API_URL = 'http://localhost:8000/fhir/v1/auth'; // Your Express backend

// Login user
export const login = async (email, password) => {
  const response = await axios.post(`${API_URL}/login`, { email, password });
  return response;
};

// Signup user (optional)
export const signup = async (email, password) => {
  const response = await axios.post(`${API_URL}/signup`, { email, password });
  return response;
};

// Save the token to localStorage
export const saveToken = (token) => {
  localStorage.setItem('token', token);
};

// Retrieve the token from localStorage
export const getToken = () => {
  return localStorage.getItem('token');
};

// Remove the token from localStorage
export const removeToken = () => {
  localStorage.removeItem('token');
};

const logout = () => {
  // Remove the token from localStorage or sessionStorage
  localStorage.removeItem('token'); // or sessionStorage.removeItem('token');
};




// Export all the functions together as the default export
const authService = {
  login,
  logout,
  signup,
  saveToken,
  getToken,
  removeToken,
};

export default authService;

// Add more functions as needed, like logout, refreshToken, etc.
