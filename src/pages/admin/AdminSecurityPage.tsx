import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ShieldAlert, Info, Calendar, User, Globe, Monitor } from 'lucide-react'
import { fetchAdminSecurityEvents } from '../../lib/api'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { Button } from '../../shared/components/ui/Button'

interface SecurityEvent {
  id: number
  event_type: string
  identifier: string | null
  ip_address: string | null
  user_agent: string | null
  details: unknown
  created_at: string
  user_id: number | null
  actor_role: 'admin' | 'agent' | 'student' | null
  actor_name: string | null
}

type Severity = 'critical' | 'warning' | 'info'

interface EventMeta {
  label: string
  description: string
  severity: Severity
}

// Every event_type that the backend actually writes to security_events, with a plain-English
// explanation of what it means. Keep in sync with the INSERT sites across AuthController,
// RegistrationController, OTPService, RateLimitMiddleware, FileController, SecurityEventLogger callers.
const EVENT_CATALOG: Record<string, EventMeta> = {
  login_success: { label: 'Sign-in succeeded', description: 'Someone signed in successfully.', severity: 'info' },
  login_failed: { label: 'Sign-in failed', description: 'A sign-in attempt failed — wrong password, wrong OTP, or the email isn’t registered.', severity: 'warning' },
  login_blocked_suspended: { label: 'Blocked: account suspended', description: 'A suspended account tried to sign in and was blocked.', severity: 'critical' },
  otp_not_found: { label: 'OTP not found', description: 'Someone tried to verify a one-time code that doesn’t exist or was already used.', severity: 'info' },
  otp_brute_force: { label: 'OTP brute force', description: 'Too many wrong one-time codes in a row — further attempts are now blocked.', severity: 'critical' },
  otp_rate_limit_repeated: { label: 'Repeated OTP requests', description: 'The same account/IP kept requesting new OTP codes well past the normal rate — likely automated abuse.', severity: 'critical' },
  rate_limit_exceeded: { label: 'Rate limit exceeded', description: 'A client sent more requests than an endpoint allows in the time window.', severity: 'warning' },
  registration_initiated: { label: 'Signup started', description: 'A new account signup began (not yet completed).', severity: 'info' },
  registration_completed: { label: 'Signup completed', description: 'A new account finished registration.', severity: 'info' },
  password_reset_requested: { label: 'Password reset requested', description: 'Someone started the “forgot password” flow for this account.', severity: 'info' },
  password_reset_completed: { label: 'Password reset completed', description: 'A password was changed via the “forgot password” flow — worth a second look if the account owner didn’t request it.', severity: 'warning' },
  password_changed: { label: 'Password changed', description: 'A signed-in user changed their own password. All their other active sessions were signed out.', severity: 'info' },
  '2fa_enabled': { label: '2FA turned on', description: 'Two-factor authentication was enabled for this account.', severity: 'info' },
  '2fa_disabled': { label: '2FA turned off', description: 'Two-factor authentication was disabled for this account — worth confirming this was intentional.', severity: 'warning' },
  '2fa_toggle_failed': { label: '2FA change blocked', description: 'Someone entered the wrong password while trying to change the 2FA setting.', severity: 'warning' },
  impersonation_denied: { label: 'Impersonation blocked', description: 'An admin “log in as user” attempt was denied by a safety check.', severity: 'critical' },
  impersonation_disabled: { label: 'Impersonation session ended', description: 'An admin ended a “log in as user” session.', severity: 'info' },
  account_suspended: { label: 'Account suspended', description: 'An agent account was suspended by an admin.', severity: 'warning' },
  file_integrity_failure: { label: 'File integrity check failed', description: 'A downloaded file’s checksum didn’t match what was stored on upload — possible tampering or storage corruption.', severity: 'critical' },
  smtp_send_failure: { label: 'Email failed to send', description: 'An outbound email (OTP, notification, etc.) failed to send.', severity: 'warning' },
}

function getEventMeta(eventType: string): EventMeta {
  return EVENT_CATALOG[eventType] ?? { label: eventType.replace(/_/g, ' '), description: 'No description on file for this event type yet.', severity: 'info' }
}

const SEVERITY_STYLES: Record<Severity, { badge: string; icon: React.ElementType }> = {
  critical: { badge: 'bg-red-50 text-red-700 border-red-200', icon: AlertTriangle },
  warning: { badge: 'bg-amber-50 text-amber-800 border-amber-200', icon: ShieldAlert },
  info: { badge: 'bg-brand-navy/5 text-brand-navy border-border-warm', icon: Info },
}

function parseDetails(details: unknown): Record<string, unknown> | null {
  if (details == null) return null
  if (typeof details === 'object') return details as Record<string, unknown>
  if (typeof details === 'string') {
    try { return JSON.parse(details) } catch { return null }
  }
  return null
}

// Turns the raw `details` JSON into a short, human sentence based on what the event actually is —
// instead of dumping the raw object at the admin.
function describeDetails(eventType: string, details: unknown): string | null {
  const d = parseDetails(details)
  if (!d) return null

  switch (eventType) {
    case 'login_failed':
      if (d.reason === 'unknown_email') return 'No account exists for that email.'
      if (d.reason === 'wrong_password') return 'Password did not match.'
      if (d.reason === 'wrong_current_password') return 'Entered the wrong current password while trying to change it.'
      if (d.reason === 'invalid_otp') return 'The one-time code was wrong or expired.'
      return null
    case 'otp_brute_force':
    case 'otp_not_found':
      return [d.purpose ? `Purpose: ${d.purpose}` : null, d.attempts ? `${d.attempts} failed attempts` : null].filter(Boolean).join(' · ') || null
    case 'otp_rate_limit_repeated':
    case 'rate_limit_exceeded':
      return [d.action ? `Action: ${d.action}` : null, d.requests ? `${d.requests} requests` : null, d.window_seconds ? `in a ${Math.round(Number(d.window_seconds) / 60)} min window` : null].filter(Boolean).join(' · ') || null
    case 'file_integrity_failure':
      return d.storage_path ? `File: ${String(d.storage_path).split('/').pop()}` : 'Stored checksum did not match the file on disk.'
    case 'smtp_send_failure':
      return typeof d.error === 'string' ? d.error : null
    default:
      return null
  }
}

function formatUserAgent(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device'
  // Lightweight browser hint — good enough to tell "a real browser" from "a script/bot" at a glance,
  // without pulling in a full UA-parsing dependency for a secondary column.
  const match = userAgent.match(/(Chrome|Firefox|Safari|Edg|OPR)\/[\d.]+/)
  return match ? match[0].replace('Edg/', 'Edge ').replace('OPR/', 'Opera ') : userAgent.slice(0, 40)
}

export default function AdminSecurityPage() {
  const [eventTypeFilter, setEventTypeFilter] = React.useState('')
  const [severityFilter, setSeverityFilter] = React.useState<'' | Severity>('')
  const [searchQuery, setSearchQuery] = React.useState('')

  const eventsQuery = useQuery({
    queryKey: ['admin', 'security-events', eventTypeFilter],
    queryFn: () => fetchAdminSecurityEvents({ perPage: 100, eventType: eventTypeFilter || undefined }),
    staleTime: 30_000,
  })

  const allEvents = (eventsQuery.data?.events ?? []) as SecurityEvent[]

  const events = allEvents.filter((event) => {
    if (severityFilter && getEventMeta(event.event_type).severity !== severityFilter) return false
    if (!searchQuery) return true
    const haystack = [event.event_type, event.actor_name, event.identifier, event.ip_address, JSON.stringify(event.details)].join(' ').toLowerCase()
    return haystack.includes(searchQuery.toLowerCase())
  })

  const severityCounts = allEvents.reduce(
    (acc, e) => {
      acc[getEventMeta(e.event_type).severity]++
      return acc
    },
    { critical: 0, warning: 0, info: 0 } as Record<Severity, number>
  )

  const columns: ColumnDef<SecurityEvent>[] = [
    {
      key: 'eventType',
      header: 'Event',
      cell: (row) => {
        const meta = getEventMeta(row.event_type)
        const style = SEVERITY_STYLES[meta.severity]
        const Icon = style.icon
        return (
          <div className="max-w-[220px]">
            <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${style.badge}`}>
              <Icon className="h-3 w-3 shrink-0" />
              {meta.label}
            </span>
            <p className="mt-1.5 text-xs text-muted-foreground leading-snug">{meta.description}</p>
          </div>
        )
      },
    },
    {
      key: 'who',
      header: 'Who / Where',
      cell: (row) => (
        <div className="text-xs text-brand-navy space-y-1">
          {row.actor_name ? (
            <div className="flex items-center gap-1.5 font-semibold">
              <User className="h-3.5 w-3.5 shrink-0 text-brand-orange-accessible" />
              {row.actor_name}
              <span className="text-[9px] uppercase font-bold text-muted-foreground bg-surface-warm px-1 py-0.5 rounded">{row.actor_role}</span>
            </div>
          ) : row.actor_role ? (
            <div className="flex items-center gap-1.5 text-muted-foreground italic" title="You don't have view access to this person's directory (Students/Agents/Users page) to see their name.">
              <User className="h-3.5 w-3.5 shrink-0" />
              {row.actor_role} account — name hidden from your access level
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground italic">
              <User className="h-3.5 w-3.5 shrink-0" />
              Unidentified / not signed in
            </div>
          )}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Globe className="h-3.5 w-3.5 shrink-0" />
            <span className="font-mono">{row.ip_address || 'IP unavailable'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground" title={row.user_agent || undefined}>
            <Monitor className="h-3.5 w-3.5 shrink-0" />
            {formatUserAgent(row.user_agent)}
          </div>
        </div>
      ),
    },
    {
      key: 'details',
      header: 'What happened',
      cell: (row) => {
        const extra = describeDetails(row.event_type, row.details)
        return (
          <span className="text-xs text-brand-navy">
            {extra || <span className="text-muted-foreground italic">No additional detail recorded.</span>}
          </span>
        )
      },
    },
    {
      key: 'date',
      header: 'Timestamp',
      cell: (row) => (
        <span className="flex items-center text-xs text-muted-foreground whitespace-nowrap">
          <Calendar className="mr-1.5 h-3.5 w-3.5 shrink-0" />
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
  ]

  const eventTypeOptions = Object.keys(EVENT_CATALOG)

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title="Security Events"
        subtitle="Live audit trail of sign-ins, OTP abuse, rate-limit violations, and other security-relevant activity."
      />

      <div className="grid grid-cols-3 gap-4">
        {(['critical', 'warning', 'info'] as Severity[]).map((sev) => {
          const style = SEVERITY_STYLES[sev]
          const Icon = style.icon
          return (
            <button
              key={sev}
              type="button"
              onClick={() => setSeverityFilter(severityFilter === sev ? '' : sev)}
              className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-shadow hover:shadow-card ${style.badge} ${severityFilter === sev ? 'ring-2 ring-offset-1 ring-brand-orange-accessible' : ''}`}
            >
              <Icon className="h-6 w-6 shrink-0" />
              <div>
                <p className="text-2xl font-black">{severityCounts[sev]}</p>
                <p className="text-[10px] uppercase font-bold tracking-wide">{sev} · this page</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-surface-card p-4 rounded-xl border border-border-warm">
        <select
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
        >
          <option value="">All Event Types</option>
          {eventTypeOptions.map((key) => (
            <option key={key} value={key}>{getEventMeta(key).label}</option>
          ))}
        </select>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, IP, or event details..."
          className="w-full sm:w-80 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
        />

        {severityFilter && (
          <Button variant="outline" size="sm" onClick={() => setSeverityFilter('')}>
            Clear severity filter
          </Button>
        )}
      </div>

      {eventsQuery.isError ? (
        <EmptyState
          heading="Security events could not be loaded"
          description={eventsQuery.error instanceof Error ? eventsQuery.error.message : 'The backend request failed.'}
          action={<Button onClick={() => eventsQuery.refetch()}>Retry</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          data={events}
          isLoading={eventsQuery.isLoading}
          emptyMessage="No security events matched the current criteria."
        />
      )}
    </PageWrapper>
  )
}
