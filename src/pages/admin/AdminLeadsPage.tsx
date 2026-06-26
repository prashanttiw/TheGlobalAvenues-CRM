import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardContent } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { Calendar, Globe, CheckCircle2, Activity, AlertTriangle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'

interface Lead {
  public_id: string
  full_name: string
  email?: string
  phone?: string
  source_url: string
  utm_source: string
  country_interest: string
  assigned_to: string
  created_at: string
  updated_at: string
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'dropped'
  is_duplicate?: boolean
}

const ACTIVE_COLUMNS: Lead['status'][] = ['new', 'contacted', 'qualified']
const ALL_COLUMNS: Lead['status'][] = ['new', 'contacted', 'qualified', 'converted', 'dropped']

interface SortableLeadCardProps {
  lead: Lead
  onConvert: (lead: Lead) => void
  isConverting: boolean
  isDuplicate: boolean
}

function SortableLeadCard({ lead, onConvert, isConverting, isDuplicate }: SortableLeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.public_id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const daysStale = Math.floor((Date.now() - new Date(lead.updated_at || lead.created_at).getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none cursor-grab active:cursor-grabbing">
      <Card className={`hover:shadow-card transition-shadow pointer-events-auto ${isDuplicate ? 'border-amber-300 bg-amber-50' : ''}`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase text-brand-orange-accessible bg-brand-orange-accessible/10 px-2 py-0.5 rounded">
              {lead.utm_source || 'Organic'}
            </span>
            <div className="flex items-center gap-2">
              {daysStale > 2 && lead.status !== 'converted' && lead.status !== 'dropped' && (
                <span className="flex items-center text-[10px] text-red-600 bg-red-100 px-1.5 py-0.5 rounded font-bold" title={`${daysStale} days idle in this status`}>
                  <Clock className="w-3 h-3 mr-1" /> {daysStale}d
                </span>
              )}
              {isDuplicate && (
                <span className="text-amber-600" title="Email or phone matches another record">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              )}
            </div>
          </div>

          <h4 className="font-semibold text-brand-navy text-sm truncate">{lead.full_name}</h4>

          <div className="space-y-1.5 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 truncate">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Interest: {lead.country_interest || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Added: {new Date(lead.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {lead.status === 'qualified' && (
            <div className="pt-2 border-t border-border-warm" onPointerDown={e => e.stopPropagation()}>
              <Button 
                variant="primary" 
                size="sm" 
                className="w-full flex items-center justify-center gap-1.5"
                onClick={() => onConvert(lead)}
                isLoading={isConverting}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Convert
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Column({ id, title, leads, onConvert, convertingId, duplicateEmails }: { id: string, title: string, leads: Lead[], onConvert: (lead: Lead) => void, convertingId: string | null, duplicateEmails: Set<string> }) {
  const { setNodeRef } = useSortable({ id: `column-${id}` })

  return (
    <div ref={setNodeRef} className="bg-surface-warm p-4 rounded-xl border border-border-warm flex flex-col gap-4 min-w-[300px] max-w-[350px]">
      <div className="flex justify-between items-center pb-2 border-b border-border-warm shrink-0">
        <span className="font-display font-semibold text-brand-navy capitalize">{title}</span>
        <span className="text-xs font-semibold px-2 py-0.5 bg-brand-navy/5 text-brand-navy rounded-full">
          {leads.length}
        </span>
      </div>

      <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
        <SortableContext items={leads.map(l => l.public_id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <SortableLeadCard 
              key={lead.public_id} 
              lead={lead} 
              onConvert={onConvert} 
              isConverting={convertingId === lead.public_id}
              isDuplicate={!!lead.email && duplicateEmails.has(lead.email)}
            />
          ))}
        </SortableContext>
        
        {leads.length === 0 && (
          <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border-warm rounded-xl bg-white/40 h-full flex items-center justify-center">
            Drop leads here
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminLeadsPage() {
  const queryClient = useQueryClient()
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [convertingLead, setConvertingLead] = React.useState<Lead | null>(null)
  const [showArchive, setShowArchive] = React.useState(false)
  
  // Convert Form State
  const [convertForm, setConvertForm] = React.useState({ password: '', nationality: '', date_of_birth: '', agent_referral_code: '' })

  const { data: rawLeads = [], isLoading, isError } = useQuery({
    queryKey: ['admin', 'leads'],
    queryFn: () => api.get('/admin/leads').then(r => r.data.data as Lead[]),
    staleTime: 30_000
  })

  React.useEffect(() => {
    if (isError) toast.error('Failed to load leads')
  }, [isError])

  const [leads, setLeads] = React.useState<Lead[]>([])

  React.useEffect(() => {
    const visibleCols = showArchive ? ALL_COLUMNS : ACTIVE_COLUMNS
    setLeads(rawLeads.filter(l => visibleCols.includes(l.status)))
  }, [rawLeads, showArchive])

  const duplicateEmails = React.useMemo(() => {
    const counts: Record<string, number> = {}
    rawLeads.forEach(l => { if (l.email) counts[l.email] = (counts[l.email] || 0) + 1 })
    const dupes = new Set(Object.keys(counts).filter(k => counts[k] > 1))
    rawLeads.forEach(l => { if (l.is_duplicate) dupes.add(l.email!) })
    return dupes
  }, [rawLeads])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const statusMutation = useMutation({
    mutationFn: ({ pid, status }: { pid: string, status: string }) => api.put(`/admin/leads/${pid}/status`, { status }),
    onSuccess: () => {
      toast.success('Lead status updated')
      queryClient.invalidateQueries({ queryKey: ['admin', 'leads'] })
    },
    onError: () => toast.error('Failed to update lead status')
  })

  const convertMutation = useMutation({
    mutationFn: (payload: { pid: string, data: any }) => api.post(`/admin/leads/${payload.pid}/convert`, payload.data),
    onSuccess: () => {
      toast.success('Successfully converted to a CRM Student!')
      setConvertingLead(null)
      setConvertForm({ password: '', nationality: '', date_of_birth: '', agent_referral_code: '' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'leads'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to convert lead')
    }
  })

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    const activeLead = leads.find(l => l.public_id === activeId)
    if (!activeLead) return

    let targetStatus = activeLead.status
    if (overId.startsWith('column-')) {
      targetStatus = overId.replace('column-', '') as any
    } else {
      const overLead = leads.find(l => l.public_id === overId)
      if (overLead) targetStatus = overLead.status
    }

    const validCols = showArchive ? ALL_COLUMNS : ACTIVE_COLUMNS

    if (activeLead.status !== targetStatus && validCols.includes(targetStatus as any)) {
      setLeads(prev => prev.map(l => l.public_id === activeId ? { ...l, status: targetStatus as any } : l))
      statusMutation.mutate({ pid: activeId, status: targetStatus })
    }
  }

  const handleConvertSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!convertingLead) return
    convertMutation.mutate({ pid: convertingLead.public_id, data: convertForm })
  }

  const columnsToRender = showArchive ? ALL_COLUMNS : ACTIVE_COLUMNS

  return (
    <PageWrapper className="space-y-6">
      <PageHeader 
        title="Student Leads Pipeline" 
        subtitle="Manage prospective leads and convert them to system students." 
        action={
          <Button variant={showArchive ? 'primary' : 'outline'} onClick={() => setShowArchive(!showArchive)}>
            {showArchive ? 'Hide Archive' : 'View Archive'}
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center p-12"><Activity className="w-8 h-8 animate-spin text-brand-orange-accessible" /></div>
      ) : (
        <div className="flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-200px)]">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {columnsToRender.map((colName) => {
              const colLeads = leads.filter(ld => ld.status === colName)
              return (
                <Column 
                  key={colName} 
                  id={colName} 
                  title={colName} 
                  leads={colLeads} 
                  onConvert={setConvertingLead}
                  convertingId={convertingLead?.public_id || null}
                  duplicateEmails={duplicateEmails}
                />
              )
            })}

            <DragOverlay>
              {activeId ? (() => {
                const activeLead = leads.find(l => l.public_id === activeId)
                if (!activeLead) return null
                return (
                  <Card className="shadow-2xl pointer-events-none opacity-90 scale-105 rotate-2 cursor-grabbing">
                    <CardContent className="p-4 space-y-3">
                      <h4 className="font-semibold text-brand-navy text-sm truncate">{activeLead.full_name}</h4>
                      <div className="space-y-1.5 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5" />
                          <span>Interest: {activeLead.country_interest || 'N/A'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })() : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {convertingLead && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-brand-navy mb-1">Convert to Student</h3>
              <p className="text-sm text-muted-foreground mb-6">Enter registration details for {convertingLead.full_name}.</p>
              
              <form onSubmit={handleConvertSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-brand-navy block mb-1">Temporary Password *</label>
                  <input 
                    type="password" 
                    required 
                    className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-brand-orange-accessible focus:outline-none"
                    value={convertForm.password}
                    onChange={e => setConvertForm(f => ({ ...f, password: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-brand-navy block mb-1">Nationality</label>
                  <input 
                    type="text" 
                    className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-brand-orange-accessible focus:outline-none"
                    value={convertForm.nationality}
                    onChange={e => setConvertForm(f => ({ ...f, nationality: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-brand-navy block mb-1">Date of Birth</label>
                  <input 
                    type="date" 
                    className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-brand-orange-accessible focus:outline-none"
                    value={convertForm.date_of_birth}
                    onChange={e => setConvertForm(f => ({ ...f, date_of_birth: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-brand-navy block mb-1">Agent Referral Code (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. AGENT123"
                    className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-brand-orange-accessible focus:outline-none"
                    value={convertForm.agent_referral_code}
                    onChange={e => setConvertForm(f => ({ ...f, agent_referral_code: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <Button type="button" variant="outline" onClick={() => setConvertingLead(null)}>Cancel</Button>
                  <Button type="submit" variant="primary" isLoading={convertMutation.isPending}>Convert & Save</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </PageWrapper>
  )
}
