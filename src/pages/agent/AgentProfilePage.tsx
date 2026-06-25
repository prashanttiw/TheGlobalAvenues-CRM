import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card'
import { User, Copy } from 'lucide-react'
import { Button } from '../../shared/components/ui/Button'
import { toast } from 'sonner'

export default function AgentProfilePage() {
  const referralCode = "TGA-RKX492"

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode)
    toast.success("Referral code copied to clipboard")
  }

  return (
    <PageWrapper className="space-y-6">
      <PageHeader 
        title="Agency Profile" 
        subtitle="Manage your contact details and account settings." 
      />
      
      <Card>
        <CardHeader className="flex flex-row items-center space-x-4 pb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy">
            <User className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <CardTitle>Global Education Partners</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Level 1 Agent</p>
          </div>
          <Button variant="outline" onClick={copyCode} className="gap-2">
            <Copy className="h-4 w-4" /> Copy Referral Code
          </Button>
        </CardHeader>
        <CardContent className="mt-4 border-t border-border-warm pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Primary Contact</p>
              <p className="font-medium text-brand-navy">Sarah Johnson</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email Address</p>
              <p className="font-medium text-brand-navy">sarah@gepartners.com</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Region</p>
              <p className="font-medium text-brand-navy">South Asia</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Referral Code</p>
              <p className="font-medium text-brand-orange-accessible font-mono">{referralCode}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  )
}
