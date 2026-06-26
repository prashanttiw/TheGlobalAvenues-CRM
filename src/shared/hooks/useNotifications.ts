import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get('/notifications/unread-count').then((r) => r.data.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useNotifications(category?: string, status: string = 'all') {
  return useQuery({
    queryKey: ['notifications', { category, status }],
    queryFn: () =>
      api
        .get('/notifications', { params: { category, status, limit: 50 } })
        .then((r) => r.data.data),
    staleTime: 30_000,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (publicId: string) => api.put(`/notifications/${publicId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkReadAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (category?: string) =>
      api.put('/notifications/read-all', category ? { category } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
