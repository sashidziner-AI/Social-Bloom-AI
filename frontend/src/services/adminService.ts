import api from './api';
import type { User } from '../types';

interface UserListResponse {
  items: User[];
  total: number;
  page: number;
  per_page: number;
}

interface AdminStats {
  total_users: number;
  total_content_requests: number;
  total_published: number;
  total_pending_approvals: number;
}

export interface PermissionEntry {
  key: string;
  name: string;
  role_default: boolean;
  granted: boolean;
  is_custom: boolean;
}

export interface PermissionGroup {
  category: string;
  permissions: PermissionEntry[];
}

export interface UserPermissionsResponse {
  user_id: number;
  role: string;
  groups: PermissionGroup[];
}

export type { AdminStats };

export interface RoleDefaultsResponse {
  defaults: Record<string, Record<string, boolean>>;
}

export const adminService = {
  listUsers: (params: { role?: string; page?: number; per_page?: number } = {}) =>
    api.get<UserListResponse>('/admin/users', { params }),

  updateUser: (id: number, data: { role?: string; is_active?: boolean }) =>
    api.put<User>(`/admin/users/${id}`, data),

  deactivateUser: (id: number) =>
    api.delete(`/admin/users/${id}`),

  getStats: () =>
    api.get<AdminStats>('/admin/stats'),

  getUserPermissions: (userId: number) =>
    api.get<UserPermissionsResponse>(`/admin/users/${userId}/permissions`),

  updateUserPermissions: (userId: number, permissions: Record<string, boolean>) =>
    api.put<UserPermissionsResponse>(`/admin/users/${userId}/permissions`, { permissions }),

  getRoleDefaults: () =>
    api.get<RoleDefaultsResponse>('/admin/permissions/role-defaults'),

  updateRoleDefaults: (role: string, permissions: Record<string, boolean>) =>
    api.put<RoleDefaultsResponse>('/admin/permissions/role-defaults', { role, permissions }),
};
