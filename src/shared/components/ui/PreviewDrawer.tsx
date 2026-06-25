import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X, ExternalLink } from "lucide-react"
import { cn } from "../../../lib/utils"
import { Button } from "./Button"
import { useNavigate } from "react-router-dom"

const PreviewDrawerRoot = DialogPrimitive.Root
const PreviewDrawerTrigger = DialogPrimitive.Trigger
const PreviewDrawerPortal = DialogPrimitive.Portal

const PreviewDrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
PreviewDrawerOverlay.displayName = DialogPrimitive.Overlay.displayName

const PreviewDrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <PreviewDrawerPortal>
    <PreviewDrawerOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border-warm bg-surface-card shadow-2xl transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-[480px]",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </PreviewDrawerPortal>
))
PreviewDrawerContent.displayName = DialogPrimitive.Content.displayName

interface PreviewDrawerHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  badge?: React.ReactNode
}

const PreviewDrawerHeader = ({ className, title, badge, children, ...props }: PreviewDrawerHeaderProps) => (
  <div className={cn("flex flex-col space-y-3 p-6 border-b border-border-warm shrink-0 bg-surface-warm", className)} {...props}>
    <div className="flex items-start justify-between">
      <div className="flex flex-col gap-2">
        <DialogPrimitive.Title className="text-xl font-semibold font-display text-brand-navy pr-6">
          {title}
        </DialogPrimitive.Title>
        {badge && <div>{badge}</div>}
      </div>
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
        <X className="h-5 w-5 text-muted-foreground" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </div>
    {children}
  </div>
)
PreviewDrawerHeader.displayName = "PreviewDrawerHeader"

const PreviewDrawerBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin", className)} {...props} />
)
PreviewDrawerBody.displayName = "PreviewDrawerBody"

interface PreviewDrawerFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  detailUrl?: string
}

const PreviewDrawerFooter = ({ className, detailUrl, ...props }: PreviewDrawerFooterProps) => {
  const navigate = useNavigate()
  return (
    <div className={cn("flex items-center justify-between border-t border-border-warm bg-surface-card p-4 shrink-0", className)} {...props}>
      <DialogPrimitive.Close asChild>
        <Button variant="ghost">Close</Button>
      </DialogPrimitive.Close>
      {detailUrl && (
        <Button variant="primary" onClick={() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })) // close dialog
          navigate(detailUrl)
        }}>
          Open Full Page
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
PreviewDrawerFooter.displayName = "PreviewDrawerFooter"

export {
  PreviewDrawerRoot as PreviewDrawer,
  PreviewDrawerTrigger,
  PreviewDrawerContent,
  PreviewDrawerHeader,
  PreviewDrawerBody,
  PreviewDrawerFooter,
}
