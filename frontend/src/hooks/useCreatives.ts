import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { creativeService } from '../services/creativeService';

export function useCreatives(params: {
  content_request_id?: number;
  status?: string;
  creative_type?: string;
  page?: number;
} = {}) {
  return useQuery({
    queryKey: ['creatives', params],
    queryFn: () => creativeService.list(params).then((r) => r.data),
  });
}

export function useCreative(id: number) {
  return useQuery({
    queryKey: ['creative', id],
    queryFn: () => creativeService.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateCreative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: creativeService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['creatives'] }),
  });
}

export function useGenerateCreative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: creativeService.generate,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['creative', id] });
      qc.invalidateQueries({ queryKey: ['creatives'] });
    },
  });
}

export function useUploadCreative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      creativeService.upload(id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['creatives'] }),
  });
}
