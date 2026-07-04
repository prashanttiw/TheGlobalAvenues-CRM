import * as React from 'react'
import { createPortal } from 'react-dom'
import { Construction } from 'lucide-react'

interface UnderDevelopmentNoticeProps {
  featureName: string
  delayMs?: number
}

export function UnderDevelopmentNotice({ featureName, delayMs = 1000 }: UnderDevelopmentNoticeProps) {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delayMs)
    return () => clearTimeout(timer)
  }, [delayMs])

  if (!visible) return null

  // Portalled to document.body: PageWrapper renders a motion.div whose resting
  // `transform` (from the y-animation) creates a new containing block, which would
  // otherwise scope this `fixed` overlay to the page content box instead of the
  // viewport, misaligning it with the sidebar/topbar cutouts below.
  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="under-development-title"
      className="fixed inset-0 top-16 z-40 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm lg:left-[260px]"
    >
      <div className="w-full max-w-md rounded-card border border-amber-200 bg-surface-card p-8 text-center shadow-warm-lg">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Construction className="h-8 w-8" />
        </div>
        <h2 id="under-development-title" className="mt-5 font-display text-xl font-semibold text-brand-navy">
          Feature Under Development
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {featureName} is still being built. Some data or actions here may be incomplete or unavailable.
        </p>
        <p className="mt-4 text-xs font-medium text-amber-700">
          Please use the sidebar to continue to another page.
        </p>
      </div>
    </div>,
    document.body
  )
}
