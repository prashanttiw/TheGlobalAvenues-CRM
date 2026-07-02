import { Menu, Search } from 'lucide-react'
import { useSidebarStore } from '../../hooks/useSidebarStore'
import { useCommandPaletteStore } from '../../hooks/useCommandPalette'
import { Button } from '../ui/Button'
import { NotificationCenter } from '../NotificationCenter'

interface TopBarProps {
  pageTitle?: string
}

export function TopBar({ pageTitle }: TopBarProps) {
  const { toggle } = useSidebarStore()
  const { open } = useCommandPaletteStore()

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border-warm bg-surface-card/95 px-4 shadow-sm backdrop-blur lg:px-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="text-brand-navy lg:hidden" onClick={toggle} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
        {pageTitle && (
          <h1 className="max-w-[100px] truncate font-display text-sm font-bold leading-tight text-brand-navy sm:max-w-xs sm:text-base md:max-w-none md:text-lg">
            {pageTitle}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          className="hidden w-52 justify-start border border-border-warm bg-surface-warm text-muted-foreground shadow-sm hover:border-brand-orange-accessible/30 hover:bg-surface-card hover:text-brand-navy md:flex"
          onClick={open}
        >
          <Search className="mr-2 h-4 w-4" />
          <span className="text-xs">Search...</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center rounded border border-border-warm bg-surface-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">Ctrl K</kbd>
        </Button>

        <Button variant="ghost" size="icon" className="text-brand-navy lg:hidden" onClick={open} aria-label="Search">
          <Search className="h-5 w-5" />
        </Button>

        <NotificationCenter />
      </div>
    </header>
  )
}
