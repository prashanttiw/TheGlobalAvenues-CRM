import * as React from 'react'
import { toast } from 'sonner'
import { Loader2, Pencil } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { CountrySelect } from './CountrySelect'

interface SelectOption {
  value: string
  label: string
}

interface EditableFieldProps {
  value: string
  onSave: (value: string) => Promise<void>
  type?: 'text' | 'textarea' | 'select' | 'country'
  options?: SelectOption[]
  placeholder?: string
  emptyLabel?: string
  className?: string
  displayClassName?: string
  render?: (value: string) => React.ReactNode
}

const inputClass =
  'w-full px-2 py-1 bg-surface-card border border-brand-orange-accessible rounded-md text-sm text-brand-navy focus:outline-none'

export function EditableField({
  value,
  onSave,
  type = 'text',
  options = [],
  placeholder,
  emptyLabel = 'Not set',
  className,
  displayClassName,
  render,
}: EditableFieldProps) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(value)
  const [saving, setSaving] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  React.useEffect(() => {
    setDraft(value)
  }, [value])

  React.useEffect(() => {
    if (editing && (type === 'text' || type === 'textarea')) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing, type])

  async function commit(newValue: string) {
    if (newValue === value) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(newValue)
      setEditing(false)
    } catch (error) {
      setDraft(value)
      toast.error(error instanceof Error ? error.message : 'Failed to save change.')
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    setDraft(value)
    setEditing(false)
  }

  if (saving) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-sm text-muted-foreground', className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Saving…
      </span>
    )
  }

  if (!editing) {
    return (
      <button
        type="button"
        onDoubleClick={() => setEditing(true)}
        title="Double-click to edit"
        className={cn(
          'group inline-flex items-center gap-1.5 text-left rounded px-1 -mx-1 hover:bg-brand-orange-accessible/5 cursor-text',
          className
        )}
      >
        <span className={cn(!value && 'text-muted-foreground italic', displayClassName)}>
          {value && render ? render(value) : value || emptyLabel}
        </span>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </button>
    )
  }

  if (type === 'select') {
    return (
      <select
        autoFocus
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          void commit(e.target.value)
        }}
        onBlur={cancel}
        className={inputClass}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    )
  }

  if (type === 'country') {
    return (
      <CountrySelect
        value={draft}
        onChange={(v) => {
          setDraft(v)
          void commit(v)
        }}
        autoFocus
      />
    )
  }

  if (type === 'textarea') {
    return (
      <div className="space-y-1.5">
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancel()
          }}
          placeholder={placeholder}
          rows={4}
          className={inputClass}
        />
        <div className="flex gap-2">
          <button type="button" onClick={() => commit(draft)} className="text-xs font-semibold text-brand-orange-accessible">
            Save
          </button>
          <button type="button" onClick={cancel} className="text-xs text-muted-foreground">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          void commit(draft)
        } else if (e.key === 'Escape') {
          cancel()
        }
      }}
      onBlur={() => commit(draft)}
      placeholder={placeholder}
      className={inputClass}
    />
  )
}
