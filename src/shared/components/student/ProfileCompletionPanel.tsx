import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileCheck, GraduationCap, Trash2, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { AgentCombobox, type AgentOption } from '../ui/AgentCombobox'
import { DocumentSlot } from './DocumentSlot'
import {
  addAgentStudentAcademic,
  addAgentStudentTestScore,
  addStudentAcademic,
  addStudentTestScore,
  deleteAgentStudentAcademic,
  deleteAgentStudentTestScore,
  deleteStudentAcademic,
  deleteStudentTestScore,
  fetchAgentStudentAcademicProfile,
  fetchAgentStudentReadiness,
  fetchReadiness,
  fetchStudentAcademicProfile,
  saveAgentStudentReadinessDraft,
  saveReadinessDraft,
  submitAgentStudentReadiness,
  submitReadiness,
  uploadAgentStudentReadinessDocument,
  uploadReadinessDocument,
} from '../../../lib/api'
import { EDUCATION_LEVELS, HOW_HEARD_OPTIONS, OPTIONAL_SLOTS, PHD_SLOTS, REQUIRED_SLOTS } from '../../constants/readiness'

const inputClass =
  'w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-ring transition-shadow'

const labelClass = 'text-xs font-semibold text-brand-navy block mb-1'

const TEST_NAMES = ['IELTS', 'TOEFL', 'PTE', 'Duolingo', 'GRE', 'GMAT', 'Other']

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle?: string }) {
  return (
    <CardHeader className="flex flex-row items-center gap-3 border-b border-border-warm pb-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-orange-accessible/10">
        <Icon className="h-4.5 w-4.5 text-brand-orange-accessible" />
      </span>
      <div>
        <CardTitle className="text-base font-semibold text-brand-navy">{title}</CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </CardHeader>
  )
}

interface ProfileCompletionPanelProps {
  /** When set, this panel operates in agent-assisted mode for the given student instead of the logged-in student's own profile. */
  onBehalfOfStudentPid?: string
  /** When set, a successful final submit also auto-submits this draft application. */
  applicationPid?: string
  onComplete?: () => void
}

export function ProfileCompletionPanel({ onBehalfOfStudentPid, applicationPid, onComplete }: ProfileCompletionPanelProps) {
  const isAgentMode = !!onBehalfOfStudentPid
  const queryClient = useQueryClient()
  const [gender, setGender] = React.useState('')
  const [alternateMobile, setAlternateMobile] = React.useState('')
  const [howHeard, setHowHeard] = React.useState('')
  const [planningPhd, setPlanningPhd] = React.useState(false)
  const [selectedAgent, setSelectedAgent] = React.useState<AgentOption | null>(null)
  const [uploadingCategory, setUploadingCategory] = React.useState<string | null>(null)

  const readinessKey = isAgentMode ? ['agent', 'student-readiness', onBehalfOfStudentPid] : ['student', 'readiness']
  const academicKey = isAgentMode ? ['agent', 'student-academic-profile', onBehalfOfStudentPid] : ['student', 'academic-profile']

  const readinessQuery = useQuery({
    queryKey: readinessKey,
    queryFn: () => (isAgentMode ? fetchAgentStudentReadiness(onBehalfOfStudentPid!) : fetchReadiness()),
  })

  React.useEffect(() => {
    if (!readinessQuery.data) return
    setGender(readinessQuery.data.gender ?? '')
    setAlternateMobile(readinessQuery.data.alternate_mobile ?? '')
    setHowHeard(readinessQuery.data.how_heard_about_us ?? '')
    setPlanningPhd(!!readinessQuery.data.planning_phd)
    if (readinessQuery.data.agent) setSelectedAgent(readinessQuery.data.agent)
  }, [readinessQuery.data])

  const draftMutation = useMutation({
    mutationFn: () => {
      const payload = {
        gender,
        alternate_mobile: alternateMobile,
        how_heard_about_us: howHeard,
        planning_phd: planningPhd,
        agent_public_id: selectedAgent?.public_id,
      }
      return isAgentMode ? saveAgentStudentReadinessDraft(onBehalfOfStudentPid!, payload) : saveReadinessDraft(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: readinessKey })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to save draft.'),
  })

  const uploadMutation = useMutation({
    mutationFn: ({ category, file }: { category: string; file: File }) =>
      isAgentMode ? uploadAgentStudentReadinessDocument(onBehalfOfStudentPid!, category, file) : uploadReadinessDocument(category, file),
    onMutate: ({ category }) => setUploadingCategory(category),
    onSuccess: () => {
      toast.success('Document uploaded.')
      void queryClient.invalidateQueries({ queryKey: readinessKey })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to upload document.'),
    onSettled: () => setUploadingCategory(null),
  })

  const submitMutation = useMutation({
    mutationFn: () => (isAgentMode ? submitAgentStudentReadiness(onBehalfOfStudentPid!, applicationPid) : submitReadiness(applicationPid)),
    onSuccess: () => {
      toast.success(applicationPid ? 'Profile submitted and application sent.' : 'Profile submitted — you can now apply to programs.')
      void queryClient.invalidateQueries({ queryKey: readinessKey })
      onComplete?.()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to submit profile.'),
  })

  // ── Academic history + test scores ────────────────────────────────────────
  const academicQuery = useQuery({
    queryKey: academicKey,
    queryFn: () => (isAgentMode ? fetchAgentStudentAcademicProfile(onBehalfOfStudentPid!) : fetchStudentAcademicProfile()),
  })

  const [academicForm, setAcademicForm] = React.useState({ institution_name: '', degree_level: '', field_of_study: '', start_date: '', end_date: '', score_type: '', score_value: '', is_highest_qualification: false })
  const addAcademicMutation = useMutation({
    mutationFn: () =>
      isAgentMode ? addAgentStudentAcademic(onBehalfOfStudentPid!, academicForm) : addStudentAcademic(academicForm),
    onSuccess: () => {
      toast.success('Academic record added.')
      setAcademicForm({ institution_name: '', degree_level: '', field_of_study: '', start_date: '', end_date: '', score_type: '', score_value: '', is_highest_qualification: false })
      void queryClient.invalidateQueries({ queryKey: academicKey })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to add academic record.'),
  })
  const deleteAcademicMutation = useMutation({
    mutationFn: (pid: string) => (isAgentMode ? deleteAgentStudentAcademic(onBehalfOfStudentPid!, pid) : deleteStudentAcademic(pid)),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: academicKey }),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to delete record.'),
  })

  const [testForm, setTestForm] = React.useState({ test_name: '', overall_score: '', reading_score: '', writing_score: '', listening_score: '', speaking_score: '', test_date: '' })
  const addTestScoreMutation = useMutation({
    mutationFn: () => (isAgentMode ? addAgentStudentTestScore(onBehalfOfStudentPid!, testForm) : addStudentTestScore(testForm)),
    onSuccess: () => {
      toast.success('Test score added.')
      setTestForm({ test_name: '', overall_score: '', reading_score: '', writing_score: '', listening_score: '', speaking_score: '', test_date: '' })
      void queryClient.invalidateQueries({ queryKey: academicKey })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to add test score.'),
  })
  const deleteTestScoreMutation = useMutation({
    mutationFn: (pid: string) => (isAgentMode ? deleteAgentStudentTestScore(onBehalfOfStudentPid!, pid) : deleteStudentTestScore(pid)),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: academicKey }),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to delete test score.'),
  })

  const documentsByCategory = React.useMemo(() => {
    const map = new Map<string, { file_public_id: string; display_filename: string }>()
    for (const doc of readinessQuery.data?.documents ?? []) {
      map.set(doc.category, doc)
    }
    return map
  }, [readinessQuery.data])

  const requiredSlots = planningPhd ? [...REQUIRED_SLOTS, ...PHD_SLOTS] : REQUIRED_SLOTS
  const missingRequired = requiredSlots.filter((slot) => !documentsByCategory.has(slot.category))
  const canSubmit = missingRequired.length === 0
  const isSaving = draftMutation.isPending || submitMutation.isPending

  async function handleSaveDraft() {
    try {
      await draftMutation.mutateAsync()
      toast.success('Draft saved.')
    } catch {
      // onError already surfaced a toast
    }
  }

  async function handleSubmit() {
    try {
      await draftMutation.mutateAsync()
      await submitMutation.mutateAsync()
    } catch {
      // onError already surfaced a toast
    }
  }

  if (readinessQuery.isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-sm text-muted-foreground">Loading profile…</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-brand-navy">
          {isAgentMode ? 'Complete student application details' : 'Complete your profile to unlock applications'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {applicationPid
            ? 'Fill in these details to submit the application you just started.'
            : 'Fill these in once — then apply to as many programs as you like.'}
        </p>
      </div>

      <Card>
        <SectionHeader icon={User} title="Personal Details" />
        <CardContent className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Gender</label>
              <select className={inputClass} value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Alternate Mobile (optional)</label>
              <input className={inputClass} value={alternateMobile} onChange={(e) => setAlternateMobile(e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className={labelClass}>How did you hear about us?</label>
              <select className={inputClass} value={howHeard} onChange={(e) => setHowHeard(e.target.value)}>
                <option value="">Select</option>
                {HOW_HEARD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {!isAgentMode && (
              <div>
                <label className={labelClass}>Assign an Agent (optional)</label>
                <AgentCombobox value={selectedAgent} onChange={setSelectedAgent} scope="student" />
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Name, primary mobile, and passport details are managed on the Profile page.
            {!isAgentMode && ' Leave the agent field blank if applying directly without one.'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <SectionHeader icon={GraduationCap} title="Academic History & Test Scores" />
        <CardContent className="mt-4 space-y-8">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Academic History</h4>
            <div className="space-y-3">
              {(academicQuery.data?.academics ?? []).map((a: any) => (
                <div key={a.public_id} className="flex items-center justify-between rounded-md border border-border-warm bg-surface-warm px-3.5 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-brand-navy">{a.institution_name} — {a.degree_level}</p>
                    <p className="text-[11px] text-muted-foreground">{a.field_of_study || '—'} · {a.score_type ? `${a.score_type}: ${a.score_value}` : ''}</p>
                  </div>
                  <button type="button" onClick={() => deleteAcademicMutation.mutate(a.public_id)} className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <input className={inputClass} placeholder="Institution name" value={academicForm.institution_name} onChange={(e) => setAcademicForm({ ...academicForm, institution_name: e.target.value })} />
              <select className={inputClass} value={academicForm.degree_level} onChange={(e) => setAcademicForm({ ...academicForm, degree_level: e.target.value })}>
                <option value="">Degree level</option>
                {EDUCATION_LEVELS.map((lvl) => <option key={lvl.key} value={lvl.key}>{lvl.label}</option>)}
              </select>
              <input className={inputClass} placeholder="Field of study (optional)" value={academicForm.field_of_study} onChange={(e) => setAcademicForm({ ...academicForm, field_of_study: e.target.value })} />
              <input className={inputClass} placeholder="Score (e.g. GPA/percentage)" value={academicForm.score_value} onChange={(e) => setAcademicForm({ ...academicForm, score_value: e.target.value, score_type: academicForm.score_type || 'percentage' })} />
              <input type="date" className={inputClass} value={academicForm.start_date} onChange={(e) => setAcademicForm({ ...academicForm, start_date: e.target.value })} />
              <input type="date" className={inputClass} value={academicForm.end_date} onChange={(e) => setAcademicForm({ ...academicForm, end_date: e.target.value })} />
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              disabled={!academicForm.institution_name || !academicForm.degree_level || addAcademicMutation.isPending}
              onClick={() => addAcademicMutation.mutate()}
            >
              Add academic record
            </Button>
          </div>

          <div className="border-t border-border-warm pt-6">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">English Test Scores</h4>
            <div className="space-y-3">
              {(academicQuery.data?.test_scores ?? []).map((t: any) => (
                <div key={t.public_id} className="flex items-center justify-between rounded-md border border-border-warm bg-surface-warm px-3.5 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-brand-navy">{t.test_name} — Overall {t.overall_score}</p>
                    <p className="text-[11px] text-muted-foreground">{t.test_date || '—'}</p>
                  </div>
                  <button type="button" onClick={() => deleteTestScoreMutation.mutate(t.public_id)} className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <select className={inputClass} value={testForm.test_name} onChange={(e) => setTestForm({ ...testForm, test_name: e.target.value })}>
                <option value="">Test name</option>
                {TEST_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <input className={inputClass} placeholder="Overall score" value={testForm.overall_score} onChange={(e) => setTestForm({ ...testForm, overall_score: e.target.value })} />
              <input type="date" className={inputClass} value={testForm.test_date} onChange={(e) => setTestForm({ ...testForm, test_date: e.target.value })} />
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              disabled={!testForm.test_name || !testForm.overall_score || addTestScoreMutation.isPending}
              onClick={() => addTestScoreMutation.mutate()}
            >
              Add test score
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <SectionHeader
          icon={FileCheck}
          title="Documents"
          subtitle={canSubmit ? 'All required documents are on file.' : `${missingRequired.length} required document${missingRequired.length === 1 ? '' : 's'} still needed`}
        />
        <CardContent className="mt-4 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {REQUIRED_SLOTS.map((slot) => (
              <DocumentSlot
                key={slot.category}
                slot={slot}
                existing={documentsByCategory.get(slot.category)}
                onUpload={(category, file) => uploadMutation.mutate({ category, file })}
                uploading={uploadingCategory === slot.category}
              />
            ))}
          </div>

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Optional Documents</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {OPTIONAL_SLOTS.map((slot) => (
                <DocumentSlot
                  key={slot.category}
                  slot={slot}
                  existing={documentsByCategory.get(slot.category)}
                  onUpload={(category, file) => uploadMutation.mutate({ category, file })}
                  uploading={uploadingCategory === slot.category}
                />
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-brand-navy">
            <input type="checkbox" checked={planningPhd} onChange={(e) => setPlanningPhd(e.target.checked)} />
            Planning to apply for a PhD program
          </label>

          {planningPhd && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {PHD_SLOTS.map((slot) => (
                <DocumentSlot
                  key={slot.category}
                  slot={slot}
                  existing={documentsByCategory.get(slot.category)}
                  onUpload={(category, file) => uploadMutation.mutate({ category, file })}
                  uploading={uploadingCategory === slot.category}
                />
              ))}
            </div>
          )}

          {!canSubmit && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Still needed: {missingRequired.map((s) => s.label).join(', ')}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border-warm bg-surface-card/95 px-4 py-4 backdrop-blur">
        <p className="text-xs text-muted-foreground">
          {canSubmit ? 'Everything required is filled in.' : `${missingRequired.length} required document${missingRequired.length === 1 ? '' : 's'} remaining`}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleSaveDraft} isLoading={draftMutation.isPending && !submitMutation.isPending}>
            Save Draft
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSaving} isLoading={submitMutation.isPending}>
            {applicationPid ? 'Submit & Send Application' : 'Submit Profile'}
          </Button>
        </div>
      </div>
    </div>
  )
}
