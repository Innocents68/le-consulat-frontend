import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { can, canView } from '../lib/permissions';

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const { data: matrix } = useQuery({
    queryKey: ['droits-matrice'],
    queryFn: async () => {
      const { data } = await api.get('/droits/matrice');
      return data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: !!user,
  });

  return {
    matrix,
    role: user?.role,
    canView: (moduleKey) => canView(matrix, user?.role, moduleKey),
    can: (moduleKey, action) => can(matrix, user?.role, moduleKey, action),
  };
}
