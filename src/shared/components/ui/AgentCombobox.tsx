import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, UserCheck } from 'lucide-react'
import { fetchAgentDirectory, fetchAdminAgents } from '../../../lib/api'

export interface AgentOption {
  public_id: string
  full_name: string
  agency_name?: string | null
  referral_code?: string | null
}

interface AgentComboboxProps {
  value: AgentOption | null
  onChange: (agent: AgentOption | null) => void
  /** 'student' calls the student-scoped directory endpoint; 'admin' calls the admin agents list (approved only). */
  scope: 'student' | 'admin'
  placeholder?: string
  removeLabel?: string
}

export function AgentCombobox({ value, onChange, scope, placeholder = 'Search agent by name or code…', removeLabel = 'Remove' }: AgentComboboxProps) {
  const [query, setQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250)
    return () => clearTimeout(t)
  }, [query])

  const searchQuery = useQuery({
    queryKey: ['agent-combobox', scope, debouncedQuery],
    queryFn: async (): Promise<AgentOption[]> => {
      if (scope === 'student') {
        return fetchAgentDirectory(debouncedQuery)
      }
      const result = await fetchAdminAgents({ q: debouncedQuery, perPage: 8, status: 'approved' })
      return result.agents
    },
    enabled: debouncedQuery.length >= 2,
  })

  const results = searchQuery.data ?? []

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border-warm bg-surface-warm px-3.5 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <UserCheck className="h-4 w-4 shrink-0 text-brand-orange-accessible" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-brand-navy">{value.full_name}</p>
            {(value.agency_name || value.referral_code) && (
              <p className="truncate text-[11px] text-muted-foreground">
                {value.agency_name}
                {value.agency_name && value.referral_code ? ' · ' : ''}
                {value.referral_code}
              </p>
            )}
          </div>
        </div>
        <button type="button" className="shrink-0 text-xs font-semibold text-red-600" onClick={() => onChange(null)}>
          {removeLabel}
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <input
        className="w-full rounded-md border border-border-warm bg-surface-warm px-3.5 py-2.5 pl-9 text-sm text-brand-navy focus:border-brand-navy focus:outline-none"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.length >= 2 && results.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border-warm bg-surface-card shadow-card">
          {results.map((agent) => (
            <button
              type="button"
              key={agent.public_id}
              className="w-full px-3.5 py-2 text-left text-sm hover:bg-surface-warm"
              onClick={() => {
                onChange(agent)
                setQuery('')
              }}
            >
              <span className="font-medium text-brand-navy">{agent.full_name}</span>
              {agent.agency_name && <span className="text-muted-foreground"> · {agent.agency_name}</span>}
              {agent.referral_code && <span className="text-muted-foreground"> ({agent.referral_code})</span>}
            </button>
          ))}
        </div>
      )}
      {query.length >= 2 && !searchQuery.isFetching && results.length === 0 && (
        <p className="mt-1 text-xs text-muted-foreground">No approved agents match "{query}".</p>
      )}
    </div>
  )
}
