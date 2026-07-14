import { useQuery } from '@tanstack/react-query'
import { fetchAdminUniversityCampuses } from '@/lib/api'

/**
 * Resolves a picked institution (grouped university row) down to a specific campus row, for the
 * admin Courses/Intakes filters and create-forms — both need one exact campus public_id, since a
 * course/intake always belongs to a single campus row, never a whole institution.
 *
 * Single-campus institutions (the majority) skip the extra step entirely: `needsCampusStep` is
 * false and `effectiveCampusId` resolves straight to the institution's own id. Multi-campus
 * institutions require an explicit campus pick — `effectiveCampusId` stays empty until one is made.
 */
export function useCampusPicker(institutionPublicId: string) {
  const campusesQuery = useQuery({
    queryKey: ['admin', 'university-campuses', institutionPublicId],
    queryFn: () => fetchAdminUniversityCampuses(institutionPublicId),
    enabled: !!institutionPublicId,
    staleTime: 30_000,
  })

  const campuses = (campusesQuery.data ?? []) as any[]
  const needsCampusStep = campuses.length > 1

  function resolveEffectiveCampusId(campusPublicId: string): string {
    if (!institutionPublicId) return ''
    return needsCampusStep ? campusPublicId : institutionPublicId
  }

  return {
    campuses,
    needsCampusStep,
    isLoading: campusesQuery.isLoading,
    resolveEffectiveCampusId,
  }
}
