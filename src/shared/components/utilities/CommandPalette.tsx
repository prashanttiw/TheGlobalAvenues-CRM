import * as React from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { Search, Calculator, Calendar, CreditCard, Settings, User, FileText } from 'lucide-react'
import { useCommandPaletteStore } from '../../hooks/useCommandPalette'
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from '@radix-ui/react-dialog'

interface CommandItemType {
  label: string
  icon: React.ElementType
  group: 'Suggestions' | 'Tools'
  path?: string
  action?: () => void
}

const COMMAND_ITEMS: CommandItemType[] = [
  { label: 'Go to Applications', icon: FileText, group: 'Suggestions', path: '/portal/student/applications' },
  { label: 'View Profile', icon: User, group: 'Suggestions', path: '/portal/student/profile' },
  { label: 'Billing & Payments', icon: CreditCard, group: 'Suggestions', path: '/portal/student/payments' },
  { label: 'Schedule Consultation', icon: Calendar, group: 'Tools', action: () => {} },
  { label: 'Cost Estimator', icon: Calculator, group: 'Tools', action: () => {} },
  { label: 'Preferences', icon: Settings, group: 'Tools', action: () => {} },
]

export function CommandPalette() {
  const { isOpen, toggle, close } = useCommandPaletteStore()
  const navigate = useNavigate()
  const [search, setSearch] = React.useState("")

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

  // Filter items manually for screen reader announcement calculation
  const filteredItems = React.useMemo(() => {
    if (!search) return COMMAND_ITEMS
    return COMMAND_ITEMS.filter(item => 
      item.label.toLowerCase().includes(search.toLowerCase())
    )
  }, [search])

  const announcement = React.useMemo(() => {
    if (!search) return ""
    return `${filteredItems.length} result${filteredItems.length === 1 ? "" : "s"} found.`
  }, [search, filteredItems])

  const suggestions = filteredItems.filter(item => item.group === 'Suggestions')
  const tools = filteredItems.filter(item => item.group === 'Tools')

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogContent className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] p-4 shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <Command
            className="flex h-[400px] w-full flex-col overflow-hidden rounded-card bg-surface-card border border-border-warm text-brand-navy"
            label="Global Command Menu"
          >
            <div className="flex items-center border-b border-border-warm px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus:ring-0"
                placeholder="Type a command or search..."
              />
              {/* Visually hidden screen reader announcer */}
              <span className="sr-only" aria-live="polite" aria-atomic="true">
                {announcement}
              </span>
            </div>
            
            <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 scrollbar-thin">
              {filteredItems.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </div>
              )}

              {suggestions.length > 0 && (
                <Command.Group heading="Suggestions" className="overflow-hidden p-1 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground">
                  {suggestions.map((item, idx) => (
                    <Command.Item 
                      key={idx}
                      onSelect={() => runCommand(() => {
                        if (item.path) navigate(item.path)
                        else if (item.action) item.action()
                      })}
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-brand-orange-accessible/10 aria-selected:text-brand-orange-accessible data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50"
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {filteredItems.length > 0 && suggestions.length > 0 && tools.length > 0 && (
                <Command.Separator className="-mx-2 my-2 h-px bg-border-warm" />
              )}

              {tools.length > 0 && (
                <Command.Group heading="Tools" className="overflow-hidden p-1 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground">
                  {tools.map((item, idx) => (
                    <Command.Item 
                      key={idx}
                      onSelect={() => runCommand(() => {
                        if (item.path) navigate(item.path)
                        else if (item.action) item.action()
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
