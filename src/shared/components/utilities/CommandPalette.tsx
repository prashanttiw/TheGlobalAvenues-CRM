import * as React from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { Search, FileText, Globe, GraduationCap, Briefcase, Activity, BookOpen } from 'lucide-react'
import { useCommandPaletteStore } from '../../hooks/useCommandPalette'
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from '@radix-ui/react-dialog'
import { useAuth } from '../../hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import api from '../../../lib/api'
import type { NavItem } from '../layout/Sidebar'

interface CommandPaletteProps {
  items: NavItem[]
}

export function CommandPalette({ items }: CommandPaletteProps) {
  const { isOpen, toggle, close } = useCommandPaletteStore()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        toggle()
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [toggle])

  // Reset search on open/close
  React.useEffect(() => {
    if (!isOpen) {
      setSearch("")
    }
  }, [isOpen])

  const runCommand = React.useCallback((command: () => void) => {
    close()
    command()
  }, [close])

  // Global Search Query
  const { data: searchResults = [], isFetching } = useQuery({
    queryKey: ['globalSearch', debouncedSearch, user?.role],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 3) return []
      
      const rolePrefix = user?.role
      if (!rolePrefix) return []

      const res = await api.get(`/${rolePrefix}/search`, { params: { q: debouncedSearch, types: 'students,applications,universities,courses,agents,leads' } })
      // res.data is already the results array (backend returns { data: [...] } directly,
      // and request() unwraps that literal top-level `data` key) — do not re-drill into `.data`.
      return res.data
    },
    enabled: isOpen && debouncedSearch.length >= 3 && ['admin', 'agent', 'student'].includes(user?.role || ''),
  })

  // Suggestions are just this dashboard's real sidebar nav — single source of truth,
  // so there's no separate hardcoded list that can drift out of sync or point at
  // another role's routes.
  const suggestions = React.useMemo(() => {
    if (!search) return items
    return items.filter(item => item.label.toLowerCase().includes(search.toLowerCase()))
  }, [items, search])

  const announcement = React.useMemo(() => {
    if (!search) return ""
    const total = suggestions.length + searchResults.length
    return `${total} result${total === 1 ? "" : "s"} found.`
  }, [search, suggestions, searchResults])

  const getIconForType = (type: string) => {
    switch (type) {
      case 'student': return GraduationCap
      case 'agent': return Briefcase
      case 'university': return Globe
      case 'course': return BookOpen
      case 'application': return FileText
      default: return Search
    }
  }

  const getPathForType = (type: string, id: string) => {
    const role = user?.role || 'student'
    const base = `/portal/${role}`
    switch (type) {
      case 'student': return `${base}/students/${id}`
      // Only admin has a real agent detail route, and it lives under /tree.
      case 'agent': return `${base}/agents/${id}/tree`
      case 'university':
      // Courses have no standalone detail page — the backend returns the parent
      // university's id for course rows, so this opens that university instead.
      case 'course':
        // Admin has a real /universities/:pid route; agent/student portals only have
        // a flat list page (local-state browse), so those deep-link via ?open= instead.
        return role === 'admin' ? `${base}/universities/${id}` : `${base}/universities?open=${id}`
      case 'application':
        // Agents have no standalone application view — applications only render nested
        // inside the owning student's page. The backend returns that student's
        // public_id (not the application's) for agent-scoped application results.
        if (role === 'agent') return `${base}/students/${id}`
        // Admin has a real /applications/:pid detail page; student portal only has a
        // flat list page (local-state), so that one still deep-links via ?open=.
        return role === 'admin' ? `${base}/applications/${id}` : `${base}/applications?open=${id}`
      default: return '#'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogContent className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] p-4 shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <Command
            className="flex h-[400px] w-full flex-col overflow-hidden rounded-card bg-surface-card border border-border-warm text-brand-navy"
            label="Global Command Menu"
            shouldFilter={false} // Disable cmkd filtering because we do it manually + API
          >
            <div className="flex items-center border-b border-border-warm px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus:ring-0"
                placeholder="Type a command or search globally..."
              />
              {isFetching && <Activity className="w-4 h-4 animate-spin text-brand-orange-accessible" />}
              {/* Visually hidden screen reader announcer */}
              <span className="sr-only" aria-live="polite" aria-atomic="true">
                {announcement}
              </span>
            </div>
            
            <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 scrollbar-thin">
              {suggestions.length === 0 && searchResults.length === 0 && !isFetching && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </div>
              )}

              {searchResults.length > 0 && (
                <Command.Group heading="Global Search Results" className="overflow-hidden p-1 text-xs font-medium text-brand-orange-accessible [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-brand-orange-accessible">
                  {searchResults.map((item: any, idx: number) => {
                    const Icon = getIconForType(item.type)
                    return (
                      <Command.Item 
                        key={`api-${item.public_id}-${idx}`}
                        value={`api-${item.public_id}`}
                        onSelect={() => runCommand(() => {
                          navigate(getPathForType(item.type, item.public_id))
                        })}
                        className="relative flex cursor-pointer select-none items-center justify-between rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-brand-orange-accessible/10 aria-selected:text-brand-orange-accessible data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50"
                      >
                        <div className="flex items-center">
                          <Icon className="mr-2 h-4 w-4 shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-semibold">{item.title}</span>
                            <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                          </div>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground px-1.5 py-0.5 border border-border-warm rounded bg-surface-warm">
                          {item.type}
                        </span>
                      </Command.Item>
                    )
                  })}
                </Command.Group>
              )}

              {searchResults.length > 0 && suggestions.length > 0 && (
                <Command.Separator className="-mx-2 my-2 h-px bg-border-warm" />
              )}

              {suggestions.length > 0 && (
                <Command.Group heading="Go to" className="overflow-hidden p-1 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground">
                  {suggestions.map((item, idx) => (
                    <Command.Item
                      key={`sug-${idx}`}
                      value={`sug-${idx}`}
                      onSelect={() => runCommand(() => {
                        navigate(item.path)
                      })}
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-brand-orange-accessible/10 aria-selected:text-brand-orange-accessible data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50"
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
