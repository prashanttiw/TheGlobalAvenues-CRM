import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

type FilterValues = Record<string, string>

/**
 * Syncs a page's list filters (search text, status dropdowns, date ranges, pagination page
 * number, etc.) to the URL's query string instead of plain useState, so filters survive
 * navigating away and back (detail drawers, browser back button, refresh) and are shareable via
 * link. A value equal to its default is omitted from the URL rather than written as `key=default`,
 * keeping URLs clean and making "any filter active" a simple comparison against defaults.
 *
 * All values are strings — callers coerce (e.g. `Number(filters.page)`) at the point of use.
 */
export function useUrlFilters<T extends FilterValues>(defaults: T) {
  const [searchParams, setSearchParams] = useSearchParams()
  const defaultsRef = useRef(defaults)

  const filters = useMemo(() => {
    const result = { ...defaultsRef.current } as T
    for (const key of Object.keys(defaultsRef.current)) {
      const value = searchParams.get(key)
      if (value !== null) (result as FilterValues)[key] = value
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const setFilter = useCallback((key: keyof T, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (!value || value === defaultsRef.current[key as string]) {
        next.delete(key as string)
      } else {
        next.set(key as string, value)
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  const setFilters = useCallback((patch: Partial<T>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      for (const key of Object.keys(patch)) {
        const value = patch[key]
        if (!value || value === defaultsRef.current[key]) {
          next.delete(key)
        } else {
          next.set(key, String(value))
        }
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  const clearFilters = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      for (const key of Object.keys(defaultsRef.current)) next.delete(key)
      return next
    }, { replace: true })
  }, [setSearchParams])

  const hasActiveFilters = useMemo(
    () => Object.keys(defaultsRef.current).some(key => filters[key] !== defaultsRef.current[key]),
    [filters]
  )

  return { filters, setFilter, setFilters, clearFilters, hasActiveFilters }
}

/**
 * Debounces a fast-changing local value (typically a search input's raw text, kept as local
 * useState for responsive typing) into a callback — typically `setFilters({ search: v, page: '1' })`
 * — without firing on mount. Skipping the mount-run matters here specifically: `value` is normally
 * seeded from the URL-backed filter itself, so an unguarded effect would immediately re-write the
 * same value back and reset `page` to 1 on every remount, destroying the very persistence
 * useUrlFilters exists to provide.
 */
export function useDebouncedFilterSync(value: string, onDebounced: (value: string) => void, delayMs = 350) {
  const isMounted = useRef(false)
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      return
    }
    const t = setTimeout(() => onDebounced(value), delayMs)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
}
