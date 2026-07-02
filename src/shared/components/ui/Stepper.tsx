import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "../../../lib/utils"

export interface StepperStep {
  key: string
  label: string
  description?: string
}

interface StepperProps {
  steps: StepperStep[]
  activeIndex: number
  onStepClick?: (index: number) => void
  className?: string
}

export function Stepper({ steps, activeIndex, onStepClick, className }: StepperProps) {
  return (
    <div className={cn("flex items-start", className)}>
      {steps.map((step, index) => {
        const isCompleted = index < activeIndex
        const isActive = index === activeIndex
        const isClickable = !!onStepClick && index <= activeIndex

        return (
          <React.Fragment key={step.key}>
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => onStepClick?.(index)}
              className={cn(
                "flex flex-col items-center gap-2 text-center",
                isClickable ? "cursor-pointer" : "cursor-default"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                  isCompleted
                    ? "border-brand-orange-accessible bg-brand-orange-accessible text-white"
                    : isActive
                      ? "border-brand-orange-accessible text-brand-orange-accessible bg-white"
                      : "border-border-warm text-muted-foreground bg-surface-warm"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span className="w-24">
                <span
                  className={cn(
                    "text-xs font-semibold block",
                    isActive || isCompleted ? "text-brand-navy" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
                {step.description ? (
                  <span className="text-[10px] text-muted-foreground">{step.description}</span>
                ) : null}
              </span>
            </button>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "mt-4 h-0.5 flex-1 rounded-full transition-colors",
                  index < activeIndex ? "bg-brand-orange-accessible" : "bg-border-warm"
                )}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
