import { Button } from './Button'

/**
 * Shown only while at least one filter differs from its default — pairs with useUrlFilters'
 * hasActiveFilters. Matches the "Reset Filters" styling already established on the Commissions page.
 */
export function ClearFiltersButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <div className={className ?? 'flex justify-end'}>
      <Button variant="secondary" size="sm" onClick={onClick}>
        Clear Filters
      </Button>
    </div>
  )
}
