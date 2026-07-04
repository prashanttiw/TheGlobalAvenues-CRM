import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../shared/components/layout/PageHeader';
import { PageWrapper } from '../../shared/components/layout/PageWrapper';
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card';
import { Button } from '../../shared/components/ui/Button';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart2, Download, TrendingUp, Users, GraduationCap, Building2, Filter, Activity } from 'lucide-react';
import { toast } from 'sonner';
import {
  useReportOverview,
  useReportFunnel,
  useReportAgents,
  useReportUniversities,
  useReportLeadSources,
  useReportTrends
} from '../../data/reports';
import { getAccessToken } from '../../lib/api';
import { UnderDevelopmentNotice } from '../../shared/components/ui/UnderDevelopmentNotice';

type ReportTab = 'overview' | 'funnel' | 'agents' | 'universities' | 'sources' | 'trends';

export default function AdminReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const activeTab = (searchParams.get('tab') as ReportTab) || 'overview';
  const setActiveTab = (tab: ReportTab) => {
    setSearchParams(prev => { prev.set('tab', tab); return prev; }, { replace: true });
  };
  
  const trendMetric = searchParams.get('metric') || 'total_applications';
  const setTrendMetric = (metric: string) => {
    setSearchParams(prev => { prev.set('metric', metric); return prev; }, { replace: true });
  };
  
  const { data: overview, isLoading: loadingOverview } = useReportOverview();
  const { data: funnel, isLoading: loadingFunnel } = useReportFunnel();
  const { data: agentsRes, isLoading: loadingAgents } = useReportAgents();
  const { data: unisRes, isLoading: loadingUnis } = useReportUniversities();
  const { data: sourcesRes, isLoading: loadingSources } = useReportLeadSources();
  const { data: trendsRes, isLoading: loadingTrends } = useReportTrends(trendMetric);

  const handleExport = async (type: string, format: 'xlsx' | 'csv' | 'pdf') => {
    const validTypes = ['students', 'agents', 'applications', 'commissions'];
    if (!validTypes.includes(type)) {
       toast.error(`Export type ${type} not supported yet.`);
       return;
    }
    toast.success(`Starting ${format.toUpperCase()} export for ${type}...`);
    
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('Your session has expired. Please sign in again.');
      }
      const url = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost/crm-api'}/?route=admin&action=reports/export&type=${type}&format=${format}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Export failed. Make sure you have the correct permissions.');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `TGA_${type}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success(`${format.toUpperCase()} export downloaded successfully`);
    } catch (err) {
      toast.error('Failed to generate export document.');
      console.error(err);
    }
  };

  const renderMetricCard = (title: string, value: number, change: number | null, trend: string) => (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-brand-navy/60">{title}</p>
        <div className="flex items-baseline gap-2 mt-2">
          <h3 className="text-3xl font-bold text-brand-navy">{value.toLocaleString()}</h3>
          {change !== null && (
            <span className={`text-xs font-semibold ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {Math.abs(change)}%
            </span>
          )}
        </div>
        <p className="text-xs text-brand-navy/40 mt-1">vs previous 30 days</p>
      </CardContent>
    </Card>
  );

  return (
    <PageWrapper className="space-y-6">
      <UnderDevelopmentNotice featureName="Reports" />
      <PageHeader
        title="Enterprise Analytics" 
        subtitle="Cumulative snapshots, funnel velocity, and partner intelligence."
        actions={
          <div className="flex gap-2">
            <select 
              id="export-type" 
              className="text-sm border-border-warm rounded-md"
              defaultValue="students"
            >
              <option value="students">Students</option>
              <option value="applications">Applications</option>
              <option value="agents">Agents</option>
              <option value="commissions">Commissions</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => handleExport(
              (document.getElementById('export-type') as HTMLSelectElement).value, 'xlsx'
            )}>
              <Download className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport(
              (document.getElementById('export-type') as HTMLSelectElement).value, 'pdf'
            )}>
              <Download className="mr-2 h-4 w-4" /> PDF
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 border-b border-border-warm pb-3">
        {[
          { id: 'overview', label: 'Executive Overview', icon: BarChart2 },
          { id: 'funnel', label: 'Pipeline Funnel', icon: Filter },
          { id: 'agents', label: 'Agent Intelligence', icon: Users },
          { id: 'universities', label: 'University Performance', icon: Building2 },
          { id: 'sources', label: 'Lead Sources', icon: TrendingUp },
          { id: 'trends', label: 'Trend Analytics', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              variant={isActive ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.id as ReportTab)}
              className="flex items-center gap-1.5"
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <div className="grid gap-6">
          {loadingOverview ? (
            <div className="flex items-center justify-center h-64 text-brand-navy/60">
              <div className="animate-pulse flex flex-col items-center gap-3">
                <BarChart2 className="h-8 w-8 animate-bounce text-brand-orange-accessible" />
                <p>Aggregating enterprise metrics...</p>
              </div>
            </div>
          ) : overview ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {renderMetricCard('Total Leads', overview.total_leads?.value || 0, overview.total_leads?.change_pct ?? null, overview.total_leads?.trend || 'flat')}
                {renderMetricCard('Total Students', overview.total_students.value, overview.total_students.change_pct, overview.total_students.trend)}
                {renderMetricCard('Total Applications', overview.total_applications.value, overview.total_applications.change_pct, overview.total_applications.trend)}
                {renderMetricCard('Total Offers', overview.total_offers.value, overview.total_offers.change_pct, overview.total_offers.trend)}
                {renderMetricCard('Total Enrollments', overview.total_enrollments.value, overview.total_enrollments.change_pct, overview.total_enrollments.trend)}
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-brand-navy flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-brand-orange-accessible" />
                    New Students (30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overview.trend_new_students}>
                      <defs>
                        <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D96200" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#D96200" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DE" vertical={false} />
                      <XAxis dataKey="snapshot_date" stroke="#1E2A4A" fontSize={11} axisLine={false} tickLine={false}
                             tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                      <YAxis stroke="#1E2A4A" fontSize={11} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E8E4DE', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Area type="monotone" dataKey="metric_value" stroke="#D96200" strokeWidth={3} fill="url(#colorStudents)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="flex flex-col items-center justify-center h-64 text-center bg-slate-50 border-dashed">
              <BarChart2 className="h-12 w-12 text-brand-navy/20 mb-3" />
              <h3 className="text-lg font-semibold text-brand-navy">Snapshot Pending</h3>
              <p className="text-sm text-brand-navy/60 max-w-sm mt-1">The analytics engine is waiting for the daily cron execution to compile metrics.</p>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'funnel' && (
        <Card>
          <CardHeader>
            <CardTitle>Cumulative Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px] mt-4">
            {loadingFunnel ? (
              <div className="flex items-center justify-center h-full text-brand-navy/60">
                <div className="animate-pulse flex flex-col items-center gap-3">
                  <Filter className="h-8 w-8 animate-bounce text-brand-orange-accessible" />
                  <p>Processing pipeline velocity...</p>
                </div>
              </div>
            ) : !funnel || funnel.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center bg-slate-50 border-dashed rounded-md border-border-warm border">
                <Filter className="h-12 w-12 text-brand-navy/20 mb-3" />
                <h3 className="text-lg font-semibold text-brand-navy">Funnel Not Available</h3>
                <p className="text-sm text-brand-navy/60 max-w-sm mt-1">Awaiting data aggregation from the snapshot engine.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel} layout="vertical" margin={{ left: 50, right: 80, top: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E8E4DE" />
                  <XAxis type="number" stroke="#1E2A4A" fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis dataKey="stage" type="category" stroke="#1E2A4A" fontSize={12} width={100} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: '#f4f4f4'}}
                    contentStyle={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E8E4DE', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any, name: any, props: any) => [
                      `${value.toLocaleString()} (${props.payload.drop_off_pct ? '-' + props.payload.drop_off_pct + '% drop' : 'Start'})`,
                      'Volume'
                    ]}
                  />
                  <Bar dataKey="count" fill="#1E2A4A" radius={[0, 4, 4, 0]} maxBarSize={50}>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'agents' && (
        <Card>
          <CardHeader>
            <CardTitle>Agent Intelligence (Ranked by Conversion %)</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAgents ? (
              <div className="flex items-center justify-center h-64 text-brand-navy/60">
                <div className="animate-pulse flex flex-col items-center gap-3">
                  <Users className="h-8 w-8 animate-bounce text-brand-orange-accessible" />
                  <p>Compiling partner performance leaderboards...</p>
                </div>
              </div>
            ) : !agentsRes?.data || agentsRes.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center bg-slate-50 border-dashed rounded-md border-border-warm border">
                <Users className="h-12 w-12 text-brand-navy/20 mb-3" />
                <h3 className="text-lg font-semibold text-brand-navy">No Agent Data Yet</h3>
                <p className="text-sm text-brand-navy/60 max-w-sm mt-1">Check back after the first snapshot processes agent metrics.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full rounded-lg border border-border-warm">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-brand-navy text-white">
                    <tr>
                      <th className="px-5 py-4 font-semibold tracking-wide">Rank</th>
                      <th className="px-5 py-4 font-semibold tracking-wide">Agency</th>
                      <th className="px-5 py-4 font-semibold tracking-wide">Tier</th>
                      <th className="px-5 py-4 font-semibold tracking-wide text-right">Students</th>
                      <th className="px-5 py-4 font-semibold tracking-wide text-right">Enrolled</th>
                      <th className="px-5 py-4 font-semibold tracking-wide text-right">Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentsRes.data.map((a: any, idx: number) => (
                      <tr key={a.agent_public_id} className={`border-b border-border-warm hover:bg-orange-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center justify-center h-7 w-7 rounded-full font-bold ${a.rank_position <= 3 ? 'bg-brand-orange-accessible text-white' : 'bg-slate-200 text-brand-navy'}`}>
                            {a.rank_position}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-medium text-brand-navy">{a.agency_name}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-md ${a.tier === 'premium' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {a.tier ? a.tier.toUpperCase() : 'STANDARD'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">{a.students}</td>
                        <td className="px-5 py-3 text-right">{a.enrollments}</td>
                        <td className="px-5 py-3 text-right">
                          <span className={`font-bold ${a.conversion_rate >= 50 ? 'text-green-600' : a.conversion_rate < 20 ? 'text-red-600' : 'text-brand-navy'}`}>
                            {a.conversion_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'universities' && (
        <Card>
          <CardHeader>
            <CardTitle>University Performance (Offer & Enrollment Rates)</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingUnis ? (
              <div className="flex items-center justify-center h-64 text-brand-navy/60">
                <div className="animate-pulse flex flex-col items-center gap-3">
                  <Building2 className="h-8 w-8 animate-bounce text-brand-orange-accessible" />
                  <p>Aggregating institutional metrics...</p>
                </div>
              </div>
            ) : !unisRes?.data || unisRes.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center bg-slate-50 border-dashed rounded-md border-border-warm border">
                <Building2 className="h-12 w-12 text-brand-navy/20 mb-3" />
                <h3 className="text-lg font-semibold text-brand-navy">No University Data Yet</h3>
                <p className="text-sm text-brand-navy/60 max-w-sm mt-1">Check back after the snapshot engine has compiled institutional data.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full rounded-lg border border-border-warm">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-brand-navy text-white">
                    <tr>
                      <th className="px-5 py-4 font-semibold tracking-wide">Rank</th>
                      <th className="px-5 py-4 font-semibold tracking-wide">University</th>
                      <th className="px-5 py-4 font-semibold tracking-wide text-right">Applications</th>
                      <th className="px-5 py-4 font-semibold tracking-wide text-right">Offers</th>
                      <th className="px-5 py-4 font-semibold tracking-wide text-right">Enrolled</th>
                      <th className="px-5 py-4 font-semibold tracking-wide text-right">Offer Rate</th>
                      <th className="px-5 py-4 font-semibold tracking-wide text-right">Yield</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unisRes.data.map((u: any, idx: number) => {
                      const yieldRate = u.offers > 0 ? Math.round((u.enrollments / u.offers) * 100) : 0;
                      return (
                        <tr key={u.uni_public_id} className={`border-b border-border-warm hover:bg-orange-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                          <td className="px-5 py-3 text-brand-navy/60 font-semibold">#{idx + 1}</td>
                          <td className="px-5 py-3 font-medium text-brand-navy">{u.name}</td>
                          <td className="px-5 py-3 text-right">{u.applications}</td>
                          <td className="px-5 py-3 text-right">{u.offers}</td>
                          <td className="px-5 py-3 text-right">{u.enrollments}</td>
                          <td className="px-5 py-3 text-right">
                            <span className={`font-bold ${u.offer_rate >= 70 ? 'text-green-600' : u.offer_rate < 40 ? 'text-red-600' : 'text-brand-navy'}`}>
                              {u.offer_rate}%
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-brand-navy font-semibold">{yieldRate}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {activeTab === 'sources' && (
        <Card>
          <CardHeader>
            <CardTitle>Lead Sources Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSources ? (
              <div className="flex items-center justify-center h-64 text-brand-navy/60">
                <div className="animate-pulse flex flex-col items-center gap-3">
                  <TrendingUp className="h-8 w-8 animate-bounce text-brand-orange-accessible" />
                  <p>Analyzing acquisition channels...</p>
                </div>
              </div>
            ) : !sourcesRes?.data || sourcesRes.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center bg-slate-50 border-dashed rounded-md border-border-warm border">
                <TrendingUp className="h-12 w-12 text-brand-navy/20 mb-3" />
                <h3 className="text-lg font-semibold text-brand-navy">No Lead Sources Detected</h3>
                <p className="text-sm text-brand-navy/60 max-w-sm mt-1">Acquisition channel data will populate once pipeline activity is recorded.</p>
              </div>
            ) : (
              <div className="h-[400px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sourcesRes.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DE" vertical={false} />
                    <XAxis dataKey="source" stroke="#1E2A4A" fontSize={12} axisLine={false} tickLine={false} />
                    <YAxis stroke="#1E2A4A" fontSize={12} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{fill: '#f4f4f4'}}
                      contentStyle={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E8E4DE', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any, name: string, props: any) => {
                        if (name === "Enrolled Students" && props.payload.conversion_rate) {
                          return [`${value.toLocaleString()} (${props.payload.conversion_rate}% conversion)`, name];
                        }
                        return [value.toLocaleString(), name];
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="students" fill="#1E2A4A" radius={[4, 4, 0, 0]} name="Total Students" maxBarSize={60} />
                    <Bar dataKey="enrollments" fill="#D96200" radius={[4, 4, 0, 0]} name="Enrolled Students" maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'trends' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border-warm mb-4">
            <CardTitle>Time-Series Analytics (30 Days)</CardTitle>
            <select
              className="text-sm border-border-warm rounded-md text-brand-navy font-medium bg-slate-50"
              value={trendMetric}
              onChange={(e) => setTrendMetric(e.target.value)}
            >
              <option value="total_leads">Total Leads</option>
              <option value="total_students">Total Students</option>
              <option value="total_applications">Total Applications</option>
              <option value="total_offers">Total Offers</option>
              <option value="total_enrollments">Total Enrollments</option>
              <option value="total_revenue">Total Revenue</option>
              <option value="total_commissions">Total Commissions</option>
            </select>
          </CardHeader>
          <CardContent>
            {loadingTrends ? (
              <div className="flex items-center justify-center h-[400px] text-brand-navy/60">
                <div className="animate-pulse flex flex-col items-center gap-3">
                  <Activity className="h-8 w-8 animate-bounce text-brand-orange-accessible" />
                  <p>Processing historical trends...</p>
                </div>
              </div>
            ) : !trendsRes?.data || trendsRes.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center bg-slate-50 border-dashed rounded-md border-border-warm border">
                <Activity className="h-12 w-12 text-brand-navy/20 mb-3" />
                <h3 className="text-lg font-semibold text-brand-navy">No Trend Data</h3>
                <p className="text-sm text-brand-navy/60 max-w-sm mt-1">Sufficient historical snapshot data is not yet available.</p>
              </div>
            ) : (
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendsRes.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1E2A4A" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#1E2A4A" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DE" vertical={false} />
                    <XAxis 
                      dataKey="snapshot_date" 
                      stroke="#1E2A4A" 
                      fontSize={12} 
                      axisLine={false} 
                      tickLine={false}
                      tickFormatter={(val) => val.split('-').slice(1).join('/')} 
                    />
                    <YAxis stroke="#1E2A4A" fontSize={12} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{fill: '#f4f4f4'}}
                      contentStyle={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E8E4DE', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any, name: string) => [value.toLocaleString(), trendMetric.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')]}
                    />
                    <Area type="monotone" dataKey="metric_value" stroke="#1E2A4A" strokeWidth={3} fill="url(#colorTrend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
}
