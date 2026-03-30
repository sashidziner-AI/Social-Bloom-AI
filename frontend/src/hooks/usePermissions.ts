import { useQuery } from '@tanstack/react-query';
import { authService } from '../services/authService';

export function useMyPermissions() {
  return useQuery({
    queryKey: ['my-permissions'],
    queryFn: () => authService.getMyPermissions().then((r) => r.data),
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });
}
