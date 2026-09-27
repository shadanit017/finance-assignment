import axios from 'axios';
import { HealthStatus } from '../types';

const rawApiUrl = import.meta.env.VITE_API_URL;
const API_BASE_URL = (rawApiUrl && !rawApiUrl.includes('backend:')) ? rawApiUrl : '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const healthApi = {
  checkAppHealth: async (): Promise<HealthStatus> => {
    const response = await apiClient.get<HealthStatus>('/health');
    return response.data;
  },
  checkDbHealth: async (): Promise<HealthStatus> => {
    const response = await apiClient.get<HealthStatus>('/health/database');
    return response.data;
  },
};

export const assistantApi = {
  ask: async (question: string) => {
    const response = await apiClient.post('/assistant/ask', { question });
    return response.data;
  },
  getHistory: async () => {
    const response = await apiClient.get('/assistant/history');
    return response.data;
  },
  clearHistory: async () => {
    const response = await apiClient.delete('/assistant/history');
    return response.data;
  },
};

export const usersApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },
  updateRole: async (userId: string, roleName: string) => {
    const response = await apiClient.patch(`/users/${userId}/role`, { roleName });
    return response.data;
  },
};

export const rolesApi = {
  getAll: async () => {
    const response = await apiClient.get('/roles');
    return response.data;
  },
};

export const authApi = {
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
  login: async (data: { email: string; password?: string }) => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },
  register: async (data: { email: string; name?: string; password?: string }) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },
};


