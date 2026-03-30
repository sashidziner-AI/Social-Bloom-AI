import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contentRequestService } from '../services/contentRequestService';

export function useContentRequests(params: {
  status?: string;
  platform?: string;
  page?: number;
  per_page?: number;
} = {}) {
  return useQuery({
    queryKey: ['content-requests', params],
    queryFn: () => contentRequestService.list(params).then((r) => r.data),
  });
}

export function useContentRequest(id: number) {
  return useQuery({
    queryKey: ['content-request', id],
    queryFn: () => contentRequestService.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateContentRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: contentRequestService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content-requests'] }),
  });
}

export function useUpdateContentRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      contentRequestService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content-requests'] }),
  });
}

export function useDeleteContentRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: contentRequestService.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content-requests'] }),
  });
}

export function useGenerateContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: contentRequestService.generate,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['content-request', id] });
      qc.invalidateQueries({ queryKey: ['content-requests'] });
    },
  });
}

export function useUpdateContentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      contentRequestService.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-requests'] });
      qc.invalidateQueries({ queryKey: ['content-request'] });
    },
  });
}

export function useConfirmContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contentRequestService.confirm(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['content-request', id] });
      qc.invalidateQueries({ queryKey: ['content-requests'] });
    },
  });
}

export function useSubmitForApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entityType, entityId }: { entityType: string; entityId: number }) =>
      import('../services/approvalService').then((m) =>
        m.approvalService.submit(entityType, entityId)
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-requests'] });
      qc.invalidateQueries({ queryKey: ['content-request'] });
      qc.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}
