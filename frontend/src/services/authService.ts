import api from './api';
import type { User, AuthTokens } from '../types';

export const authService = {
  register: (email: string, password: string, full_name: string) =>
    api.post<User>('/auth/register', { email, password, full_name }),

  login: (email: string, password: string) => {
    const form = new FormData();
    form.append('username', email);
    form.append('password', password);
    return api.post<AuthTokens>('/auth/login', form);
  },

  refresh: (refresh_token: string) =>
    api.post<AuthTokens>('/auth/refresh', { refresh_token }),

  logout: (refresh_token: string) =>
    api.post('/auth/logout', { refresh_token }),

  getMe: () => api.get<User>('/auth/me'),

  getMyPermissions: () => api.get<Record<string, boolean>>('/auth/me/permissions'),

  updateMe: (data: { full_name?: string; avatar_url?: string }) =>
    api.put<User>('/auth/me', data),
};
