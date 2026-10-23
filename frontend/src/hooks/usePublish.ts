import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { publishService } from '../services/publishService';

export function usePublishJobs(params: {
  platform?: string;
  status?: string;
  page?: number;
} = {}) {
  return useQuery({
    queryKey: ['publish-jobs', params],
    queryFn: () => publishService.list(params).then((r) => r.data),
  });
}

export function usePublishJob(id: number) {
  return useQuery({
    queryKey: ['publish-job', id],
    queryFn: () => publishService.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreatePublishJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: publishService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['publish-jobs'] }),
  });
}

export function useExecutePublishJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: publishService.execute,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['publish-jobs'] }),
  });
}

export function useCancelPublishJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: publishService.cancel,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['publish-jobs'] }),
  });
}

export function useRetryPublishJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: publishService.retry,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['publish-jobs'] }),
  });
}

export function usePublishCalendar(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['publish-calendar', startDate, endDate],
    queryFn: () => publishService.calendar(startDate, endDate).then((r) => r.data),
    enabled: !!startDate && !!endDate,
  });
}

export function useLinkedInOrganizations() {
  return useQuery({
    queryKey: ['linkedin-organizations'],
    queryFn: () => publishService.getLinkedInOrganizations().then((r) => r.data),
  });
}
