import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { StatusBadge } from '../../shared/components/ui/Badge'
import { Calendar, User, Globe, ArrowRight, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface Lead {
  id: string
  name: string
  source: string
  country: string
  assignedStaff: string
  date: string
  status: 'New' | 'Contacted' | 'Qualified'
}

const MOCK_LEADS: Lead[] = [
  {
    id: 'ld-1',
    name: 'Rahul Sen',
    source: 'Website Form',
    country: 'Austria',
    assignedStaff: 'Sarah Johnson',
    date: '2026-06-23',
    status: 'New',
  },
  {
    id: 'ld-2',
    name: 'Elena Rostova',
    source: 'Referral Agent',
    country: 'Canada',
    assignedStaff: 'Michael Chang',
    date: '2026-06-20',
    status: 'Contacted',
  },
  {
    id: 'ld-3',
    name: 'David Beck',
    source: 'Direct WhatsApp',
    country: 'Estonia',
    assignedStaff: 'Sarah Johnson',
    date: '2026-06-18',
    status: 'Qualified',
  }
]

export default function AdminLeadsPage() {
  const [leads, setLeads] = React.useState<Lead[]>(MOCK_LEADS)

  const handleConvert = (leadId: string, leadName: string) => {
    setLeads(prev => prev.filter(ld => ld.id !== leadId))
    toast.success(`Successfully converted ${leadName} into a CRM Student!`)
  }

  const columns: ('New' | 'Contacted' | 'Qualified')[] = ['New', 'Contacted', 'Qualified']

  return (
    <PageWrapper className="space-y-6">
      <PageHeader 
        title="Student Leads Pipeline" 
        subtitle="Manage prospective leads and convert them to system students." 
      />

      <div className="grid gap-6 md:grid-cols-3">
        {columns.map((colName) => {
          const colLeads = leads.filter(ld => ld.status === colName)

          return (
            <div key={colName} className="bg-surface-warm p-4 rounded-xl border border-border-warm flex flex-col gap-4 min-h-[450px]">
              {/* Column Header */}
              <div className="flex justify-between items-center pb-2 border-b border-border-warm">
                <span className="font-display font-semibold text-brand-navy">{colName}</span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-brand-navy/5 text-brand-navy rounded-full">
                  {colLeads.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="flex flex-col gap-3 overflow-y-auto">
                {colLeads.map((lead) => (
                  <Card key={lead.id} className="hover:shadow-card transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold uppercase text-brand-orange-accessible bg-brand-orange-accessible/10 px-2 py-0.5 rounded">
                          {lead.source}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">{lead.id}</span>
                      </div>

                      <h4 className="font-semibold text-brand-navy text-sm">{lead.name}</h4>

                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5" />
                          <span>Interest: {lead.country}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          <span>Staff: {lead.assignedStaff}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Added: {lead.date}</span>
                        </div>
                      </div>

                      {lead.status === 'Qualified' && (
                        <div className="pt-2 border-t border-border-warm">
                          <Button 
                            variant="primary" 
                            size="sm" 
                            className="w-full flex items-center justify-center gap-1.5"
                            onClick={() => handleConvert(lead.id, lead.name)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Convert to Student
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {colLeads.length === 0 && (
                  <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border-warm rounded-xl bg-white/40">
                    No leads in this stage
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </PageWrapper>
  )
}
