import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { UniversityBrowse } from '../../shared/components/catalog/UniversityBrowse'
import { StudentPickerDialog } from '../../shared/components/agent/StudentPickerDialog'
import { agentCreateApplication, type CatalogUniversity, type UniversityDetailCourse } from '../../lib/api'

export default function AgentUniversitiesPage() {
  const navigate = useNavigate()
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [pendingIntake, setPendingIntake] = React.useState<{ intake: any; course: UniversityDetailCourse; university: CatalogUniversity } | null>(null)

  function handleApplyForStudent(intake: any, course: UniversityDetailCourse, university: CatalogUniversity) {
    setPendingIntake({ intake, course, university })
    setPickerOpen(true)
  }

  async function handleSelectExisting(studentPid: string) {
    if (!pendingIntake) return
    try {
      const { application, autoSubmitted } = await agentCreateApplication(studentPid, pendingIntake.intake.public_id)
      setPickerOpen(false)
      if (autoSubmitted) {
        toast.success(`Application submitted for ${pendingIntake.course.name}.`)
      } else {
        toast.success('Application started — finish the student profile to submit it.')
        navigate(`/portal/agent/students/${studentPid}/applications/${application.public_id}/complete`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create application.')
    }
  }

  function handleSelectNew() {
    if (!pendingIntake) return
    setPickerOpen(false)
    navigate(`/portal/agent/students/new?intake=${pendingIntake.intake.public_id}`)
  }

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title="University Partners"
        subtitle="Browse partner universities and programs, and apply on behalf of your students."
      />
      <UniversityBrowse mode="agent-apply" onApplyForStudent={handleApplyForStudent} />
      <StudentPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelectExisting={handleSelectExisting}
        onSelectNew={handleSelectNew}
      />
    </PageWrapper>
  )
}
