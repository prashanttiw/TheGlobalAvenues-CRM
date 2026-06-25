import * as React from 'react'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { Button } from './Button'
import { useNavigate } from 'react-router-dom'

export function ForbiddenPage() {
  const navigate = useNavigate()
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center text-center px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 mb-6">
        <ShieldAlert className="h-10 w-10 text-red-600" />
      </div>
      <h1 className="font-display text-2xl font-bold text-brand-navy mb-2">Access Denied</h1>
      <p className="text-muted-foreground mb-8 max-w-sm">
        You don't have permission to view this page. If you believe this is a mistake, please contact your administrator.
      </p>
      <Button variant="secondary" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Go Back
      </Button>
    </div>
  )
}
