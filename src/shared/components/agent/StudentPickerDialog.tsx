import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, UserPlus, ChevronRight } from 'lucide-react'
import { SlideOverPanel, SlideOverBody, SlideOverFooter } from '../ui/SlideOverPanel'
import { StatusBadge, type StatusType } from '../ui/Badge'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { fetchAgentStudents } from '../../../lib/api'

function mapStatusToBadge(status: string): StatusType {
  switch (status) {
    case 'registered': return 'pending'
    case 'enrolled': return 'approved'
    case 'rejected': return 'rejected'
    default: return 'pending'
  }
}

interface StudentPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectExisting: (studentPid: string) => void
  onSelectNew: () => void
}

export function StudentPickerDialog({ open, onOpenChange, onSelectExisting, onSelectNew }: StudentPickerDialogProps) {
  const [search, setSearch] = React.useState('')

  const studentsQuery = useQuery({
    queryKey: ['agent', 'students', 'picker', search],
    queryFn: () => fetchAgentStudents({ search: search || undefined, perPage: 50 }),
    enabled: open,
  })

  const students = studentsQuery.data?.students ?? []

  return (
    <SlideOverPanel title="Apply for a Student" open={open} onOpenChange={onOpenChange}>
      <div className="flex h-full flex-col">
        <SlideOverBody className="space-y-4">
          <button
            type="button"
            onClick={onSelectNew}
            className="flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-brand-orange-accessible/40 bg-brand-orange-accessible/5 px-4 py-3 text-left transition-colors hover:border-brand-orange-accessible hover:bg-brand-orange-accessible/10"
          >
            <UserPlus className="h-5 w-5 shrink-0 text-brand-orange-accessible" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-brand-navy">New Student</p>
              <p className="text-xs text-muted-foreground">Create a profile for a student who isn't in the system yet.</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full rounded-md border border-border-warm bg-surface-warm px-3.5 py-2.5 pl-9 text-sm text-brand-navy focus:outline-none"
              placeholder="Search your students by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {studentsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading students…</p>
          ) : students.length === 0 ? (
            <EmptyState icon={Search} heading="No students found" description="Try a different search, or create a new student instead." />
          ) : (
            <div className="space-y-2">
              {students.map((student: any) => (
                <button
                  key={student.public_id}
                  type="button"
                  onClick={() => onSelectExisting(student.public_id)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-border-warm bg-surface-card px-4 py-3 text-left transition-colors hover:border-brand-orange-accessible"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-brand-navy">{student.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{student.nationality || 'Nationality not set'}</p>
                  </div>
                  <StatusBadge status={mapStatusToBadge(student.profile_status)} />
                </button>
              ))}
            </div>
          )}
        </SlideOverBody>
        <SlideOverFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
        </SlideOverFooter>
      </div>
    </SlideOverPanel>
  )
}
