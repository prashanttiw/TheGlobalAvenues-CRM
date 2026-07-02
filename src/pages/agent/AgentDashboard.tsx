import * as React from 'react';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../shared/components/layout/PageHeader';
import { PageWrapper } from '../../shared/components/layout/PageWrapper';
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card';
import { Users, FileText, CreditCard, ChevronRight, CheckCircle2, TrendingUp } from 'lucide-react';
import { fetchAgentDashboardSummary } from '../../lib/api';
import { toast } from 'sonner';

export default function AgentDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const summary = await fetchAgentDashboardSummary();
        setData(summary);
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

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-black text-gray-900 mb-2">Student Pipeline Overview</h3>
          <p className="text-sm text-gray-500 mb-6">Distribution of students associated with your subtree chain.</p>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">Registered</span>
              <span className="font-bold text-gray-900">{students.new}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">In Progress</span>
              <span className="font-bold text-gray-900">{students.in_progress}</span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="text-sm text-gray-600">Enrolled (Admitted)</span>
              <span className="font-bold text-emerald-600">{students.enrolled}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-black text-gray-900 mb-2">My Agency Network</h3>
          <p className="text-sm text-gray-500 mb-6">Overview of sub-agents under your tree hierarchy.</p>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">Total Sub-Agents</span>
              <span className="font-bold text-gray-900">{team.total_sub_agents}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending Review</span>
              <span className={`font-bold ${team.pending_sub_agents > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                {team.pending_sub_agents}
              </span>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
