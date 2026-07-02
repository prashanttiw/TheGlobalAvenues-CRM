import { cn } from '../../../lib/utils'

interface UniversityLogoProps {
  name: string
  logoThumbUrl?: string | null
  logoUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZE_CLASSES: Record<NonNullable<UniversityLogoProps['size']>, string> = {
  sm: 'h-8 w-8 text-[10px]',
  md: 'h-11 w-11 text-xs',
  lg: 'h-12 w-12 text-sm',
  xl: 'h-20 w-20 text-lg',
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()
}

export function UniversityLogo({ name, logoThumbUrl, logoUrl, size = 'md', className }: UniversityLogoProps) {
  const src = logoThumbUrl || logoUrl

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl bg-brand-navy/5 text-brand-navy font-bold shrink-0 overflow-hidden',
        SIZE_CLASSES[size],
        className
      )}
    >
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : initials(name || '?')}
    </div>
  )
}
