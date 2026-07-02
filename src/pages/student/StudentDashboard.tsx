import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card'
import { FileText, Clock, CreditCard } from 'lucide-react'

export default function StudentDashboard() {
  return (
    <PageWrapper className="space-y-6 sm:space-y-8">
      <PageHeader 
        title="Welcome back, Amit!" 
        subtitle="Here's a quick overview of your study abroad journey." 
      />
      
      {/* Status Pipeline Strip */}
      <Card className="overflow-hidden border-brand-navy/20 bg-brand-navy text-white shadow-warm-lg">
        <div className="flex flex-col items-center gap-4 p-5 text-center sm:p-6 md:flex-row md:text-left">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brand-orange-accessible/50 bg-brand-orange-accessible/20 shadow-sm">
            <div className="w-3 h-3 rounded-full bg-brand-orange-accessible animate-pulse"></div>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-semibold leading-tight">Stage 2: Application Processing</h3>
            <p className="mt-1 text-sm leading-6 text-white/75">We are currently verifying your documents before final submission to University of Toronto.</p>
          </div>
        </div>
      </Card>
      
      <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Applications</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-button border border-brand-navy/10 bg-brand-navy/5 text-brand-navy">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-button border border-amber-500/15 bg-amber-500/10 text-amber-600">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-button border border-emerald-500/15 bg-emerald-500/10 text-emerald-600">
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
