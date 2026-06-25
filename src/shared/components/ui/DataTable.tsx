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
      <div className="w-full rounded-card border border-border-warm bg-surface-card overflow-hidden">
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
    <div className="w-full rounded-card border border-border-warm bg-surface-card overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface-warm text-brand-navy font-semibold text-xs uppercase tracking-wider border-b border-border-warm">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={cn("px-4 py-3 whitespace-nowrap", col.className)}>
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
                  i % 2 === 0 ? "bg-white" : "bg-surface-warm/30"
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3", col.className)}>
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
            className={cn("p-4 flex flex-col gap-2", onRowClick ? "cursor-pointer hover:bg-surface-warm" : "")}
            onClick={() => onRowClick?.(row)}
          >
            {columns.map((col, idx) => (
              <div key={col.key} className="flex justify-between items-start gap-4">
                <span className="text-xs font-semibold text-muted-foreground uppercase mt-0.5">{col.header}</span>
                <div className={cn("text-sm text-right font-medium text-brand-navy break-all", col.className)}>
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
