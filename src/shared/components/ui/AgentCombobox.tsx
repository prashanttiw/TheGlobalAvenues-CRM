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

export function AgentCombobox({ value, onChange, scope, placeholder = 'Type to search, or click to browse all agents…', removeLabel = 'Remove' }: AgentComboboxProps) {
  const [query, setQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250)
    return () => clearTimeout(t)
  }, [query])

  // Close on outside click — the list otherwise stays open since it's no longer gated by query length.
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // No minimum-character gate: an empty query returns a default list (both backend endpoints
  // already support this — most-recent/alphabetical agents up to their own limit) so focusing the
  // field shows every reachable agent immediately, rather than forcing the user to already know
  // the exact name or referral code before anything appears.
  const searchQuery = useQuery({
    queryKey: ['agent-combobox', scope, debouncedQuery],
    queryFn: async (): Promise<AgentOption[]> => {
      if (scope === 'student') {
        return fetchAgentDirectory(debouncedQuery)
      }
      const result = await fetchAdminAgents({ q: debouncedQuery, perPage: 8, status: 'approved' })
      return result.agents
    },
    staleTime: 15_000,
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
    <div className="relative" ref={containerRef}>
      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <input
        className="w-full rounded-md border border-border-warm bg-surface-warm px-3.5 py-2.5 pl-9 text-sm text-brand-navy focus:border-brand-navy focus:outline-none"
        placeholder={placeholder}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setIsOpen(true) }}
        onFocus={() => setIsOpen(true)}
      />
      {isOpen && results.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border-warm bg-surface-card shadow-card">
          {results.map((agent) => (
            <button
              type="button"
              key={agent.public_id}
              className="w-full px-3.5 py-2 text-left text-sm hover:bg-surface-warm"
              onClick={() => {
                onChange(agent)
                setQuery('')
                setIsOpen(false)
              }}
            >
              <span className="font-medium text-brand-navy">{agent.full_name}</span>
              {agent.agency_name && <span className="text-muted-foreground"> · {agent.agency_name}</span>}
              {agent.referral_code && <span className="text-muted-foreground"> ({agent.referral_code})</span>}
            </button>
          ))}
        </div>
      )}
      {isOpen && !searchQuery.isFetching && results.length === 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          {query ? `No approved agents match "${query}".` : 'No approved agents available.'}
        </p>
      )}
    </div>
  )
}
