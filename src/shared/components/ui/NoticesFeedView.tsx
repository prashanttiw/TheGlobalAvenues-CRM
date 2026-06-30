import * as React from 'react'
import { Calendar, Download, FileText, MapPin } from 'lucide-react'

export interface NoticeFeedItem {
  public_id: string
  title: string
  content: string
  notice_type: 'notice' | 'event'
  published_at?: string | null
  created_at: string
  event_date?: string | null
  event_location?: string | null
  attachment_public_id?: string | null
  attachment_filename?: string | null
}

interface Props {
  notices: NoticeFeedItem[]
  isLoading: boolean
  viewMode: 'grid' | 'table'
  apiBase: string
}

function formatDate(value?: string | null): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatEventDateTime(value?: string | null): string {
  if (!value) return ''
  return new Date(value).toLocaleString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function TypeBadge({ type }: { type: NoticeFeedItem['notice_type'] }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
      type === 'event' ? 'bg-amber-100 text-amber-700' : 'bg-brand-orange-accessible/10 text-brand-orange-accessible'
    }`}>
      {type === 'event' ? '📅 Event' : '📢 Notice'}
    </span>
  )
}

function AttachmentLink({ publicId, filename, apiBase }: { publicId: string; filename: string; apiBase: string }) {
  return (
    <a
      href={`${apiBase}/?route=files&action=${publicId}/download`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-border-warm bg-surface-warm text-xs font-medium text-brand-navy hover:bg-white hover:border-brand-orange-accessible hover:text-brand-orange-accessible transition-colors"
      title={filename}
      onClick={(e) => e.stopPropagation()}
    >
      <FileText className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate max-w-[180px]">{filename}</span>
      <Download className="h-3 w-3 shrink-0 opacity-60" />
    </a>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function GridSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-border-warm bg-surface-card p-6">
          <div className="flex justify-between mb-3">
            <div className="h-5 w-2/5 rounded bg-surface-warm" />
            <div className="h-5 w-16 rounded-full bg-surface-warm" />
          </div>
          <div className="h-3 w-1/4 rounded bg-surface-warm mb-4" />
          <div className="space-y-2">
            <div className="h-3 rounded bg-surface-warm" />
            <div className="h-3 rounded bg-surface-warm" />
            <div className="h-3 w-4/5 rounded bg-surface-warm" />
          </div>
        </div>
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border-warm bg-surface-card animate-pulse">
      <div className="h-10 bg-surface-warm border-b border-border-warm" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-border-warm last:border-0">
          <div className="h-4 w-2/5 rounded bg-surface-warm" />
          <div className="h-4 w-16 rounded-full bg-surface-warm" />
          <div className="h-4 w-24 rounded bg-surface-warm" />
          <div className="h-4 w-20 rounded bg-surface-warm ml-auto" />
        </div>
      ))}
    </div>
  )
}

// ── Grid view ─────────────────────────────────────────────────────────────────
function GridView({ notices, apiBase }: { notices: NoticeFeedItem[]; apiBase: string }) {
  return (
    <div className="grid gap-4">
      {notices.map((notice) => (
        <div
          key={notice.public_id}
          className={`rounded-xl border bg-surface-card shadow-sm hover:shadow-card-hover transition-shadow border-l-4 ${
            notice.notice_type === 'event' ? 'border-l-amber-400' : 'border-l-brand-orange-accessible'
          } border-border-warm`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-border-warm">
            <div className="space-y-0.5 min-w-0">
              <h3 className="text-base font-semibold text-brand-navy leading-snug">{notice.title}</h3>
              <p className="text-xs text-muted-foreground">
                {formatDate(notice.published_at || notice.created_at)}
              </p>
            </div>
            <TypeBadge type={notice.notice_type} />
          </div>

          {/* Content */}
          <div className="px-5 py-4 space-y-4">
            <div
              className="prose prose-sm max-w-none text-brand-navy leading-relaxed"
              dangerouslySetInnerHTML={{ __html: notice.content }}
            />

            {/* Event details */}
            {notice.notice_type === 'event' && (notice.event_date || notice.event_location) && (
              <div className="flex flex-col gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                {notice.event_date && (
                  <div className="flex items-start gap-2 text-sm text-amber-900">
                    <Calendar className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{formatEventDateTime(notice.event_date)}</span>
                  </div>
                )}
                {notice.event_location && (
                  <div className="flex items-start gap-2 text-sm text-amber-900">
                    <MapPin className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{notice.event_location}</span>
                  </div>
                )}
              </div>
            )}

            {/* Attachment */}
            {notice.attachment_public_id && (
              <div className="pt-1 border-t border-border-warm flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Attachment:</span>
                <AttachmentLink
                  publicId={notice.attachment_public_id}
                  filename={notice.attachment_filename ?? 'Download file'}
                  apiBase={apiBase}
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Table view ────────────────────────────────────────────────────────────────
function TableView({ notices, apiBase }: { notices: NoticeFeedItem[]; apiBase: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-warm bg-surface-card">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border-warm bg-surface-warm">
            <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wide">
              Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wide whitespace-nowrap">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wide whitespace-nowrap">
              Published
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wide whitespace-nowrap">
              Event Info
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wide">
              Attachment
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-warm">
          {notices.map((notice) => (
            <tr
              key={notice.public_id}
              className="hover:bg-surface-warm/60 transition-colors"
            >
              {/* Title */}
              <td className="px-4 py-3 max-w-xs">
                <div className="flex items-start gap-2.5">
                  <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                    notice.notice_type === 'event' ? 'bg-amber-400' : 'bg-brand-orange-accessible'
                  }`} />
                  <span className="font-medium text-brand-navy leading-snug line-clamp-2">{notice.title}</span>
                </div>
              </td>

              {/* Type */}
              <td className="px-4 py-3">
                <TypeBadge type={notice.notice_type} />
              </td>

              {/* Date */}
              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(notice.published_at || notice.created_at)}
              </td>

              {/* Event info */}
              <td className="px-4 py-3 max-w-[200px]">
                {notice.notice_type === 'event' && (notice.event_date || notice.event_location) ? (
                  <div className="space-y-1">
                    {notice.event_date && (
                      <div className="flex items-start gap-1 text-xs text-amber-700">
                        <Calendar className="h-3 w-3 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{formatEventDateTime(notice.event_date)}</span>
                      </div>
                    )}
                    {notice.event_location && (
                      <div className="flex items-start gap-1 text-xs text-amber-700">
                        <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{notice.event_location}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>

              {/* Attachment */}
              <td className="px-4 py-3">
                {notice.attachment_public_id ? (
                  <AttachmentLink
                    publicId={notice.attachment_public_id}
                    filename={notice.attachment_filename ?? 'Download'}
                    apiBase={apiBase}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export function NoticesFeedView({ notices, isLoading, viewMode, apiBase }: Props) {
  if (isLoading) {
    return viewMode === 'grid' ? <GridSkeleton /> : <TableSkeleton />
  }

  if (viewMode === 'table') {
    return <TableView notices={notices} apiBase={apiBase} />
  }

  return <GridView notices={notices} apiBase={apiBase} />
}
