import { Toaster as Sonner } from "sonner"
import * as React from "react"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface-card group-[.toaster]:text-foreground group-[.toaster]:border-border-warm group-[.toaster]:shadow-card",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-brand-orange-accessible group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-surface-warm group-[.toast]:text-muted-foreground",
          error: "group-[.toaster]:border-red-200 group-[.toaster]:bg-red-50 group-[.toaster]:text-red-900",
          success: "group-[.toaster]:border-green-200 group-[.toaster]:bg-green-50 group-[.toaster]:text-green-900",
          warning: "group-[.toaster]:border-amber-200 group-[.toaster]:bg-amber-50 group-[.toaster]:text-amber-900",
          info: "group-[.toaster]:border-brand-navy/20 group-[.toaster]:bg-brand-navy/5 group-[.toaster]:text-brand-navy",
        },
      }}
      position="top-right"
      duration={4000}
      closeButton
      {...props}
    />
  )
}

export { Toaster }
