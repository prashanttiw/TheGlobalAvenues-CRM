import * as React from "react"
import { Search, Loader2, X } from "lucide-react"
import { cn } from "../../../lib/utils"

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string
  onChange: (value: string) => void
  isLoading?: boolean
  delay?: number
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onChange, isLoading, delay = 300, ...props }, ref) => {
    const [localValue, setLocalValue] = React.useState(value)

    React.useEffect(() => {
      setLocalValue(value)
    }, [value])

    React.useEffect(() => {
      const handler = setTimeout(() => {
        if (localValue !== value) {
          onChange(localValue)
        }
      }, delay)

      return () => clearTimeout(handler)
    }, [localValue, value, delay, onChange])

    return (
      <div className="relative flex items-center w-full max-w-sm">
        <div className="absolute left-3 flex h-full items-center justify-center text-muted-foreground">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </div>
        <input
          type="text"
          className={cn(
            "flex h-10 w-full rounded-button border border-border-warm bg-surface-card px-10 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
            className
          )}
          ref={ref}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          {...props}
        />
        {localValue && !isLoading && (
          <button
            type="button"
            className="absolute right-3 flex h-full items-center justify-center text-muted-foreground hover:text-foreground"
            onClick={() => {
              setLocalValue("")
              onChange("")
            }}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }
)
SearchInput.displayName = "SearchInput"

export { SearchInput }
