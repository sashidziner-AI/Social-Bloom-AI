import api from './api';
import type { PublishJob, PublishTarget, LinkedInOrganization } from '../types';

interface ListParams {
  platform?: string;
  status?: string;
  page?: number;
  per_page?: number;
}

interface ListResponse {
  items: PublishJob[];
  total: number;
  page: number;
  per_page: number;
}

interface CreateData {
  content_request_id: number;
  creative_id?: number;
  platform: string;
  scheduled_at?: string;
  publish_target?: PublishTarget;
  target_org_ids?: number[];
}

export const publishService = {
  list: (params: ListParams = {}) =>
    api.get<ListResponse>('/publish/', { params }),

  get: (id: number) =>
    api.get<PublishJob>(`/publish/${id}`),

  create: (data: CreateData) =>
    api.post<PublishJob>('/publish/', data),

  cancel: (id: number) =>
    api.put<PublishJob>(`/publish/${id}/cancel`),

  retry: (id: number) =>
    api.post<PublishJob>(`/publish/${id}/retry`),

  execute: (id: number) =>
    api.post<PublishJob>(`/publish/${id}/execute`),

  calendar: (start_date: string, end_date: string) =>
    api.get<PublishJob[]>('/publish/calendar', { params: { start_date, end_date } }),

  getLinkedInOrganizations: () =>
    api.get<{ items: LinkedInOrganization[]; missing_scopes: string[]; has_org_access: boolean }>('/publish/linkedin/organizations'),
};
