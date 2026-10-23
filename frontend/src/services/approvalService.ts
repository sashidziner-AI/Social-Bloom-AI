import api from './api';

interface Approval {
  id: number;
  entity_type: string;
  entity_id: number;
  approval_level: string;
  status: string;
  reviewer_id: number | null;
  comments: string | null;
  decided_at: string | null;
  created_at: string;
  history: ApprovalHistory[];
}

interface ApprovalHistory {
  id: number;
  approval_id: number;
  action: string;
  actor_id: number;
  actor_name: string | null;
  actor_role: string | null;
  comments: string | null;
  created_at: string;
}

interface ListParams {
  status?: string;
  level?: string;
  page?: number;
  per_page?: number;
}

interface ListResponse {
  items: Approval[];
  total: number;
  page: number;
  per_page: number;
}

export type { Approval, ApprovalHistory };

export const approvalService = {
  list: (params: ListParams = {}) =>
    api.get<ListResponse>('/approvals/', { params }),

  get: (id: number) =>
    api.get<Approval>(`/approvals/${id}`),

  getPending: (entityType: string, entityId: number) =>
    api.get<Approval | { id: null }>(`/approvals/pending/${entityType}/${entityId}`),

  submit: (entity_type: string, entity_id: number) =>
    api.post<Approval>('/approvals/', { entity_type, entity_id }),

  approve: (id: number, comments?: string) =>
    api.put<Approval>(`/approvals/${id}/approve`, { comments }),

  reject: (id: number, comments: string) =>
    api.put<Approval>(`/approvals/${id}/reject`, { comments }),

  requestRevision: (id: number, comments: string) =>
    api.put<Approval>(`/approvals/${id}/request-revision`, { comments }),

  getHistory: (entityType: string, entityId: number) =>
    api.get<ApprovalHistory[]>(`/approvals/history/${entityType}/${entityId}`),
};
