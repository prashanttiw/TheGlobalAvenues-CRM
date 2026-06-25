import * as React from 'react'
import { FileQuestion, Home } from 'lucide-react'
import { Button } from './Button'
import { useNavigate } from 'react-router-dom'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center text-center px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-orange-accessible/10 mb-6">
        <FileQuestion className="h-10 w-10 text-brand-orange-accessible" />
      </div>
      <h1 className="font-display text-2xl font-bold text-brand-navy mb-2">Page Not Found</h1>
      <p className="text-muted-foreground mb-8 max-w-sm">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Button variant="primary" onClick={() => navigate('/')}>
        <Home className="mr-2 h-4 w-4" />
        Return to Dashboard
      </Button>
    </div>
  )
}
