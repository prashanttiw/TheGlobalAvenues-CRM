import { Badge, StatusBadge, type StatusType } from '../ui/Badge'

const KNOWN_STATUSES = new Set<StatusType>([
  'registered', 'pending', 'approved', 'rejected', 'suspended', 'enrolled',
  'draft', 'submitted', 'under_review', 'offer_received', 'paid', 'confirmed',
])

export function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export function renderApplicationStatus(status: string) {
  return KNOWN_STATUSES.has(status as StatusType) ? (
    <StatusBadge status={status as StatusType} />
  ) : (
    <Badge variant="secondary">{formatStatusLabel(status)}</Badge>
  )
}
