import * as React from 'react';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../shared/components/layout/PageHeader';
import { PageWrapper } from '../../shared/components/layout/PageWrapper';
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable';
import { StatusBadge, type StatusType } from '../../shared/components/ui/Badge';
import { StatCard } from '../../shared/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card';
import { DollarSign, User, Globe, Calendar, Clock, CheckCircle, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAgentCommissions, fetchAgentCommissionsSummary } from '../../lib/api';

export default function AgentCommissionsPage() {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [meta, setMeta] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  async function loadCommissionsData() {
    try {
      setLoading(true);
      const [listResult, summaryResult] = await Promise.all([
        fetchAgentCommissions({ page, status: statusFilter }),
        fetchAgentCommissionsSummary()
      ]);
      setCommissions(listResult.commissions);
      setMeta(listResult.meta);
      setSummary(summaryResult);
    } catch (err) {
      toast.error('Failed to load commissions information.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCommissionsData();
  }, [page, statusFilter]);

  const mapStatusToBadge = (status: string): StatusType => {
    switch (status) {
      case 'paid': return 'approved';      // green
      case 'confirmed': return 'approved'; // blue (using approved)
      case 'pending': return 'pending';    // amber
      default: return 'pending';
    }
  };

  const directColumns: ColumnDef<any>[] = [
    {
      key: 'student',
      header: 'Student',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy flex items-center gap-1">
            <User className="h-3 w-3 text-muted-foreground" />
            {row.student_name}
          </p>
          <div className="flex gap-1.5 items-center mt-1">
            <p className="text-[10px] text-muted-foreground">ID: {row.student_public_id}</p>
            {row.is_student_reassigned && (
              <span className="inline-flex items-center gap-0.5 rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-red-700">
                <AlertTriangle className="h-2 w-2" /> Reassigned
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (row) => (
        <div>
          <span className="font-bold text-brand-navy">
            {row.currency === 'INR' ? '₹' : row.currency} {row.amount.toLocaleString()}
          </span>
          {row.percentage && (
            <span className="text-xs text-muted-foreground ml-1">({row.percentage}%)</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        // Custom badge for Confirmed (since approved is used for confirmed/paid)
        if (row.status === 'confirmed') {
          return (
            <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700">
              Confirmed
            </span>
          );
        }
        if (row.status === 'paid') {
          return (
            <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700">
              Paid
            </span>
          );
        }
        return <StatusBadge status="pending" />;
      },
    },
    {
      key: 'date',
      header: 'Created Date',
      cell: (row) => (
        <span className="flex items-center text-xs text-muted-foreground">
          <Calendar className="mr-1 h-3.5 w-3.5" />
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      cell: (row) => <span className="text-xs text-muted-foreground">{row.notes || '-'}</span>,
    },
  ];

  const subAgentColumns: ColumnDef<any>[] = [
    {
      key: 'agent',
      header: 'Sub-Agent / Agency',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy">{row.full_name}</p>
          <p className="text-xs text-muted-foreground">{row.agency_name || 'No Agency'}</p>
        </div>
      ),
    },
    {
      key: 'tier',
      header: 'Tier',
      cell: (row) => (
        <span className="text-[10px] uppercase font-bold text-brand-navy bg-brand-navy/10 px-2 py-0.5 rounded">
          {row.tier === 2 ? 'Sub-Agent (L2)' : 'Sub-Sub-Agent (L3)'}
        </span>
      ),
    },
    {
      key: 'pending',
      header: 'Pending Override',
      cell: (row) => <span className="text-sm text-gray-500">₹{row.pending.toLocaleString()}</span>,
    },
    {
      key: 'confirmed',
      header: 'Confirmed Override',
      cell: (row) => <span className="text-sm font-semibold text-blue-600">₹{row.confirmed.toLocaleString()}</span>,
    },
    {
      key: 'paid',
      header: 'Paid Override',
      cell: (row) => <span className="text-sm font-semibold text-emerald-600">₹{row.paid.toLocaleString()}</span>,
    },
    {
      key: 'records',
      header: 'Commission Records',
      cell: (row) => <span className="text-xs text-muted-foreground">{row.total_records} claims</span>,
    },
  ];

  return (
    <PageWrapper className="space-y-8">
      <PageHeader
        title="Agency Commissions Ledger" 
        subtitle="Manage and view your direct commissions alongside B2B override summaries in your subtree network." 
      />

      {/* Metrics Summary Row */}
      {summary && (
        <div className="grid gap-6 md:grid-cols-3">
          <StatCard 
            label="Pending Total" 
            value={`₹${summary.own.pending_inr.toLocaleString()}`} 
            icon={Clock} 
            color="amber"
          />
          <StatCard 
            label="Confirmed Earnings" 
            value={`₹${summary.own.confirmed_inr.toLocaleString()}`} 
            icon={CheckCircle} 
            color="blue"
          />
          <StatCard 
            label="Total Paid" 
            value={`₹${summary.own.paid_inr.toLocaleString()}`} 
            icon={DollarSign} 
            color="green"
          />
        </div>
      )}

      {/* Direct Placement Commissions */}
      <Card>
        <CardHeader className="border-b border-border-warm pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-base font-semibold text-brand-navy">Direct Placement Commissions</CardTitle>
            <p className="text-xs text-muted-foreground">Commission records directly owned by your agency. Grouped in local currency (INR).</p>
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="paid">Paid</option>
          </select>
        </CardHeader>
        <CardContent className="mt-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
            </div>
          ) : (
            <>
              <DataTable 
                columns={directColumns}
                data={commissions}
                emptyMessage="No direct placement commission records found."
              />

              {meta && meta.total_pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-gray-500">
                    Page {page} of {meta.total_pages} (Total: {meta.total})
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={page >= meta.total_pages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Sub-Agent Breakdown (Overrides) */}
      <Card>
        <CardHeader className="border-b border-border-warm pb-4">
          <CardTitle className="text-base font-semibold text-brand-navy flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-brand-navy" />
            Sub-Agent Override Performance (Subtree network)
          </CardTitle>
          <p className="text-xs text-muted-foreground">Earnings performance overview of sub-agents in your subtree network. Shown for information purposes.</p>
        </CardHeader>
        <CardContent className="mt-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
            </div>
          ) : (
            <DataTable 
              columns={subAgentColumns}
              data={summary?.sub_agents || []}
              emptyMessage="No sub-agent override records reported."
            />
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
