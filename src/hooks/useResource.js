import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { fetchPage } from '../lib/api';

/**
 * Generic paginated list query against a Page<T> endpoint.
 */
export function useListQuery(resource, params, options = {}) {
  return useQuery({
    queryKey: [resource, 'list', params],
    queryFn: () => fetchPage(`/${resource}`, params),
    keepPreviousData: true,
    ...options,
  });
}

/**
 * Generic non-paginated GET (e.g. dashboard summaries, matrices).
 */
export function useGetQuery(key, url, options = {}) {
  return useQuery({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: async () => (await api.get(url)).data,
    ...options,
  });
}

/**
 * CRUD mutations for a resource, invalidating its list queries on success.
 * Delete performs the API's logical delete (archivage) per contract §1.
 */
export function useCrudMutations(resource) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [resource] });

  const create = useMutation({
    mutationFn: (payload) => api.post(`/${resource}`, payload).then((r) => r.data),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, ...payload }) => api.put(`/${resource}/${id}`, payload).then((r) => r.data),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/${resource}/${id}`).then((r) => r.data),
    onSuccess: invalidate,
  });

  return { create, update, remove, invalidate };
}
