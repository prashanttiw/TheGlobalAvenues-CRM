import * as React from 'react'
import { cn } from '../../../lib/utils'
import { SkeletonTableRow } from './SkeletonLoader'
import { EmptyState } from './EmptyState'
import { Inbox } from 'lucide-react'

export interface ColumnDef<T> {
  key: string
  header: string
  cell: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  isLoading?: boolean
  onRowClick?: (row: T) => void
  emptyMessage?: string
}

export function DataTable<T>({ columns, data, isLoading, onRowClick, emptyMessage = "No data available." }: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full overflow-hidden rounded-card border border-border-warm bg-surface-card shadow-card">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonTableRow key={i} columns={columns.length} />
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        heading="No records found"
        description={emptyMessage}
        className="my-4"
      />
    )
  }

  return (
    <div className="w-full overflow-hidden rounded-card border border-border-warm bg-surface-card shadow-card">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="border-b border-border-warm bg-surface-warm/80 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={cn("px-4 py-3.5 whitespace-nowrap", col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-warm">
            {data.map((row, i) => (
              <tr 
                key={i}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "transition-colors",
                  onRowClick ? "cursor-pointer hover:bg-brand-orange-accessible/5" : "",
                  i % 2 === 0 ? "bg-surface-card" : "bg-surface-warm/25"
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3.5 align-middle", col.className)}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden flex flex-col divide-y divide-border-warm">
        {data.map((row, i) => (
          <div 
            key={i} 
            className={cn("flex flex-col gap-3 p-4 transition-colors", onRowClick ? "cursor-pointer hover:bg-brand-orange-accessible/5" : "")}
            onClick={() => onRowClick?.(row)}
          >
            {columns.map((col, idx) => (
              <div key={col.key} className="flex justify-between items-start gap-4">
                <span className="mt-0.5 text-xs font-semibold uppercase text-muted-foreground">{col.header}</span>
                <div className={cn("text-right text-sm font-medium text-brand-navy break-words", col.className)}>
                  {col.cell(row)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
