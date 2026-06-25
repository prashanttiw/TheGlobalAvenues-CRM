import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { Calendar, User, Clock, Terminal } from 'lucide-react'

interface SystemLog {
  id: string
  actor: string
  actorType: 'student' | 'agent' | 'admin'
  action: string
  target: string
  timestamp: string
}

const MOCK_LOGS: SystemLog[] = [
  {
    id: 'log-1',
    actor: 'Amit Tiwari (Super Admin)',
    actorType: 'admin',
    action: 'Changed University Status',
    target: 'Technical University of Vienna (Approved)',
    timestamp: '2026-06-24 17:15:30',
  },
  {
    id: 'log-2',
    actor: 'Global Education Partners',
    actorType: 'agent',
    action: 'Uploaded Document',
    target: 'std-201 (Passport)',
    timestamp: '2026-06-24 16:45:12',
  },
  {
    id: 'log-3',
    actor: 'Amit Tiwari (Student)',
    actorType: 'student',
    action: 'Applied for Course',
    target: 'University of Toronto (Computer Science)',
    timestamp: '2026-06-24 15:30:00',
  }
]

export default function AdminLogsPage() {
  const [actorTypeFilter, setActorTypeFilter] = React.useState('all')

  const filteredLogs = MOCK_LOGS.filter(log => {
    return actorTypeFilter === 'all' || log.actorType === actorTypeFilter
  })

  const columns: ColumnDef<SystemLog>[] = [
    {
      key: 'actor',
      header: 'Actor',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            {row.actor}
          </p>
          <span className="text-[9px] uppercase font-bold text-brand-navy bg-brand-navy/5 px-1.5 py-0.5 rounded">
            {row.actorType}
          </span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      cell: (row) => <span className="text-brand-navy font-medium">{row.action}</span>,
    },
    {
      key: 'target',
      header: 'Target Entity',
      cell: (row) => (
        <span className="flex items-center text-xs text-muted-foreground">
          <Terminal className="mr-1.5 h-3.5 w-3.5 text-brand-orange-accessible" />
          {row.target}
        </span>
      ),
    },
    {
      key: 'timestamp',
      header: 'Date/Time',
      cell: (row) => (
        <span className="flex items-center text-xs text-muted-foreground">
          <Clock className="mr-1.5 h-3.5 w-3.5" />
          {row.timestamp}
        </span>
      ),
    },
  ]

  return (
    <PageWrapper className="space-y-6">
      <PageHeader 
        title="Activity Logs" 
        subtitle="System-wide audit trail recording user and administrative operations." 
      />

      <div className="flex flex-col sm:flex-row gap-4 bg-surface-card p-4 rounded-xl border border-border-warm">
        <div className="flex gap-2 w-full sm:w-auto">
          <select 
            value={actorTypeFilter}
            onChange={(e) => setActorTypeFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          >
            <option value="all">All Actor Types</option>
            <option value="admin">Administrator Logs</option>
            <option value="agent">Agent Partner Logs</option>
            <option value="student">Student Logs</option>
          </select>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={filteredLogs}
        emptyMessage="No audit logs matched the criteria."
      />
    </PageWrapper>
  )
}
