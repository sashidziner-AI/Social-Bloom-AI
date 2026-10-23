import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { companyService } from '../services/companyService';

export function useCompanies(params: { page?: number; per_page?: number } = {}) {
  return useQuery({
    queryKey: ['companies', params],
    queryFn: () => companyService.list(params).then((r) => r.data),
  });
}

export function useCompany(id: number | null) {
  return useQuery({
    queryKey: ['company', id],
    queryFn: () => companyService.get(id!).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: companyService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof companyService.update>[1] }) =>
      companyService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
}

export function useUploadLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      companyService.uploadLogo(id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: companyService.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
}

// Template hooks
export function useCompanyTemplates(companyId: number | null) {
  return useQuery({
    queryKey: ['company-templates', companyId],
    queryFn: () => companyService.listTemplates(companyId!).then((r) => r.data),
    enabled: !!companyId,
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: number; data: Parameters<typeof companyService.updateTemplate>[1] }) =>
      companyService.updateTemplate(templateId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company-templates'] }),
  });
}
