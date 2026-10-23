import api from './api';
import type { Company, CompanyTemplate } from '../types';

interface CompanyListResponse {
  items: Company[];
  total: number;
  page: number;
  per_page: number;
}

export const companyService = {
  list: (params: { page?: number; per_page?: number } = {}) =>
    api.get<CompanyListResponse>('/companies/', { params }),

  get: (id: number) =>
    api.get<Company>(`/companies/${id}`),

  create: (data: { name: string; primary_color?: string; secondary_color?: string; font_family?: string }) =>
    api.post<Company>('/companies/', data),

  update: (id: number, data: { name?: string; primary_color?: string; secondary_color?: string; font_family?: string }) =>
    api.put<Company>(`/companies/${id}`, data),

  uploadLogo: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<Company>(`/companies/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  delete: (id: number) =>
    api.delete(`/companies/${id}`),

  // Templates
  listTemplates: (companyId: number) =>
    api.get<CompanyTemplate[]>(`/companies/${companyId}/templates`),

  getTemplate: (templateId: number) =>
    api.get<CompanyTemplate>(`/companies/templates/${templateId}`),

  updateTemplate: (templateId: number, data: Partial<Omit<CompanyTemplate, 'id' | 'company_id' | 'platform' | 'created_at' | 'updated_at'>>) =>
    api.put<CompanyTemplate>(`/companies/templates/${templateId}`, data),
};
