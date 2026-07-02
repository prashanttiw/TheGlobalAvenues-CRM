import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { GripVertical, Pencil, Plus, Trash, X } from 'lucide-react'
import {
  type CustomFieldDefinition,
  createAdminCustomFieldDefinition,
  deleteAdminCustomFieldDefinition,
  fetchAdminCustomFieldDefinitions,
  reorderAdminCustomFieldDefinitions,
  updateAdminCustomFieldDefinition,
} from '../../../lib/api'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { InlineActions } from '../ui/InlineActions'
import { EmptyState } from '../ui/EmptyState'
import { Modal, ModalAction, ModalCancel, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from '../ui/Modal'

const FIELD_TYPES: { value: CustomFieldDefinition['field_type']; label: string }[] = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown Choice' },
  { value: 'file', label: 'File Upload' },
]

const EMPTY_FORM = { pid: null as string | null, label: '', field_type: 'text' as CustomFieldDefinition['field_type'], options: [] as string[], is_required: false }

function SortableRow({ definition, onEdit, onDelete, onToggleActive }: {
  definition: CustomFieldDefinition
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: definition.public_id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 rounded-lg border border-border-warm bg-surface-warm/40"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-brand-navy shrink-0" title="Drag to reorder">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-brand-navy">{definition.label}</p>
          <Badge variant="outline">{FIELD_TYPES.find((t) => t.value === definition.field_type)?.label ?? definition.field_type}</Badge>
          {definition.is_required && <Badge variant="secondary">Required</Badge>}
          {!definition.is_active && <Badge variant="outline">Inactive</Badge>}
        </div>
        {definition.field_type === 'select' && definition.options && (
          <p className="text-xs text-muted-foreground mt-1">Options: {definition.options.map((o) => o.label).join(', ')}</p>
        )}
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <InlineActions
          actions={[
            { label: 'Edit', icon: Pencil, onClick: onEdit },
            { label: definition.is_active ? 'Deactivate' : 'Activate', icon: Pencil, onClick: onToggleActive },
            { label: 'Delete', icon: Trash, onClick: onDelete, variant: 'danger' },
          ]}
        />
      </div>
    </div>
  )
}

export function CustomFieldsManagerPanel() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = React.useState(false)
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [optionDraft, setOptionDraft] = React.useState('')
  const [deleteTarget, setDeleteTarget] = React.useState<CustomFieldDefinition | null>(null)
  const [orderedIds, setOrderedIds] = React.useState<string[]>([])

  const definitionsQuery = useQuery({
    queryKey: ['admin', 'student-custom-field-definitions'],
    queryFn: fetchAdminCustomFieldDefinitions,
    staleTime: 10_000,
  })

  const definitions = definitionsQuery.data ?? []

  React.useEffect(() => {
    setOrderedIds(definitions.map((d) => d.public_id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definitionsQuery.data])

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin', 'student-custom-field-definitions'] })

  const createMutation = useMutation({
    mutationFn: (payload: { label: string; field_type: CustomFieldDefinition['field_type']; options?: string[]; is_required: boolean }) =>
      createAdminCustomFieldDefinition(payload),
    onSuccess: () => { toast.success('Field created.'); closeForm(); invalidate() },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to create field.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ pid, payload }: { pid: string; payload: Record<string, unknown> }) => updateAdminCustomFieldDefinition(pid, payload),
    onSuccess: () => invalidate(),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to update field.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAdminCustomFieldDefinition,
    onSuccess: () => { toast.success('Field deleted.'); setDeleteTarget(null); invalidate() },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to delete field.'),
  })

  const reorderMutation = useMutation({
    mutationFn: reorderAdminCustomFieldDefinitions,
    onSuccess: () => invalidate(),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to save the new order.'),
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function closeForm() {
    setFormOpen(false)
    setForm(EMPTY_FORM)
    setOptionDraft('')
  }

  function openEditForm(definition: CustomFieldDefinition) {
    setForm({
      pid: definition.public_id,
      label: definition.label,
      field_type: definition.field_type,
      options: definition.options?.map((o) => o.label) ?? [],
      is_required: definition.is_required,
    })
    setFormOpen(true)
  }

  function addOption() {
    const value = optionDraft.trim()
    if (!value) return
    setForm((current) => ({ ...current, options: [...current.options, value] }))
    setOptionDraft('')
  }

  function removeOption(index: number) {
    setForm((current) => ({ ...current, options: current.options.filter((_, i) => i !== index) }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.label.trim()) {
      toast.error('Label is required.')
      return
    }
    if (form.field_type === 'select' && form.options.length === 0) {
      toast.error('Add at least one option for a dropdown field.')
      return
    }

    const payload = {
      label: form.label.trim(),
      field_type: form.field_type,
      options: form.field_type === 'select' ? form.options : undefined,
      is_required: form.is_required,
    }

    if (form.pid) {
      updateMutation.mutate({ pid: form.pid, payload }, { onSuccess: () => { toast.success('Field updated.'); closeForm() } })
    } else {
      createMutation.mutate(payload)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = orderedIds.indexOf(String(active.id))
    const newIndex = orderedIds.indexOf(String(over.id))
    const next = arrayMove(orderedIds, oldIndex, newIndex)
    setOrderedIds(next)
    reorderMutation.mutate(next.map((public_id, index) => ({ public_id, display_order: index })))
  }

  const orderedDefinitions = orderedIds
    .map((id) => definitions.find((d) => d.public_id === id))
    .filter((d): d is CustomFieldDefinition => !!d)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Fields defined here appear in every student's dashboard for them to fill in, and show up on each student's detail page.
        </p>
        <Button size="sm" variant="primary" onClick={() => { setForm(EMPTY_FORM); setFormOpen(true) }}>
          <Plus className="mr-1.5 h-4 w-4" /> Add Field
        </Button>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-xl border border-brand-orange-accessible/40 bg-brand-orange-accessible/5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-brand-navy">{form.pid ? 'Edit Field' : 'New Field'}</h4>
            <button type="button" onClick={closeForm} className="text-muted-foreground hover:text-brand-navy">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-brand-navy block mb-1">Label</label>
            <input
              autoFocus
              type="text"
              value={form.label}
              onChange={(e) => setForm((current) => ({ ...current, label: e.target.value }))}
              placeholder="e.g. Emergency Contact Name"
              className="w-full px-3.5 py-2.5 bg-surface-card border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Field Type</label>
              <select
                value={form.field_type}
                onChange={(e) => setForm((current) => ({ ...current, field_type: e.target.value as CustomFieldDefinition['field_type'] }))}
                className="w-full px-3.5 py-2.5 bg-surface-card border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              >
                {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-2.5">
              <label className="flex items-center gap-2 text-sm text-brand-navy">
                <input
                  type="checkbox"
                  checked={form.is_required}
                  onChange={(e) => setForm((current) => ({ ...current, is_required: e.target.checked }))}
                />
                Required
              </label>
            </div>
          </div>

          {form.field_type === 'select' && (
            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Choices</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={optionDraft}
                  onChange={(e) => setOptionDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption() } }}
                  placeholder="Type a choice and press Enter"
                  className="flex-1 px-3.5 py-2 bg-surface-card border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
                />
                <Button type="button" variant="secondary" size="sm" onClick={addOption}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.options.map((opt, index) => (
                  <span key={`${opt}-${index}`} className="inline-flex items-center gap-1 text-xs bg-surface-card border border-border-warm rounded-full px-2.5 py-1 text-brand-navy">
                    {opt}
                    <button type="button" onClick={() => removeOption(index)} className="text-muted-foreground hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={closeForm}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" disabled={createMutation.isPending || updateMutation.isPending}>
              {form.pid ? 'Save Changes' : 'Create Field'}
            </Button>
          </div>
        </form>
      )}

      {definitionsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading fields…</p>
      ) : orderedDefinitions.length === 0 ? (
        <EmptyState heading="No custom fields yet" description="Add a field above to start collecting extra information from students." />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {orderedDefinitions.map((definition) => (
                <SortableRow
                  key={definition.public_id}
                  definition={definition}
                  onEdit={() => openEditForm(definition)}
                  onDelete={() => setDeleteTarget(definition)}
                  onToggleActive={() => updateMutation.mutate({ pid: definition.public_id, payload: { is_active: !definition.is_active } })}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Modal open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Delete "{deleteTarget?.label}"?</ModalTitle>
            <ModalDescription>
              Students will no longer see this field, but any values already submitted for it stay on record. This cannot be undone.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <ModalCancel />
            <ModalAction variant="danger" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.public_id)}>
              Delete Field
            </ModalAction>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
