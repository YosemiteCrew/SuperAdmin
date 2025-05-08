import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/'; //import.meta.env.VITE_BASE_URL; // Your Express backend

// Axios interceptor to automatically include the JWT token in headers
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);


// Response Interceptor
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response && error.response.status === 401) {
      console.log('Unauthorized, logging out...');
       window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 1. GET request
export const getData = async (endpoint, param) => {
  try {
    const response = await axios.get(`${API_BASE_URL}${endpoint}`, param);
    return response;
  } catch (error) {
    console.error('GET error:', error.response?.data || error.message);
    throw error;
  }
};

// 2. POST request
export const postData = async (endpoint, data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}${endpoint}`, data);
    return response;
  } catch (error) {
    console.error('POST error:', error.response?.data || error.message);
    throw error;
  }
};

// 3. PUT request
export const putData = async (endpoint, data) => {
  try {
    const response = await axios.put(`${API_BASE_URL}${endpoint}`, data);
    return response;
  } catch (error) {
    console.error('PUT error:', error.response?.data || error.message);
    throw error;
  }
};

// 4. PATCH request
export const patchData = async (endpoint, data) => {
  try {
    const response = await axios.patch(`${API_BASE_URL}${endpoint}`, data);
    return response;
  } catch (error) {
    console.error('PATCH error:', error.response?.data || error.message);
    throw error;
  }
};

// 5. DELETE request
export const deleteData = async (endpoint) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}${endpoint}`);
    return response;
  } catch (error) {
    console.error('DELETE error:', error.response?.data || error.message);
    throw error;
  }
};
