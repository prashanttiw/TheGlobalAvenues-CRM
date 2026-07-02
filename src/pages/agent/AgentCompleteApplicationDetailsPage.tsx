import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { ProfileCompletionPanel } from '../../shared/components/student/ProfileCompletionPanel'

export default function AgentCompleteApplicationDetailsPage() {
  const { studentPid, applicationPid } = useParams<{ studentPid: string; applicationPid: string }>()
  const navigate = useNavigate()

  if (!studentPid) return null

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title="Complete Application Details"
        subtitle="Finish this student's profile to submit the application you just started."
      />

      <ProfileCompletionPanel
        onBehalfOfStudentPid={studentPid}
        applicationPid={applicationPid}
        onComplete={() => navigate(`/portal/agent/students/${studentPid}`)}
      />
    </PageWrapper>
  )
}
