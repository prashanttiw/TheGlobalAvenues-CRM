import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { ShieldAlert, Calendar, User, Key, AlertTriangle } from 'lucide-react'

interface SecurityEvent {
  id: string
  eventType: 'otp_brute_force' | 'rate_limit_exceeded' | 'login_failed' | 'password_changed'
  userIp: string
  details: string
  date: string
}

const MOCK_EVENTS: SecurityEvent[] = [
  {
    id: 'evt-1',
    eventType: 'otp_brute_force',
    userIp: '192.168.1.105',
    details: '5 failed OTP attempts on student account amit@example.com',
    date: '2026-06-24 18:22:00',
  },
  {
    id: 'evt-2',
    eventType: 'rate_limit_exceeded',
    userIp: '103.88.22.41',
    details: 'Excessive requests to /api/v1/auth/login endpoint',
    date: '2026-06-24 18:15:30',
  },
  {
    id: 'evt-3',
    eventType: 'login_failed',
    userIp: '192.168.1.100',
    details: 'Failed credentials input on admin account sarah@example.com',
    date: '2026-06-24 17:05:12',
  },
  {
    id: 'evt-4',
    eventType: 'password_changed',
    userIp: '192.168.1.101',
    details: 'Password updated successfully for admin-1',
    date: '2026-06-24 14:10:00',
  }
]

export default function AdminSecurityPage() {
  const [eventTypeFilter, setEventTypeFilter] = React.useState('all')

  const filteredEvents = MOCK_EVENTS.filter(evt => {
    return eventTypeFilter === 'all' || evt.eventType === eventTypeFilter
  })

  const columns: ColumnDef<SecurityEvent>[] = [
    {
      key: 'eventType',
      header: 'Event Type',
      cell: (row) => {
        const isCritical = row.eventType === 'otp_brute_force' || row.eventType === 'rate_limit_exceeded'
        return (
          <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
            isCritical 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-brand-navy/5 text-brand-navy'
          }`}>
            {isCritical && <AlertTriangle className="h-3 w-3 shrink-0" />}
            {row.eventType.replace(/_/g, ' ')}
          </span>
        )
      },
    },
    {
      key: 'userIp',
      header: 'User / IP Address',
      cell: (row) => <span className="font-mono text-xs text-brand-navy">{row.userIp}</span>,
    },
    {
      key: 'details',
      header: 'Details',
      cell: (row) => {
        const isCritical = row.eventType === 'otp_brute_force' || row.eventType === 'rate_limit_exceeded'
        return (
          <span className={`text-xs ${isCritical ? 'text-red-600 font-medium' : 'text-brand-navy'}`}>
            {row.details}
          </span>
        )
      },
    },
    {
      key: 'date',
      header: 'Timestamp',
      cell: (row) => (
        <span className="flex items-center text-xs text-muted-foreground">
          <Calendar className="mr-1.5 h-3.5 w-3.5" />
          {row.date}
        </span>
      ),
    },
  ]

  return (
    <PageWrapper className="space-y-6">
      <PageHeader 
        title="Security Events" 
        subtitle="Real-time security log and threat monitoring board." 
      />

      <div className="flex flex-col sm:flex-row gap-4 bg-surface-card p-4 rounded-xl border border-border-warm">
        <div className="flex gap-2 w-full sm:w-auto">
          <select 
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          >
            <option value="all">All Events</option>
            <option value="otp_brute_force">OTP Brute Force Alerts</option>
            <option value="rate_limit_exceeded">Rate Limit Exceeded</option>
            <option value="login_failed">Failed Logins</option>
            <option value="password_changed">Password Changes</option>
          </select>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={filteredEvents}
        emptyMessage="No security events found."
      />
    </PageWrapper>
  )
}
