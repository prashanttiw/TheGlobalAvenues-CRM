import * as React from 'react'
import { useEffect, useState } from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import { InlineActions } from '../../shared/components/ui/InlineActions'
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card'
import { SlideOverPanel } from '../../shared/components/ui/SlideOverPanel'
import { SearchInput } from '../../shared/components/ui/SearchInput'
import { Button } from '../../shared/components/ui/Button'
import { DollarSign, Check, Trash2, Edit, ArrowLeft, ArrowRight, Calendar, Coins } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { usePermission } from '../../hooks/usePermission'
import { 
  fetchAdminCommissions, 
  fetchAdminCommissionsSummary, 
  fetchAdminAgents, 
  confirmCommission, 
  payCommission, 
  deleteCommission, 
  editCommission
} from '../../lib/api'

export default function AdminCommissionsPage() {
  const [commissions, setCommissions] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [agents, setAgents] = useState<any[]>([])
  
  const [agentFilter, setAgentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [fromFilter, setFromFilter] = useState('')
  const [toFilter, setToFilter] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const [editingCommission, setEditingCommission] = useState<any>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    amount: 0,
    percentage: '',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const canApprove = usePermission('commissions', 'approve')
  const canEdit = usePermission('commissions', 'edit')

  // Load basic helpers (agents and summary stats) on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [summaryData, agentsData] = await Promise.all([
          fetchAdminCommissionsSummary(),
          fetchAdminAgents({ perPage: 100 })
        ])
        setSummary(summaryData)
        setAgents(agentsData.agents || [])
      } catch (err) {
        console.error('Failed to load initial metadata:', err)
        toast.error('Failed to load dashboard summaries or agents list.')
      }
    }
    void loadInitialData()
  }, [])

  // Load commissions list on query dependencies changes
  const loadCommissions = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchAdminCommissions({
        page,
        perPage: 15,
        status: statusFilter || undefined,
        agentPid: agentFilter || undefined,
        from: fromFilter || undefined,
        to: toFilter || undefined,
        search: debouncedSearch || undefined
      })
      setCommissions(result.commissions)
      setMeta(result.meta)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch commissions ledger.')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, agentFilter, fromFilter, toFilter, debouncedSearch])

  useEffect(() => {
    void loadCommissions()
  }, [loadCommissions])

  // Reload stats summary helper
  const reloadSummary = async () => {
    try {
      const summaryData = await fetchAdminCommissionsSummary()
      setSummary(summaryData)
    } catch (err) {
      console.error('Failed to reload summaries:', err)
    }
  }

  // Row operations
  const handleConfirm = async (pid: string) => {
    try {
      const result = await confirmCommission(pid)
      toast.success(result.message || 'Commission confirmed successfully.')
      void loadCommissions()
      void reloadSummary()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to confirm commission.')
    }
  }

  const handlePay = async (pid: string) => {
    try {
      const result = await payCommission(pid)
      toast.success(result.message || 'Commission status marked as paid.')
      void loadCommissions()
      void reloadSummary()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment.')
    }
  }

  const handleDelete = async (pid: string) => {
    try {
      const result = await deleteCommission(pid)
      toast.success(result.message || 'Commission claim deleted successfully.')
      void loadCommissions()
      void reloadSummary()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete commission.')
    }
  }

  const openEditPanel = (commission: any) => {
    setEditingCommission(commission)
    setEditForm({
      amount: commission.amount,
      percentage: commission.percentage !== null && commission.percentage !== undefined ? String(commission.percentage) : '',
      notes: commission.notes || ''
    })
    setIsEditOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCommission) return

    if (editingCommission.status !== 'pending') {
      toast.error('Only pending commission records can be edited.')
      return
    }

    try {
      setSubmitting(true)
      const pct = editForm.percentage.trim() === '' ? undefined : parseFloat(editForm.percentage)
      
      await editCommission(editingCommission.public_id, {
        amount: editForm.amount,
        percentage: pct,
        notes: editForm.notes
      })
      
      toast.success('Commission updated successfully.')
      setIsEditOpen(false)
      setEditingCommission(null)
      void loadCommissions()
      void reloadSummary()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update commission.')
    } finally {
      setSubmitting(false)
    }
  }

  const columns: ColumnDef<any>[] = [
    {
      key: 'agent',
      header: 'Agent / Agency',
      cell: (row) => (
        <div>
          <span className="font-semibold text-brand-navy block">{row.agent_name}</span>
          <span className="text-[10px] text-muted-foreground uppercase bg-surface-warm px-1.5 py-0.5 rounded">
            Tier: {row.agent_tier}
          </span>
        </div>
      ),
    },
    {
      key: 'student',
      header: 'Student / Application',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy">{row.student_name}</p>
          <p className="text-xs text-muted-foreground">
            Ref: {row.reference_number} · ID: {row.application_public_id?.substring(0, 8)}
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Reward Value',
      cell: (row) => (
        <div>
          <span className="font-bold text-brand-navy block">
            {row.currency === 'INR' ? '₹' : row.currency}
            {row.amount.toLocaleString()}
          </span>
          {row.percentage !== null && row.percentage !== undefined && (
            <span className="text-[10px] text-muted-foreground block bg-brand-navy/5 px-1 py-0.5 rounded w-max mt-0.5">
              Rate: {row.percentage}%
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'date',
      header: 'Created On',
      cell: (row) => <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</span>,
    },
    {
      key: 'notes',
      header: 'Notes & Audits',
      cell: (row) => (
        <div className="max-w-[200px] text-xs text-muted-foreground text-left" title={row.notes || 'No notes'}>
          <p className="italic line-clamp-2">{row.notes || '-'}</p>
          <div className="flex gap-2 flex-wrap mt-1">
            {row.created_by_name && (
              <span className="text-[9px] bg-gray-100 text-gray-700 px-1 py-0.2 rounded font-mono">
                By: {row.created_by_name}
              </span>
            )}
            {row.paid_by_name && (
              <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded font-mono">
                Payer: {row.paid_by_name}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => {
        const isPending = row.status === 'pending';
        const isConfirmed = row.status === 'confirmed';
        
        const actions = [];
        
        if (isPending) {
          if (canApprove) {
            actions.push({
              label: 'Approve & Confirm',
              icon: Check,
              onClick: () => handleConfirm(row.public_id)
            });
          }
          if (canEdit) {
            actions.push({
              label: 'Edit',
              icon: Edit,
              onClick: () => openEditPanel(row)
            });
            actions.push({
              label: 'Delete Claim',
              icon: Trash2,
              variant: 'danger' as const,
              onClick: () => {
                if (confirm('Are you sure you want to delete this pending commission record?')) {
                  handleDelete(row.public_id);
                }
              }
            });
          }
        } else if (isConfirmed) {
          if (canApprove) {
            actions.push({
              label: 'Disburse Payment',
              icon: DollarSign,
              onClick: () => handlePay(row.public_id)
            });
          }
        }
        
        if (actions.length === 0) {
          return <span className="text-xs text-muted-foreground/60 italic font-mono">locked (read-only)</span>;
        }

        return (
          <div onClick={(e) => e.stopPropagation()}>
            <InlineActions actions={actions} />
          </div>
        );
      },
    },
  ]

  const isFormDisabled = editingCommission ? editingCommission.status !== 'pending' : true;

  return (
    <PageWrapper className="space-y-6">
      <Toaster position="top-center" richColors />
      <PageHeader 
        title="Commissions Ledger" 
        subtitle="Approve and disburse B2B agent referral rewards and overriding hierarchical commissions."
      />

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-amber-900">Pending Claims</CardTitle>
            <span className="text-xs bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full font-bold">
              {summary?.pending_count || 0} claims
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-900">
              ₹{summary?.pending_total_inr?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-amber-700/80 mt-1">Awaiting verification audits</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-blue-900">Confirmed (Approved)</CardTitle>
            <span className="text-xs bg-blue-200 text-blue-900 px-2.5 py-0.5 rounded-full font-bold">
              {summary?.confirmed_count || 0} claims
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-900">
              ₹{summary?.confirmed_total_inr?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-blue-700/80 mt-1">Validated, ready for payout</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-900">Disbursed (Paid)</CardTitle>
            <span className="text-xs bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full font-bold">
              {summary?.paid_count || 0} claims
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-900">
              ₹{summary?.paid_total_inr?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-emerald-700/80 mt-1">Settled agent network rewards</p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filter Options */}
      <div className="bg-surface-card p-4 rounded-xl border border-border-warm space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-navy flex items-center gap-1.5">
          <Coins className="h-4 w-4 text-brand-orange-accessible" /> Search & Ledger Filter
        </h4>
        <SearchInput
          value={search}
          onChange={setSearch}
          isLoading={loading}
          placeholder="Search by agent, agency, student, or reference #…"
          className="max-w-sm"
        />
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-brand-navy">Agent / Agency</label>
            <select 
              value={agentFilter}
              onChange={(e) => {
                setAgentFilter(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
            >
              <option value="">All Agent Partners</option>
              {agents.map((agent) => (
                <option key={agent.public_id} value={agent.public_id}>
                  {agent.agency_name || agent.full_name} ({agent.tier})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-brand-navy">Status</label>
            <select 
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending Claim</option>
              <option value="confirmed">Confirmed</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-brand-navy">Created From</label>
            <input 
              type="date"
              value={fromFilter}
              onChange={(e) => {
                setFromFilter(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-brand-navy">Created To</label>
            <input 
              type="date"
              value={toFilter}
              onChange={(e) => {
                setToFilter(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
            />
          </div>
        </div>

        {(agentFilter || statusFilter || fromFilter || toFilter || search) && (
          <div className="flex justify-end pt-1">
            <Button
              variant="secondary"
              onClick={() => {
                setAgentFilter('')
                setStatusFilter('')
                setFromFilter('')
                setToFilter('')
                setSearch('')
                setDebouncedSearch('')
                setPage(1)
              }}
            >
              Reset Filters
            </Button>
          </div>
        )}
      </div>

      {/* Main Ledger Table */}
      <DataTable 
        columns={columns} 
        data={commissions}
        isLoading={loading}
        emptyMessage="No commission records match your current filter settings."
      />

      {/* Custom Paginator Footer */}
      {!loading && meta && meta.total_pages > 1 && (
        <div className="flex items-center justify-between border-t border-border-warm pt-4">
          <p className="text-xs text-muted-foreground">
            Showing page <span className="font-semibold text-brand-navy">{page}</span> of{' '}
            <span className="font-semibold text-brand-navy">{meta.total_pages}</span> ({meta.total} total items)
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" /> Previous
            </Button>
            <Button 
              variant="outline" 
              disabled={page >= meta.total_pages}
              onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-1"
            >
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Slide-over panel for editing pending commissions */}
      <SlideOverPanel 
        title="Edit Commission Record" 
        open={isEditOpen} 
        onOpenChange={(open) => !open && setIsEditOpen(false)}
      >
        <form onSubmit={handleEditSubmit} className="space-y-6">
          {!isFormDisabled ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg flex items-start gap-2">
              <span className="font-bold shrink-0">Note:</span>
              <span>Only pending commission claims can be modified. Once confirmed, changes are permanently locked by DB immutability triggers.</span>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-lg flex items-start gap-2">
              <span className="font-bold shrink-0">Locked:</span>
              <span>This commission is in status {editingCommission?.status}. Under database trigger policies (SD-P5-01), confirmed and paid commission entries are completely immutable and cannot be updated.</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Commission Amount (INR)</label>
              <input 
                type="number" 
                required
                min="1"
                disabled={isFormDisabled}
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Commission Rate / Percentage (%) (Optional)</label>
              <input 
                type="number" 
                min="0"
                max="100"
                step="0.01"
                disabled={isFormDisabled}
                placeholder="e.g. 10"
                value={editForm.percentage}
                onChange={(e) => setEditForm({ ...editForm, percentage: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Internal Notes & Audit Justification</label>
              <textarea 
                required
                rows={4}
                disabled={isFormDisabled}
                placeholder="Provide a rationale for changes or payment context details..."
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-border-warm flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              type="submit" 
              disabled={isFormDisabled || submitting}
            >
              {submitting ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </SlideOverPanel>
    </PageWrapper>
  )
}

