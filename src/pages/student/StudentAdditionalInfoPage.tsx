import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileCheck, ListPlus } from 'lucide-react'
import {
  type CustomFieldValueRow,
  fetchStudentCustomFields,
  submitStudentCustomFieldValue,
  uploadStudentCustomFieldFile,
} from '../../lib/api'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardContent } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { FileUpload } from '../../shared/components/ui/FileUpload'

function FieldInput({ field, value, onChange }: { field: CustomFieldValueRow; value: string; onChange: (v: string) => void }) {
  if (field.field_type === 'textarea') {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
      />
    )
  }

  if (field.field_type === 'select') {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
      >
        <option value="">Select…</option>
        {(field.options ?? []).map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    )
  }

  return (
    <input
      type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
    />
  )
}

function FileFieldSlot({ field, onUpload, uploading }: { field: CustomFieldValueRow; onUpload: (file: File) => void; uploading: boolean }) {
  const [replacing, setReplacing] = React.useState(false)

  if (field.file && !replacing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="text-sm text-emerald-800 truncate flex-1">{field.file.display_filename}</span>
          <button type="button" className="text-[11px] text-brand-orange-accessible font-semibold shrink-0" onClick={() => setReplacing(true)}>
            Replace
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <FileUpload maxSizeMB={10} onFileSelect={(file) => { onUpload(file); setReplacing(false) }} />
      {uploading && <p className="text-[11px] text-muted-foreground">Uploading…</p>}
    </div>
  )
}

export default function StudentAdditionalInfoPage() {
  const queryClient = useQueryClient()
  const [values, setValues] = React.useState<Record<string, string>>({})
  const [uploadingPid, setUploadingPid] = React.useState<string | null>(null)

  const fieldsQuery = useQuery({
    queryKey: ['student', 'custom-fields'],
    queryFn: fetchStudentCustomFields,
  })

  React.useEffect(() => {
    if (!fieldsQuery.data) return
    const next: Record<string, string> = {}
    for (const field of fieldsQuery.data) {
      next[field.definition_public_id] = field.value_text ?? ''
    }
    setValues(next)
  }, [fieldsQuery.data])

  const saveMutation = useMutation({
    mutationFn: async (fields: CustomFieldValueRow[]) => {
      await Promise.all(
        fields
          .filter((f) => f.field_type !== 'file')
          .map((f) => submitStudentCustomFieldValue(f.definition_public_id, values[f.definition_public_id] ?? '')),
      )
    },
    onSuccess: () => {
      toast.success('Saved.')
      void queryClient.invalidateQueries({ queryKey: ['student', 'custom-fields'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to save.'),
  })

  const uploadMutation = useMutation({
    mutationFn: ({ definitionPublicId, file }: { definitionPublicId: string; file: File }) => uploadStudentCustomFieldFile(definitionPublicId, file),
    onMutate: ({ definitionPublicId }) => setUploadingPid(definitionPublicId),
    onSuccess: () => {
      toast.success('File uploaded.')
      void queryClient.invalidateQueries({ queryKey: ['student', 'custom-fields'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to upload file.'),
    onSettled: () => setUploadingPid(null),
  })

  const fields = fieldsQuery.data ?? []
  const nonFileFields = fields.filter((f) => f.field_type !== 'file')

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title="Additional Information"
        subtitle="Extra details your consultancy has asked you to fill in. This is optional and won't block your applications."
      />

      {fieldsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : fields.length === 0 ? (
        <EmptyState
          icon={ListPlus}
          heading="Nothing to fill in yet"
          description="Your consultancy hasn't requested any additional information. Check back later."
        />
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-6">
            {fields.map((field) => (
              <div key={field.definition_public_id}>
                <label className="text-xs font-semibold text-brand-navy block mb-1.5">
                  {field.label}
                  {field.is_required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.field_type === 'file' ? (
                  <FileFieldSlot
                    field={field}
                    uploading={uploadingPid === field.definition_public_id}
                    onUpload={(file) => uploadMutation.mutate({ definitionPublicId: field.definition_public_id, file })}
                  />
                ) : (
                  <FieldInput
                    field={field}
                    value={values[field.definition_public_id] ?? ''}
                    onChange={(v) => setValues((current) => ({ ...current, [field.definition_public_id]: v }))}
                  />
                )}
              </div>
            ))}

            {nonFileFields.length > 0 && (
              <div className="pt-4 border-t border-border-warm flex justify-end">
                <Button variant="primary" onClick={() => saveMutation.mutate(fields)} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving…' : 'Save'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  )
}
