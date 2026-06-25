import * as React from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import { Button } from './Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './Card'

export interface ErrorBoundaryFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export function ErrorBoundaryFallback({ error, resetErrorBoundary }: ErrorBoundaryFallbackProps) {
  return (
    <div className="flex h-full w-full items-center justify-center py-12" role="alert">
      <Card className="max-w-md w-full border-red-200 shadow-warm-sm">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
          </div>
          <CardTitle className="text-red-900">Something went wrong</CardTitle>
          <CardDescription className="text-red-700">
            An unexpected error occurred in this section of the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="w-full rounded-md bg-red-50 p-4 overflow-auto text-xs text-red-900 border border-red-100 font-mono">
            {error.message}
          </div>
          <Button variant="primary" onClick={resetErrorBoundary} className="w-full">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

interface Props {
  children: React.ReactNode
}
interface State {
  error: Error | null
}

export class DashboardErrorBoundary extends React.Component<Props, State> {
  public state: State = { error: null }

  public static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  private handleReset = () => {
    this.setState({ error: null })
  }

  public render() {
    if (this.state.error) {
      return <ErrorBoundaryFallback error={this.state.error} resetErrorBoundary={this.handleReset} />
    }
    return this.props.children
  }
}
