import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, Trash2, UserCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Stepper, type StepperStep } from '../ui/Stepper'
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
  fetchAgentDirectory,
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
  'w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none'

const STEPS: StepperStep[] = [
  { key: 'personal', label: 'Personal & Contact' },
  { key: 'source', label: 'Source & Agent' },
  { key: 'academics', label: 'Academic & Test Scores' },
  { key: 'documents', label: 'Documents' },
]

const TEST_NAMES = ['IELTS', 'TOEFL', 'PTE', 'Duolingo', 'GRE', 'GMAT', 'Other']

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
  const [activeStep, setActiveStep] = React.useState(0)
  const [gender, setGender] = React.useState('')
  const [alternateMobile, setAlternateMobile] = React.useState('')
  const [howHeard, setHowHeard] = React.useState('')
  const [planningPhd, setPlanningPhd] = React.useState(false)
  const [agentQuery, setAgentQuery] = React.useState('')
  const [selectedAgent, setSelectedAgent] = React.useState<{ public_id: string; full_name: string; agency_name?: string } | null>(null)
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

  const agentSearchQuery = useQuery({
    queryKey: ['student', 'agent-directory', agentQuery],
    queryFn: () => fetchAgentDirectory(agentQuery),
    enabled: !isAgentMode && agentQuery.length >= 2,
  })

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
      toast.success('Draft saved.')
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

  if (readinessQuery.isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-sm text-muted-foreground">Loading profile…</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-bold text-brand-navy">
          {isAgentMode ? 'Complete student application details' : 'Complete your profile to unlock applications'}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {applicationPid
            ? 'Finish these steps to submit the application you just started.'
            : 'Finish these steps once — then apply to as many programs as you like.'}
        </p>
        <Stepper steps={STEPS} activeIndex={activeStep} onStepClick={setActiveStep} className="mt-5" />
      </CardHeader>
      <CardContent className="space-y-6">
        {activeStep === 0 && (
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Gender</label>
              <select className={inputClass} value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Alternate Mobile (optional)</label>
              <input className={inputClass} value={alternateMobile} onChange={(e) => setAlternateMobile(e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <p className="text-xs text-muted-foreground">
              Name, primary mobile, and passport details are managed on the Profile page.
            </p>
            <div className="pt-2 flex justify-end">
              <Button onClick={() => setActiveStep(1)}>Continue</Button>
            </div>
          </div>
        )}

        {activeStep === 1 && (
          <div className="space-y-5 max-w-lg">
            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">How did you hear about us?</label>
              <select className={inputClass} value={howHeard} onChange={(e) => setHowHeard(e.target.value)}>
                <option value="">Select</option>
                {HOW_HEARD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {!isAgentMode && (
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Assign an Agent (optional)</label>
                {selectedAgent ? (
                  <div className="flex items-center justify-between rounded-md border border-border-warm bg-surface-warm px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-brand-orange-accessible" />
                      <div>
                        <p className="text-sm font-semibold text-brand-navy">{selectedAgent.full_name}</p>
                        {selectedAgent.agency_name && <p className="text-[11px] text-muted-foreground">{selectedAgent.agency_name}</p>}
                      </div>
                    </div>
                    <button type="button" className="text-xs text-red-600 font-semibold" onClick={() => setSelectedAgent(null)}>Remove</button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      className={`${inputClass} pl-9`}
                      placeholder="Search agent by name or code…"
                      value={agentQuery}
                      onChange={(e) => setAgentQuery(e.target.value)}
                    />
                    {agentQuery.length >= 2 && (agentSearchQuery.data?.length ?? 0) > 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-md border border-border-warm bg-surface-card shadow-card max-h-56 overflow-y-auto">
                        {agentSearchQuery.data!.map((agent: any) => (
                          <button
                            type="button"
                            key={agent.public_id}
                            className="w-full text-left px-3.5 py-2 text-sm hover:bg-surface-warm"
                            onClick={() => {
                              setSelectedAgent(agent)
                              setAgentQuery('')
                            }}
                          >
                            <span className="font-medium text-brand-navy">{agent.full_name}</span>
                            {agent.agency_name && <span className="text-muted-foreground"> · {agent.agency_name}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground mt-1">Leave blank if applying directly without an agent.</p>
              </div>
            )}

            <div className="pt-2 flex justify-between">
              <Button variant="secondary" onClick={() => setActiveStep(0)}>Back</Button>
              <Button
                onClick={() => {
                  draftMutation.mutate()
                  setActiveStep(2)
                }}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {activeStep === 2 && (
          <div className="space-y-8 max-w-2xl">
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
                className="mt-2"
                disabled={!academicForm.institution_name || !academicForm.degree_level || addAcademicMutation.isPending}
                onClick={() => addAcademicMutation.mutate()}
              >
                Add academic record
              </Button>
            </div>

            <div>
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
                className="mt-2"
                disabled={!testForm.test_name || !testForm.overall_score || addTestScoreMutation.isPending}
                onClick={() => addTestScoreMutation.mutate()}
              >
                Add test score
              </Button>
            </div>

            <div className="pt-2 flex justify-between">
              <Button variant="secondary" onClick={() => setActiveStep(1)}>Back</Button>
              <Button onClick={() => setActiveStep(3)}>Continue</Button>
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <div className="space-y-6 max-w-2xl">
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

            <div className="pt-2 flex justify-between">
              <Button variant="secondary" onClick={() => setActiveStep(2)}>Back</Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => draftMutation.mutate()} disabled={draftMutation.isPending}>Save Draft</Button>
                <Button onClick={() => submitMutation.mutate()} disabled={!canSubmit || submitMutation.isPending}>
                  {applicationPid ? 'Submit & Send Application' : 'Submit Profile'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
