import * as React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../shared/components/layout/PageHeader';
import { PageWrapper } from '../../shared/components/layout/PageWrapper';
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card';
import { Button } from '../../shared/components/ui/Button';
import { EmptyState } from '../../shared/components/ui/EmptyState';
import { StatusBadge, type StatusType } from '../../shared/components/ui/Badge';
import { ActivityFeedWidget } from '../../shared/components/ui/ActivityFeedWidget';
import { RecentNoticesCard } from '../../shared/components/ui/RecentNoticesCard';
import { Users, CreditCard, ChevronRight, CheckCircle2, TrendingUp } from 'lucide-react';
import { fetchAgentDashboardSummary, fetchAgentCommissions, fetchAgentNoticesFeed } from '../../lib/api';
import { toast } from 'sonner';

export default function AgentDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [recentCommissions, setRecentCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [summary, commissionResult] = await Promise.all([
          fetchAgentDashboardSummary(),
          fetchAgentCommissions({ page: 1 }),
        ]);
        setData(summary);
        setRecentCommissions(commissionResult.commissions.slice(0, 5));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
        toast.error('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  if (loading) {
    return (
      <PageWrapper className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy mx-auto"></div>
          <p className="text-sm text-gray-500">Loading live dashboard metrics...</p>
        </div>
      </PageWrapper>
    );
  }

  if (error || !data) {
    return (
      <PageWrapper>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error || 'Dashboard summary unavailable.'}
        </div>
      </PageWrapper>
    );
  }

  const { students, commissions, team, agent } = data;

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title={`Welcome, ${agent.full_name}`} 
        subtitle={`${agent.agency_name} (Referral Code: ${agent.referral_code || 'Pending'}) · Tier ${agent.tier}`} 
      />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network Students</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy/5 text-brand-navy">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{students.total}</div>
            <p className="text-xs text-gray-500 mt-1">Total in your subtree hierarchy</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolled Students</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{students.enrolled}</div>
            <p className="text-xs text-gray-500 mt-1">{students.new} new · {students.in_progress} in progress</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{students.conversion_rate_pct}%</div>
            <p className="text-xs text-gray-500 mt-1">Registered-to-enrolled ratio</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Earned Commissions</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <CreditCard className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">₹{commissions.confirmed_inr.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">₹{commissions.pending_inr.toLocaleString()} pending · ₹{commissions.paid_inr.toLocaleString()} paid</p>
          </CardContent>
        </Card>
      </div>

      {(agent.tier === 1 || agent.tier === 2) && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm max-w-md">
          <h3 className="text-lg font-black text-gray-900 mb-2">My Agency Network</h3>
          <p className="text-sm text-gray-500 mb-6">Overview of sub-agents under your tree hierarchy.</p>

          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">Total Sub-Agents</span>
              <span className="font-bold text-gray-900">{team.total_sub_agents}</span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="text-sm text-gray-600">Pending Review</span>
              <span className={`font-bold ${team.pending_sub_agents > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                {team.pending_sub_agents}
              </span>
            </div>
          </div>
          <Button variant="secondary" size="sm" className="w-full mt-4" onClick={() => navigate('/portal/agent/team')}>
            View team
            <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent Commissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentCommissions.length === 0 ? (
              <EmptyState icon={CreditCard} heading="No commissions yet" description="Commission records appear here as your students progress." />
            ) : (
              recentCommissions.map((c: any) => (
                <div key={c.public_id} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.student_name}</p>
                    <p className="text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-gray-900">{c.currency} {Number(c.amount).toLocaleString()}</span>
                    <StatusBadge status={c.status as StatusType} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <RecentNoticesCard fetchFn={fetchAgentNoticesFeed} viewAllPath="/portal/agent/notices" queryKeyPrefix="agent" />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeedWidget rolePrefix="agent" />
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
