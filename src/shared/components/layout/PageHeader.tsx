import * as React from 'react'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-border-warm/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold leading-tight text-brand-navy">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </div>
  )
}
