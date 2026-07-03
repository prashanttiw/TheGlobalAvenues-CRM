import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

// Named distinctly from api.ts's PaginationMeta (which uses current_page/has_next/has_prev) --
// this shape matches what the new flat admin/universities, admin/courses, admin/intakes
// endpoints actually return (page/per_page/total/total_pages).
export interface SimplePaginationMeta {
  page: number
  per_page: number
  total: number
  total_pages: number
}

interface PaginationProps {
  meta: SimplePaginationMeta | undefined
  onPageChange: (page: number) => void
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  if (!meta || meta.total_pages <= 1) return null

  return (
    <div className="flex items-center justify-between px-1 py-2">
      <p className="text-xs text-muted-foreground">
        {meta.total} total &middot; page {meta.page} of {meta.total_pages}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Prev
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={meta.page >= meta.total_pages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
