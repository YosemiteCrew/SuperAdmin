import axios from 'axios';
import { config } from '@/app/config';

export const httpClient = axios.create({
  baseURL: config.api.baseUrl,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // TODO: handle 401 → redirect to sign-in, handle 403, log errors
    return Promise.reject(error);
  }
);
