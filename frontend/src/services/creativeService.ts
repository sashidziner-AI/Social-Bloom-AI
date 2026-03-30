import api from './api';
import type { Creative } from '../types';

interface ListParams {
  content_request_id?: number;
  status?: string;
  creative_type?: string;
  page?: number;
  per_page?: number;
}

interface ListResponse {
  items: Creative[];
  total: number;
  page: number;
  per_page: number;
}

interface CreateData {
  content_request_id: number;
  creative_type: string;
  prompt?: string;
}

export const creativeService = {
  list: (params: ListParams = {}) =>
    api.get<ListResponse>('/creatives/', { params }),

  get: (id: number) =>
    api.get<Creative>(`/creatives/${id}`),

  create: (data: CreateData) =>
    api.post<Creative>('/creatives/', data),

  update: (id: number, data: { prompt?: string; notes?: string }) =>
    api.put<Creative>(`/creatives/${id}`, data),

  delete: (id: number) =>
    api.delete(`/creatives/${id}`),

  generate: (id: number) =>
    api.post<Creative>(`/creatives/${id}/generate`),

  upload: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<Creative>(`/creatives/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  updateStatus: (id: number, status: string) =>
    api.put<Creative>(`/creatives/${id}/status`, { status }),
};
