import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card'
import { Users, FileText, Globe } from 'lucide-react'

export default function AdminDashboard() {
  return (
    <PageWrapper className="space-y-6">
      <PageHeader 
        title="Admin Control Center" 
        subtitle="Global platform overview, analytics, and administrative controls." 
      />
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy/5 text-brand-navy">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,204</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Applications</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy/5 text-brand-navy">
              <FileText className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3,892</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partner Universities</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-orange-accessible/10 text-brand-orange-accessible">
              <Globe className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-brand-orange-accessible">145</div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Action Required Queue</CardTitle>
            <p className="text-sm text-muted-foreground">Critical items awaiting your attention.</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { id: 1, title: "New Agent Registration", user: "EduGlobal Partners", time: "10 mins ago", type: "Approval" },
                { id: 2, title: "Commission Payout Pending", user: "Smith Consultancy", time: "1 hour ago", type: "Finance" },
                { id: 3, title: "University Intake Closing", user: "University of Sydney", time: "3 hours ago", type: "Alert" }
              ].map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 border border-border-warm rounded-xl bg-surface-warm/50">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none text-brand-navy">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.user} • {item.time}</p>
                  </div>
                  <div className="text-xs px-2 py-1 rounded-full bg-brand-orange-accessible/10 text-brand-orange-accessible font-medium">
                    {item.type}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <p className="text-sm text-muted-foreground">Cron jobs and integrations.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border-warm">
              <span className="text-sm text-brand-navy">CRM Sync</span>
              <span className="flex items-center text-xs text-emerald-600"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>Online</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-border-warm">
              <span className="text-sm text-brand-navy">Email Queue</span>
              <span className="flex items-center text-xs text-emerald-600"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>Online</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-brand-navy">Database Backup</span>
              <span className="text-xs text-muted-foreground">3 hours ago</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
