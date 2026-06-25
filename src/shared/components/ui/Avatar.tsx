import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cn } from "../../../lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & { size?: "sm" | "md" | "lg" }
>(({ className, size = "md", ...props }, ref) => {
  const sizeClass = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-16 w-16 text-lg"
  }[size]

  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        sizeClass,
        className
      )}
      {...props}
    />
  )
})
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted font-medium text-muted-foreground",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export interface UserAvatarProps {
  name: string
  image?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

const BRAND_COLORS = [
  "bg-brand-navy/10 text-brand-navy",
  "bg-brand-orange/10 text-brand-orange-accessible",
  "bg-brand-amber/10 text-brand-amber",
  "bg-surface-warm border border-border-warm text-brand-navy",
  "bg-brand-navy/20 text-brand-navy",
  "bg-brand-orange-accessible/10 text-brand-orange-accessible",
]

export function UserAvatar({ name, image, size = "md", className }: UserAvatarProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  // Hash name to pick consistent color
  const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0)
  const colorClass = BRAND_COLORS[Math.abs(hash) % BRAND_COLORS.length]

  return (
    <Avatar size={size} className={className}>
      {image && <AvatarImage src={image} alt={name} />}
      <AvatarFallback className={cn(!image && colorClass)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

export { Avatar, AvatarImage, AvatarFallback }
