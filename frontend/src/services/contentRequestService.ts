import api from './api';
import type { ContentRequest } from '../types';

interface ListParams {
  status?: string;
  platform?: string;
  page?: number;
  per_page?: number;
}

interface ListResponse {
  items: ContentRequest[];
  total: number;
  page: number;
  per_page: number;
}

interface CreateData {
  title: string;
  platform: string;
  tone: string;
  target_audience?: string;
  topic: string;
  keywords?: string[];
  company_id?: number;
}

interface UpdateData {
  title?: string;
  platform?: string;
  tone?: string;
  target_audience?: string;
  topic?: string;
  keywords?: string[];
  generated_caption?: string;
  generated_description?: string;
  generated_hashtags?: string[];
}

export const contentRequestService = {
  list: (params: ListParams = {}) =>
    api.get<ListResponse>('/content-requests/', { params }),

  get: (id: number) =>
    api.get<ContentRequest>(`/content-requests/${id}`),

  create: (data: CreateData) =>
    api.post<ContentRequest>('/content-requests/', data),

  update: (id: number, data: UpdateData) =>
    api.put<ContentRequest>(`/content-requests/${id}`, data),

  delete: (id: number) =>
    api.delete(`/content-requests/${id}`),

  generate: (id: number) =>
    api.post<ContentRequest>(`/content-requests/${id}/generate`),

  regenerate: (id: number) =>
    api.post<ContentRequest>(`/content-requests/${id}/regenerate`),

  updateStatus: (id: number, status: string) =>
    api.put<ContentRequest>(`/content-requests/${id}/status`, { status }),

  confirm: (id: number) =>
    api.put<ContentRequest>(`/content-requests/${id}/confirm`),
};
