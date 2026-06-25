import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { BarChart2, Download, TrendingUp, Users, GraduationCap, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

const MONTHLY_APPLICATIONS_DATA = [
  { month: 'Jan', count: 45 },
  { month: 'Feb', count: 72 },
  { month: 'Mar', count: 110 },
  { month: 'Apr', count: 95 },
  { month: 'May', count: 130 },
  { month: 'Jun', count: 185 },
]

const FINANCIAL_REVENUE_DATA = [
  { month: 'Jan', revenue: 15000 },
  { month: 'Feb', revenue: 22000 },
  { month: 'Mar', revenue: 35000 },
  { month: 'Apr', revenue: 29000 },
  { month: 'May', revenue: 42000 },
  { month: 'Jun', revenue: 58000 },
]

type ReportTab = 'overview' | 'students' | 'agents' | 'finance'

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = React.useState<ReportTab>('overview')

  const handleExport = (reportName: string) => {
    toast.success(`Exporting ${reportName} report to CSV...`)
  }

  return (
    <PageWrapper className="space-y-6">
      <PageHeader 
        title="CRM Analytics & Reports" 
        subtitle="Extract system performance metrics, agent pipeline revenues, and growth stats."
        actions={
          <Button variant="primary" onClick={() => handleExport(activeTab)}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border-warm pb-3">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart2 },
          { id: 'students', label: 'Students Growth', icon: GraduationCap },
          { id: 'agents', label: 'Agents Performance', icon: Users },
          { id: 'finance', label: 'Financial Revenue', icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
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
          )
        })}
      </div>

      {activeTab === 'overview' && (
        <div className="grid gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-brand-navy flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-brand-orange-accessible" />
                  Monthly Submissions Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[250px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MONTHLY_APPLICATIONS_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DE" />
                    <XAxis dataKey="month" stroke="#1E2A4A" fontSize={11} />
                    <YAxis stroke="#1E2A4A" fontSize={11} />
                    <Tooltip contentStyle={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E8E4DE' }} />
                    <Bar dataKey="count" fill="#D96200" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-brand-navy flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  Revenues Ingest Logs
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[250px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={FINANCIAL_REVENUE_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DE" />
                    <XAxis dataKey="month" stroke="#1E2A4A" fontSize={11} />
                    <YAxis stroke="#1E2A4A" fontSize={11} />
                    <Tooltip contentStyle={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E8E4DE' }} />
                    <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2.5} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <Card>
          <CardHeader>
            <CardTitle>Students Registration Analytics</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_APPLICATIONS_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DE" />
                <XAxis dataKey="month" stroke="#1E2A4A" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1E2A4A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 'agents' && (
        <Card>
          <CardHeader>
            <CardTitle>Agents Placement conversion rates</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Global Ed', conversions: 88 },
                { name: 'EduGlobal', conversions: 45 },
                { name: 'Smith Agency', conversions: 62 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DE" />
                <XAxis dataKey="name" stroke="#1E2A4A" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="conversions" fill="#D96200" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 'finance' && (
        <Card>
          <CardHeader>
            <CardTitle>Commission Disbursements (EUR)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={FINANCIAL_REVENUE_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DE" />
                <XAxis dataKey="month" stroke="#1E2A4A" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#D96200" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  )
}
