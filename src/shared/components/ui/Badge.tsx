import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../../lib/utils"

// General Badge component
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-5 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-orange-accessible focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand-navy text-white hover:bg-brand-navy/90",
        secondary: "border-border-warm bg-surface-warm text-brand-navy hover:bg-brand-orange-accessible/10",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "border-border-warm bg-surface-card text-brand-navy",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

// Specialized StatusBadge
export type StatusType = 
  | 'registered' | 'pending' | 'approved' | 'rejected' | 'suspended' 
  | 'enrolled' | 'draft' | 'submitted' | 'under_review' | 'offer_received' 
  | 'paid' | 'confirmed';

const statusConfig: Record<StatusType, { bg: string; text: string; label: string }> = {
  registered:    { bg: 'bg-gray-100',   text: 'text-gray-700',  label: 'Registered' },
  pending:       { bg: 'bg-amber-100',  text: 'text-amber-700', label: 'Pending' },
  approved:      { bg: 'bg-green-100',  text: 'text-green-700', label: 'Approved' },
  rejected:      { bg: 'bg-red-100',    text: 'text-red-700',   label: 'Rejected' },
  suspended:     { bg: 'bg-red-100',    text: 'text-red-700',   label: 'Suspended' },
  enrolled:      { bg: 'bg-brand-navy/10', text: 'text-brand-navy', label: 'Enrolled' },
  draft:         { bg: 'bg-gray-100',   text: 'text-gray-700',  label: 'Draft' },
  submitted:     { bg: 'bg-amber-100',  text: 'text-amber-700', label: 'Submitted' },
  under_review:  { bg: 'bg-brand-orange-accessible/10', text: 'text-brand-orange-accessible',label: 'Under Review' },
  offer_received:{ bg: 'bg-green-100',  text: 'text-green-700', label: 'Offer Received' },
  paid:          { bg: 'bg-green-100',  text: 'text-green-700', label: 'Paid' },
  confirmed:     { bg: 'bg-green-100',  text: 'text-green-700', label: 'Confirmed' },
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: StatusType;
}

function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const config = statusConfig[status];
  if (!config) {
    return <Badge className={className} variant="outline" {...props}>{status}</Badge>;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold leading-5",
        config.bg,
        config.text,
        className
      )}
      {...props}
    >
      {config.label}
    </div>
  )
}

export { Badge, badgeVariants, StatusBadge }
