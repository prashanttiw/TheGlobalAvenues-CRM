import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export type NotificationStatus = 'all' | 'unread'

export type NotificationRecord = {
  public_id: string
  event_key: string
  category: string | null
  subject: string | null
  body: string | null
  read_at: string | null
  related_entity_type: string | null
  related_entity_id: number | null
  created_at: string
}

export type NotificationUnreadSummary = {
  count: number
  by_category: Record<string, number>
}

type NotificationListEnvelope = {
  data: NotificationRecord[]
  meta?: {
    total: number
    page: number
    per_page: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
}

type NotificationUnreadEnvelope = {
  data: NotificationUnreadSummary
}

const unreadCountQueryKey = ['notifications', 'unread-count'] as const
const notificationsListQueryKey = (category?: string, status: NotificationStatus = 'all') =>
  ['notifications', 'list', { category: category ?? '', status }] as const

function normalizeCategory(category?: string | null): string {
  return category && category.trim() !== '' ? category : 'general'
}

function decrementUnreadSummary(
  current: NotificationUnreadSummary | undefined,
  category: string | null | undefined,
): NotificationUnreadSummary | undefined {
  if (!current || current.count <= 0) {
    return current
  }

  const normalizedCategory = normalizeCategory(category)
  const byCategory = { ...current.by_category }
  const currentCategoryCount = byCategory[normalizedCategory] ?? 0

  if (currentCategoryCount <= 0) {
    return current
  }

  const nextCategoryCount = currentCategoryCount - 1
  if (nextCategoryCount > 0) {
    byCategory[normalizedCategory] = nextCategoryCount
  } else {
    delete byCategory[normalizedCategory]
  }

  return {
    count: Math.max(0, current.count - 1),
    by_category: byCategory,
  }
}

function clearUnreadSummary(
  current: NotificationUnreadSummary | undefined,
  category?: string,
): NotificationUnreadSummary | undefined {
  if (!current) {
    return current
  }

  if (!category) {
    return { count: 0, by_category: {} }
  }

  const normalizedCategory = normalizeCategory(category)
  const removedCount = current.by_category[normalizedCategory] ?? 0
  const byCategory = { ...current.by_category }
  delete byCategory[normalizedCategory]

  return {
    count: Math.max(0, current.count - removedCount),
    by_category: byCategory,
  }
}

export function useUnreadCount() {
  return useQuery({
    queryKey: unreadCountQueryKey,
    queryFn: () =>
      api
        .get<NotificationUnreadEnvelope>('/notifications/unread-count')
        .then((response) => response.data.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

export function useNotifications(category?: string, status: NotificationStatus = 'all', enabled = true) {
  return useQuery({
    queryKey: notificationsListQueryKey(category, status),
    queryFn: () =>
      api
        .get<NotificationListEnvelope>('/notifications/ping', {
          params: { category, status, per_page: 50 },
        })
        .then((response) => response.data.data),
    staleTime: 30_000,
    enabled,
  })
}

export function useMarkRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (publicId: string) => api.put(`/notifications/${publicId}/read`),
    onMutate: async (publicId: string) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] })

      const previousUnread = queryClient.getQueryData<NotificationUnreadSummary>(unreadCountQueryKey)
      const previousLists = queryClient.getQueriesData<NotificationRecord[]>({ queryKey: ['notifications', 'list'] })
      const optimisticReadAt = new Date().toISOString()
      let matchedCategory: string | null = null

      previousLists.forEach(([queryKey, notifications]) => {
        if (!notifications) {
          return
        }

        queryClient.setQueryData<NotificationRecord[]>(
          queryKey,
          notifications.map((notification) => {
            if (notification.public_id !== publicId || notification.read_at) {
              return notification
            }

            if (matchedCategory === null) {
              matchedCategory = notification.category
            }

            return {
              ...notification,
              read_at: optimisticReadAt,
            }
          }),
        )
      })

      if (matchedCategory !== null) {
        queryClient.setQueryData<NotificationUnreadSummary | undefined>(
          unreadCountQueryKey,
          (current) => decrementUnreadSummary(current, matchedCategory),
        )
      }

      return { previousUnread, previousLists }
    },
    onError: (_error, _publicId, context) => {
      context?.previousLists.forEach(([queryKey, notifications]) => {
        queryClient.setQueryData(queryKey, notifications)
      })
      queryClient.setQueryData(unreadCountQueryKey, context?.previousUnread)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: unreadCountQueryKey })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] })
    },
  })
}

export function useMarkReadAll() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (category?: string) => api.put('/notifications/read-all', category ? { category } : {}),
    onMutate: async (category?: string) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] })

      const previousUnread = queryClient.getQueryData<NotificationUnreadSummary>(unreadCountQueryKey)
      const previousLists = queryClient.getQueriesData<NotificationRecord[]>({ queryKey: ['notifications', 'list'] })
      const optimisticReadAt = new Date().toISOString()
      const normalizedCategory = category ? normalizeCategory(category) : null

      previousLists.forEach(([queryKey, notifications]) => {
        if (!notifications) {
          return
        }

        queryClient.setQueryData<NotificationRecord[]>(
          queryKey,
          notifications.map((notification) => {
            const matchesCategory = normalizedCategory === null || normalizeCategory(notification.category) === normalizedCategory
            if (!matchesCategory || notification.read_at) {
              return notification
            }

            return {
              ...notification,
              read_at: optimisticReadAt,
            }
          }),
        )
      })

      queryClient.setQueryData<NotificationUnreadSummary | undefined>(
        unreadCountQueryKey,
        (current) => clearUnreadSummary(current, category),
      )

      return { previousUnread, previousLists }
    },
    onError: (_error, _category, context) => {
      context?.previousLists.forEach(([queryKey, notifications]) => {
        queryClient.setQueryData(queryKey, notifications)
      })
      queryClient.setQueryData(unreadCountQueryKey, context?.previousUnread)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: unreadCountQueryKey })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] })
    },
  })
}
