import * as React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { ProfileCompletionPanel } from '../../shared/components/student/ProfileCompletionPanel'
import { agentCreateApplication, agentCreateStudent } from '../../lib/api'

const inputClass =
  'w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none'

export default function AgentCreateStudentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const intakePid = searchParams.get('intake') || undefined

  const [identity, setIdentity] = React.useState({ full_name: '', email: '', mobile: '' })
  const [creating, setCreating] = React.useState(false)
  const [newStudent, setNewStudent] = React.useState<{ public_id: string; full_name: string } | null>(null)
  const [applicationPid, setApplicationPid] = React.useState<string | undefined>(undefined)

  const canCreate = identity.full_name.trim() !== '' && identity.email.trim() !== '' && identity.mobile.trim() !== ''

  async function handleCreateProfile() {
    try {
      setCreating(true)
      const student = await agentCreateStudent(identity)
      setNewStudent(student)
      toast.success(`${student.full_name}'s profile is created — a welcome email has been sent.`)

      if (intakePid) {
        try {
          const { application } = await agentCreateApplication(student.public_id, intakePid)
          setApplicationPid(application.public_id)
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Student was created, but the application could not be started.')
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create student profile.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title="New Student"
        subtitle="Create a profile for a student who isn't in the system yet, then finish their application details."
      />

      <Card>
        <CardHeader className="border-b border-border-warm pb-2">
          <CardTitle className="text-base font-semibold text-brand-navy flex items-center gap-2">
            {newStudent && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            Student Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="mt-4 space-y-4 max-w-lg">
          {newStudent ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-brand-navy">{newStudent.full_name}</span>'s profile has been created.
              Finish the rest of their details below to submit the application.
            </p>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Full Name</label>
                <input className={inputClass} value={identity.full_name} onChange={(e) => setIdentity({ ...identity, full_name: e.target.value })} placeholder="Student's full name" />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Email</label>
                <input type="email" className={inputClass} value={identity.email} onChange={(e) => setIdentity({ ...identity, email: e.target.value })} placeholder="student@example.com" />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Mobile</label>
                <input className={inputClass} value={identity.mobile} onChange={(e) => setIdentity({ ...identity, mobile: e.target.value })} placeholder="+91 98765 43210" />
              </div>
              <Button onClick={handleCreateProfile} disabled={!canCreate} isLoading={creating}>
                Create Student Profile
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {newStudent && (
        <ProfileCompletionPanel
          onBehalfOfStudentPid={newStudent.public_id}
          applicationPid={applicationPid}
          onComplete={() => navigate('/portal/agent/students')}
        />
      )}
    </PageWrapper>
  )
}
