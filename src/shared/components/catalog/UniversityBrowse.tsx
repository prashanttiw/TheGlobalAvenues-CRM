import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Calendar, ChevronRight, Globe, GraduationCap, MapPin, Search, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { SearchInput } from '../ui/SearchInput'
import { SkeletonCard } from '../ui/SkeletonLoader'
import { EmptyState } from '../ui/EmptyState'
import { UniversityLogo } from './UniversityLogo'
import { useUrlFilters } from '../../hooks/useUrlFilters'
import { ClearFiltersButton } from '../ui/ClearFiltersButton'
import {
  createApplication,
  fetchProgramIntakes,
  fetchUniversities,
  fetchUniversityCampuses,
  fetchUniversityDetail,
  type CatalogCampus,
  type CatalogUniversity,
  type UniversityDetailCourse,
} from '../../../lib/api'

interface UniversityBrowseProps {
  /**
   * student-apply: student applies to their own account, always allowed — the draft is
   *   created immediately and either auto-submits or redirects to finish the profile.
   * agent-apply: clicking Apply hands off to onApplyForStudent() instead of calling the
   *   API directly, so the parent page can show a student picker first.
   * readonly: browse only, no apply action.
   */
  mode: 'student-apply' | 'agent-apply' | 'readonly'
  onApplyForStudent?: (intake: any, course: UniversityDetailCourse, university: CatalogUniversity) => void
}

const PER_PAGE = 24

function formatMonth(month: number) {
  return new Date(2000, month - 1, 1).toLocaleString('en-US', { month: 'long' })
}

// intakes.status is one of 'upcoming' | 'open' | 'closed' (migration 016). The Apply button used to
// label every non-open intake "Closed", even ones still 'upcoming' — cosmetic but misleading next to
// the badge above it, which already shows the real status correctly.
function intakeClosedLabel(status: string) {
  return status === 'upcoming' ? 'Upcoming' : 'Closed'
}

function Breadcrumb({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <div className="flex items-center flex-wrap gap-1 text-sm">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          {item.onClick ? (
            <button type="button" onClick={item.onClick} className="text-brand-navy font-medium hover:text-brand-orange-accessible">
              {item.label}
            </button>
          ) : (
            <span className="font-semibold text-brand-navy">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

function campusToCatalogUniversity(campus: CatalogCampus): CatalogUniversity {
  return {
    id: campus.public_id,
    public_id: campus.public_id,
    name: campus.name,
    shortName: null,
    country: campus.country,
    city: campus.city,
    partnershipType: 'non_exclusive',
    isExclusive: false,
    programCount: campus.programCount,
    campusCount: 1,
    startingTuition: null,
    startingTuitionCurrency: null,
    startingTuitionLabel: null,
    logoUrl: campus.logoUrl,
    logoThumbUrl: campus.logoThumbUrl,
  }
}

export function UniversityBrowse({ mode, onApplyForStudent }: UniversityBrowseProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { filters, setFilters, clearFilters, hasActiveFilters } = useUrlFilters({
    search: '', country: '', page: '1',
  })
  const search = filters.search
  const country = filters.country
  const page = Number(filters.page) || 1
  const setSearch = (v: string) => setFilters({ search: v, page: '1' })
  const setCountry = (v: string) => setFilters({ country: v, page: '1' })
  const setPage = (updater: number | ((p: number) => number)) => {
    const next = typeof updater === 'function' ? (updater as (p: number) => number)(page) : updater
    setFilters({ page: String(next) })
  }
  // selectedGroup: the institution card chosen from the main list (university -> campus step).
  // selectedCampus: the specific campus row chosen from the campus picker (campus -> course step).
  const [selectedGroup, setSelectedGroup] = React.useState<CatalogUniversity | null>(null)
  const [selectedCampus, setSelectedCampus] = React.useState<CatalogUniversity | null>(null)
  const [selectedCourse, setSelectedCourse] = React.useState<UniversityDetailCourse | null>(null)
  const [applyingIntakeId, setApplyingIntakeId] = React.useState<string | null>(null)

  // Deep-link support: global search opens a specific campus via ?open=<pid>, jumping straight to
  // its course list — same as before, just skipping the group card and campus-picker steps rather
  // than skipping a single list step. Uses a minimal stub — the real name/city/country/logo
  // backfill in once detailQuery resolves.
  React.useEffect(() => {
    const openId = searchParams.get('open')
    if (openId && !selectedCampus) {
      setSelectedCampus({
        id: openId, public_id: openId, name: '', shortName: null, country: '', city: null,
        partnershipType: 'non_exclusive', isExclusive: false, programCount: 0, campusCount: 1,
        startingTuition: null, startingTuitionCurrency: null, startingTuitionLabel: null,
        logoUrl: null, logoThumbUrl: null,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const countryListQuery = useQuery({
    queryKey: ['catalog', 'universities', 'countries'],
    queryFn: () => fetchUniversities({ perPage: 200 }),
    staleTime: 5 * 60_000,
  })

  const countryOptions = React.useMemo(() => {
    const countries = (countryListQuery.data?.universities ?? [])
      .map((u) => u.country)
      .filter((value): value is string => !!value)
    return Array.from(new Set(countries)).sort((a, b) => a.localeCompare(b))
  }, [countryListQuery.data])

  const universitiesQuery = useQuery({
    queryKey: ['catalog', 'universities', search, country, page],
    queryFn: () => fetchUniversities({ perPage: PER_PAGE, page, q: search || undefined, country: country || undefined }),
    staleTime: 60_000,
  })

  // Campus picker: every campus belonging to the selected institution.
  const campusesQuery = useQuery({
    queryKey: ['catalog', 'university-campuses', selectedGroup?.public_id],
    queryFn: () => fetchUniversityCampuses(selectedGroup!.public_id),
    enabled: !!selectedGroup && !selectedCampus,
  })

  const detailQuery = useQuery({
    queryKey: ['catalog', 'university-detail', selectedCampus?.public_id],
    queryFn: () => fetchUniversityDetail(selectedCampus!.public_id),
    enabled: !!selectedCampus,
  })

  // Backfill the deep-link stub's display fields once the real record loads.
  React.useEffect(() => {
    if (detailQuery.data && selectedCampus && !selectedCampus.name) {
      setSelectedCampus((prev) => prev ? {
        ...prev,
        name: detailQuery.data.name ?? prev.name,
        city: detailQuery.data.city ?? prev.city,
        country: detailQuery.data.country ?? prev.country,
        logoUrl: detailQuery.data.logo_url ?? prev.logoUrl,
        logoThumbUrl: detailQuery.data.logo_thumb_url ?? prev.logoThumbUrl,
        isExclusive: detailQuery.data.partnership_type === 'exclusive',
      } : prev)
    }
  }, [detailQuery.data, selectedCampus])

  const intakesQuery = useQuery({
    queryKey: ['catalog', 'course-intakes', selectedCourse?.public_id],
    queryFn: () => fetchProgramIntakes(selectedCourse!.public_id),
    enabled: !!selectedCourse,
  })

  async function handleApply(intake: any) {
    if (!selectedCourse) return

    try {
      setApplyingIntakeId(intake.public_id)
      const { application, autoSubmitted } = await createApplication({
        programId: selectedCourse.public_id,
        intakeId: intake.public_id,
      })
      if (autoSubmitted) {
        toast.success(`Application submitted for ${selectedCourse.name} — ${intake.name}.`)
      } else {
        toast.success('Application started — finish your profile to submit it.')
        navigate(`/portal/student/applications/${application.public_id}/complete`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create application.')
    } finally {
      setApplyingIntakeId(null)
    }
  }

  function handleAgentApply(intake: any) {
    if (!selectedCourse || !selectedCampus) return
    onApplyForStudent?.(intake, selectedCourse, selectedCampus)
  }

  function backToList() {
    setSelectedGroup(null)
    setSelectedCampus(null)
    setSelectedCourse(null)
    if (searchParams.has('open')) {
      const next = new URLSearchParams(searchParams)
      next.delete('open')
      setSearchParams(next, { replace: true })
    }
  }

  function backToCampuses() {
    setSelectedCampus(null)
    setSelectedCourse(null)
  }

  function selectCampus(campus: CatalogCampus) {
    setSelectedCourse(null)
    setSelectedCampus(campusToCatalogUniversity(campus))
  }

  // Course intake view
  if (selectedCourse && selectedCampus) {
    const intakes = intakesQuery.data ?? []
    const campusLabel = selectedGroup && selectedGroup.public_id !== selectedCampus.public_id
      ? (selectedCampus.city ? `${selectedCampus.city} Campus` : selectedCampus.name)
      : null
    return (
      <div className="space-y-4">
        <Breadcrumb
          items={[
            { label: 'Universities', onClick: backToList },
            ...(selectedGroup ? [{ label: selectedGroup.name, onClick: backToCampuses }] : []),
            ...(campusLabel ? [{ label: campusLabel, onClick: () => setSelectedCourse(null) }] : [{ label: selectedCampus.name, onClick: () => setSelectedCourse(null) }]),
            { label: selectedCourse.name },
          ]}
        />
        <div>
          <h3 className="text-lg font-semibold text-brand-navy">{selectedCourse.name}</h3>
          <p className="text-sm text-muted-foreground">
            {selectedCourse.degree_level} · {selectedCourse.duration_months ? `${selectedCourse.duration_months} months` : 'Duration TBD'} · {selectedCourse.language || 'English'}
          </p>
        </div>

        {intakesQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : intakes.length === 0 ? (
          <EmptyState icon={Calendar} heading="No open intakes" description="No intakes are currently scheduled for this program. Check back soon." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {intakes.map((intake: any) => (
              <Card key={intake.public_id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{intake.name}</CardTitle>
                    <Badge variant={intake.status === 'open' ? 'secondary' : 'outline'}>{intake.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Starts {formatMonth(intake.intake_month)} {intake.intake_year}
                  </p>
                  {intake.application_deadline && (
                    <p className="text-xs text-muted-foreground">Apply by {new Date(intake.application_deadline).toLocaleDateString()}</p>
                  )}
                  {intake.tuition_fee_amount && (
                    <p className="font-semibold text-brand-navy">{intake.tuition_fee_currency} {intake.tuition_fee_amount}</p>
                  )}
                  {mode === 'student-apply' && (
                    <Button
                      className="w-full mt-2"
                      disabled={intake.status !== 'open' || applyingIntakeId === intake.public_id}
                      onClick={() => handleApply(intake)}
                    >
                      {applyingIntakeId === intake.public_id ? 'Applying…' : intake.status !== 'open' ? intakeClosedLabel(intake.status) : 'Apply'}
                    </Button>
                  )}
                  {mode === 'agent-apply' && (
                    <Button
                      className="w-full mt-2"
                      disabled={intake.status !== 'open'}
                      onClick={() => handleAgentApply(intake)}
                    >
                      {intake.status !== 'open' ? intakeClosedLabel(intake.status) : 'Apply for Student'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Campus detail (course list) view
  if (selectedCampus) {
    const courses = detailQuery.data?.courses ?? []

    return (
      <div className="space-y-4">
        <Breadcrumb
          items={[
            { label: 'Universities', onClick: backToList },
            ...(selectedGroup ? [{ label: selectedGroup.name, onClick: backToCampuses }] : []),
            { label: selectedCampus.name },
          ]}
        />
        <div className="flex items-center gap-4">
          <UniversityLogo name={selectedCampus.name} logoThumbUrl={selectedCampus.logoThumbUrl} logoUrl={selectedCampus.logoUrl} size="xl" />
          <div>
            <h2 className="text-xl font-semibold text-brand-navy flex items-center gap-2">
              {selectedCampus.name}
              {mode === 'readonly' && selectedCampus.isExclusive && (
                <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3" />Exclusive Partner</Badge>
              )}
            </h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{selectedCampus.city ? `${selectedCampus.city}, ` : ''}{selectedCampus.country}</p>
          </div>
        </div>

        {detailQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : courses.length === 0 ? (
          <EmptyState icon={GraduationCap} heading="No programs yet" description="No active programs are listed for this campus yet. Check back soon." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course: UniversityDetailCourse) => (
              <Card key={course.public_id} className="cursor-pointer hover:shadow-card-hover transition-shadow" onClick={() => setSelectedCourse(course)}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{course.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p className="flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" />{course.degree_level}</p>
                  <p>{course.duration_months ? `${course.duration_months} months` : 'Duration TBD'}</p>
                  <p className="text-brand-orange-accessible font-semibold text-xs">{course.open_intake_count} open intake{course.open_intake_count === 1 ? '' : 's'}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Campus picker view
  if (selectedGroup) {
    const campuses = campusesQuery.data ?? []

    return (
      <div className="space-y-4">
        <Breadcrumb
          items={[
            { label: 'Universities', onClick: backToList },
            { label: selectedGroup.name },
          ]}
        />
        <div className="flex items-center gap-4">
          <UniversityLogo name={selectedGroup.name} logoThumbUrl={selectedGroup.logoThumbUrl} logoUrl={selectedGroup.logoUrl} size="xl" />
          <div>
            <h2 className="text-xl font-semibold text-brand-navy flex items-center gap-2">
              {selectedGroup.name}
              {mode === 'readonly' && selectedGroup.isExclusive && (
                <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3" />Exclusive Partner</Badge>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">Choose a campus to see its programs.</p>
          </div>
        </div>

        {campusesQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : campuses.length === 0 ? (
          <EmptyState icon={MapPin} heading="No campuses found" description="This institution has no active campuses right now. Check back soon." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campuses.map((campus) => (
              <Card key={campus.public_id} className="cursor-pointer hover:shadow-card-hover transition-shadow" onClick={() => selectCampus(campus)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-2">
                    <UniversityLogo name={campus.name} logoThumbUrl={campus.logoThumbUrl} logoUrl={campus.logoUrl} size="md" />
                  </div>
                  <CardTitle className="text-base mt-3 leading-tight flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-brand-orange-accessible shrink-0" />
                    {campus.city || 'Unknown city'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{campus.country}</span>
                  <span className="font-semibold text-brand-navy">{campus.programCount} programs</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // University list view
  const universities = universitiesQuery.data?.universities ?? []
  const meta = universitiesQuery.data?.meta
  const totalPages = meta ? Math.max(1, Number(meta.total_pages ?? 1)) : 1

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search universities by name or country…" className="max-w-sm" />
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="h-10 w-full sm:w-52 rounded-button border border-border-warm bg-surface-card px-3 text-sm text-brand-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All countries</option>
          {countryOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {hasActiveFilters && <ClearFiltersButton className="" onClick={clearFilters} />}
      </div>

      {universitiesQuery.isError ? (
        <EmptyState icon={Globe} heading="Couldn't load universities" description="Something went wrong while loading the catalog. Please try again." />
      ) : universitiesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : universities.length === 0 ? (
        <EmptyState icon={Search} heading="No universities match" description="Try a different search term or clear the country filter." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {universities.map((university) => (
              <Card key={university.public_id} className="cursor-pointer hover:shadow-card-hover transition-shadow" onClick={() => setSelectedGroup(university)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <UniversityLogo name={university.name} logoThumbUrl={university.logoThumbUrl} logoUrl={university.logoUrl} size="md" />
                    {mode === 'readonly' && university.isExclusive && (
                      <Badge variant="secondary" className="gap-1 shrink-0"><ShieldCheck className="h-3 w-3" />Exclusive</Badge>
                    )}
                  </div>
                  <CardTitle className="text-base mt-3 leading-tight">{university.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" />{university.country}
                  </span>
                  <span className="font-semibold text-brand-navy">{university.programCount} programs</span>
                </CardContent>
              </Card>
            ))}
          </div>

          {meta && totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted-foreground">
                Page {meta.page} of {totalPages} (Total: {meta.total})
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
