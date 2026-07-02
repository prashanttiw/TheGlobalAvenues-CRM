import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "../../../lib/utils"

const SlideOver = DialogPrimitive.Root
const SlideOverTrigger = DialogPrimitive.Trigger
const SlideOverPortal = DialogPrimitive.Portal

const SlideOverOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/45 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
SlideOverOverlay.displayName = DialogPrimitive.Overlay.displayName

const SlideOverContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <SlideOverPortal>
    <SlideOverOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-border-warm bg-surface-card shadow-warm-xl transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-[560px]",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </SlideOverPortal>
))
SlideOverContent.displayName = DialogPrimitive.Content.displayName

const SlideOverHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex shrink-0 flex-col space-y-1.5 border-b border-border-warm bg-surface-warm/70 p-6", className)} {...props}>
    {children}
    <DialogPrimitive.Close className="absolute right-4 top-4 rounded-button p-1.5 opacity-80 ring-offset-background transition-colors hover:bg-surface-card hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-brand-orange-accessible focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
      <X className="h-5 w-5 text-muted-foreground" />
      <span className="sr-only">Close</span>
    </DialogPrimitive.Close>
  </div>
)
SlideOverHeader.displayName = "SlideOverHeader"

const SlideOverBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex-1 overflow-y-auto p-6 scrollbar-thin", className)} {...props} />
)
SlideOverBody.displayName = "SlideOverBody"

const SlideOverFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center justify-end space-x-2 border-t border-border-warm bg-surface-warm p-4 shrink-0", className)} {...props} />
)
SlideOverFooter.displayName = "SlideOverFooter"

const SlideOverTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold font-display text-brand-navy", className)}
    {...props}
  />
))
SlideOverTitle.displayName = DialogPrimitive.Title.displayName

interface SlideOverPanelProps {
  title: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

export function SlideOverPanel({ title, open, onOpenChange, children }: SlideOverPanelProps) {
  return (
    <SlideOver open={open} onOpenChange={onOpenChange}>
      <SlideOverContent>
        <SlideOverHeader>
          <SlideOverTitle>{title}</SlideOverTitle>
        </SlideOverHeader>
        <SlideOverBody>
          {children}
        </SlideOverBody>
      </SlideOverContent>
    </SlideOver>
  )
}

export {
  SlideOver,
  SlideOverPortal,
  SlideOverOverlay,
  SlideOverTrigger,
  SlideOverContent,
  SlideOverHeader,
  SlideOverBody,
  SlideOverFooter,
  SlideOverTitle,
}
