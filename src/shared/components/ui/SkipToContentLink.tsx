import * as React from 'react'
import { cn } from '../../../lib/utils'

export function SkipToContentLink() {
  return (
    <a
      href="#main-content"
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100]",
        "bg-brand-orange-accessible text-white px-4 py-2 rounded-button font-medium shadow-card"
      )}
    >
      Skip to main content
    </a>
  )
}
