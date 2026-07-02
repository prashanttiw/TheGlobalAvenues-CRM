import * as React from 'react'
import { FileCheck } from 'lucide-react'
import { FileUpload } from '../ui/FileUpload'
import type { DocSlot } from '../../constants/readiness'

export function DocumentSlot({
  slot,
  existing,
  onUpload,
  uploading,
}: {
  slot: DocSlot
  existing?: { file_public_id: string; display_filename: string }
  onUpload: (category: string, file: File) => void
  uploading: boolean
}) {
  const [replacing, setReplacing] = React.useState(false)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-brand-navy">
          {slot.label}
          {slot.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {existing && !replacing && (
          <button type="button" className="text-[11px] text-brand-orange-accessible font-semibold" onClick={() => setReplacing(true)}>
            Replace
          </button>
        )}
      </div>
      {slot.hint && <p className="text-[11px] text-muted-foreground">{slot.hint}</p>}
      {existing && !replacing ? (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="text-sm text-emerald-800 truncate">{existing.display_filename}</span>
        </div>
      ) : (
        <FileUpload
          maxSizeMB={10}
          onFileSelect={(file) => {
            onUpload(slot.category, file)
            setReplacing(false)
          }}
        />
      )}
      {uploading && <p className="text-[11px] text-muted-foreground">Uploading…</p>}
    </div>
  )
}
