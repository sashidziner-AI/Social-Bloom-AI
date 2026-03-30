import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalService } from '../services/approvalService';

export function useApprovals(params: {
  status?: string;
  level?: string;
  page?: number;
} = {}) {
  return useQuery({
    queryKey: ['approvals', params],
    queryFn: () => approvalService.list(params).then((r) => r.data),
  });
}

export function useApproval(id: number) {
  return useQuery({
    queryKey: ['approval', id],
    queryFn: () => approvalService.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useApproveItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comments }: { id: number; comments?: string }) =>
      approvalService.approve(id, comments),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });
}

export function useRejectItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comments }: { id: number; comments: string }) =>
      approvalService.reject(id, comments),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });
}

export function useRequestRevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comments }: { id: number; comments: string }) =>
      approvalService.requestRevision(id, comments),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });
}
