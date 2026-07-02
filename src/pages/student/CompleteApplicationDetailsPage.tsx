import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { ProfileCompletionPanel } from '../../shared/components/student/ProfileCompletionPanel'

export default function CompleteApplicationDetailsPage() {
  const { pid } = useParams<{ pid?: string }>()
  const navigate = useNavigate()

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title="Complete Application Details"
        subtitle={pid ? 'Finish your profile to submit this application.' : 'Update the details behind every application you submit.'}
      />

      <ProfileCompletionPanel
        applicationPid={pid}
        onComplete={() => navigate('/portal/student/applications')}
      />
    </PageWrapper>
  )
}
