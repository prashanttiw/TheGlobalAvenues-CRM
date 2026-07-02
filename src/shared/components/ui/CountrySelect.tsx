import * as React from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { COUNTRIES } from '../../data/countries'

interface CountrySelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

export function CountrySelect({ value, onChange, placeholder = 'Select country', className, autoFocus }: CountrySelectProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = query
    ? COUNTRIES.filter((c) => c.toLowerCase().includes(query.toLowerCase()))
    : COUNTRIES

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        autoFocus={autoFocus}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
      >
        <span className={value ? '' : 'text-muted-foreground'}>{value || placeholder}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-border-warm bg-surface-card shadow-card">
          <div className="relative p-2 border-b border-border-warm">
            <Search className="absolute left-4.5 top-4.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to filter…"
              className="w-full pl-7 pr-2 py-1.5 bg-surface-warm border border-border-warm rounded text-sm text-brand-navy focus:outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3.5 py-2 text-xs text-muted-foreground">No countries match.</p>
            ) : (
              filtered.map((country) => (
                <button
                  type="button"
                  key={country}
                  onClick={() => {
                    onChange(country)
                    setOpen(false)
                    setQuery('')
                  }}
                  className={cn(
                    'w-full text-left px-3.5 py-2 text-sm hover:bg-surface-warm',
                    country === value ? 'text-brand-orange-accessible font-semibold' : 'text-brand-navy'
                  )}
                >
                  {country}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
