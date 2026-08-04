import axios from 'axios';
import { API_BASE } from '../config/apiConfig';

const AUTH_BASE_URLS = [API_BASE.BASE_URL, 'http://localhost:3040'];

const postToAuthService = async (path: string, payload: Record<string, unknown>) => {
  let lastError: unknown;

  for (const baseUrl of AUTH_BASE_URLS) {
    try {
      return await axios.post(`${baseUrl}${path}`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      lastError = error;
      const status = error?.response?.status;
      if (status !== 403 && status !== 401 && status !== 404) {
        throw error;
      }
    }
  }

  throw lastError;
};

export const loginApi = (username: string, password: string) => {
  console.log('===From authService: Attempting login for user:===', username);
  return postToAuthService('/auth/login', { username, password });
};

export const refreshTokenApi = (refreshToken: string) => {
  return postToAuthService('/auth/refresh', { refreshToken });
};