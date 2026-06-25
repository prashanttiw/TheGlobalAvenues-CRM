import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card'
import { FileText, Clock, CreditCard } from 'lucide-react'

export default function StudentDashboard() {
  return (
    <PageWrapper className="space-y-6">
      <PageHeader 
        title="Welcome back, Amit!" 
        subtitle="Here's a quick overview of your study abroad journey." 
      />
      
      {/* Status Pipeline Strip */}
      <Card className="bg-brand-navy text-white overflow-hidden">
        <div className="flex flex-col md:flex-row items-center p-6 gap-4">
          <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-brand-orange-accessible/20 border border-brand-orange-accessible/50">
            <div className="w-3 h-3 rounded-full bg-brand-orange-accessible animate-pulse"></div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="font-display text-lg font-semibold">Stage 2: Application Processing</h3>
            <p className="text-sm text-white/70 mt-1">We are currently verifying your documents before final submission to University of Toronto.</p>
          </div>
        </div>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Applications</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy/5 text-brand-navy">
              <FileText className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground mt-1">University of Toronto, UBC</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">3</div>
            <p className="text-xs text-muted-foreground mt-1">Upload IELTS, Reference Letters</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Payments</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <CreditCard className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$500</div>
            <p className="text-xs text-muted-foreground mt-1">Tuition deposit due in 14 days</p>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
