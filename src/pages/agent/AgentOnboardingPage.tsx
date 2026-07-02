import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast, Toaster } from 'sonner'
import {
  CheckCircle2,
  Upload,
  FileText,
  Image as ImageIcon,
  FileBadge,
  LogOut,
  AlertCircle,
  Lock,
} from 'lucide-react'
import {
  fetchAgentOnboardingStatus,
  uploadAgentOnboardingDocument,
  saveAgentOnboardingDraft,
  submitAgentOnboardingApplication,
  type AgentOnboardingDoc,
  type AgentOnboardingDocType,
} from '../../lib/api'
import { useAuth } from '../../shared/hooks/useAuth'
import { INDIAN_STATES_AND_UTS } from '../../shared/constants/indianStates'
import { OnboardingTabs } from './OnboardingTabs'

interface DocConfig {
  key: AgentOnboardingDocType
  label: string
  accept: string
  hint: string
  icon: React.ReactNode
}

const DOCS: DocConfig[] = [
  {
    key: 'profile_photo',
    label: 'Profile Photo',
    accept: 'image/jpeg,image/png,image/webp',
    hint: 'A clear photo of yourself — JPEG, PNG or WEBP',
    icon: <ImageIcon className="h-5 w-5" />,
  },
  {
    key: 'aadhar_card',
    label: 'Aadhar Card',
    accept: 'application/pdf,image/jpeg,image/png',
    hint: 'PDF or photo of your Aadhar card',
    icon: <FileBadge className="h-5 w-5" />,
  },
  {
    key: 'cv_resume',
    label: 'CV / Resume',
    accept: 'application/pdf',
    hint: 'PDF only',
    icon: <FileText className="h-5 w-5" />,
  },
]

type FormState = {
  first_name: string
  last_name: string
  address_line: string
  city: string
  state: string
  mobile_number: string
  alternate_mobile_number: string
}

const EMPTY_FORM: FormState = {
  first_name: '',
  last_name: '',
  address_line: '',
  city: '',
  state: '',
  mobile_number: '',
  alternate_mobile_number: '',
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-600 mb-1.5 block">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2D1B69]/20 focus:border-[#2D1B69]'

const lockedInputClass =
  'w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed'

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <Field label={label}>
      <div className="relative">
        <input className={lockedInputClass} value={value} disabled readOnly />
        <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
      </div>
    </Field>
  )
}

export default function AgentOnboardingPage() {
  const { logout, updateAgentStatus } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileRefs = useRef<Record<AgentOnboardingDocType, HTMLInputElement | null>>({
    profile_photo: null,
    aadhar_card: null,
    cv_resume: null,
  })

  const [uploading, setUploading] = useState<AgentOnboardingDocType | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [hydrated, setHydrated] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['agent-onboarding-status'],
    queryFn: fetchAgentOnboardingStatus,
    staleTime: 10_000,
  })

  useEffect(() => {
    if (data?.agent && !hydrated) {
      setForm({
        first_name: data.agent.first_name ?? '',
        last_name: data.agent.last_name ?? '',
        address_line: data.agent.address_line ?? '',
        city: data.agent.city ?? '',
        state: data.agent.state ?? '',
        mobile_number: data.agent.mobile_number ?? '',
        alternate_mobile_number: data.agent.alternate_mobile_number ?? '',
      })
      setHydrated(true)
    }
  }, [data, hydrated])

  const uploadMutation = useMutation({
    mutationFn: ({ file, docType }: { file: File; docType: AgentOnboardingDocType }) =>
      uploadAgentOnboardingDocument(file, docType),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['agent-onboarding-status'] })
      toast.success('Document uploaded.')
      setUploading(null)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Upload failed. Please try again.')
      setUploading(null)
    },
  })

  const draftMutation = useMutation({
    mutationFn: () => saveAgentOnboardingDraft(form),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['agent-onboarding-status'] })
      updateAgentStatus(result.status)
      toast.success('Draft saved.')
    },
    onError: (err: Error) => toast.error(err.message || 'Could not save draft.'),
  })

  const submitMutation = useMutation({
    mutationFn: () => submitAgentOnboardingApplication(form),
    onSuccess: (result) => {
      updateAgentStatus(result.status)
      toast.success('Application submitted!')
      navigate('/portal/agent/pending', { replace: true })
    },
    onError: (err: Error) => toast.error(err.message || 'Could not submit application.'),
  })

  const handleFileChange = (docType: AgentOnboardingDocType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(docType)
    uploadMutation.mutate({ file, docType })
    e.target.value = ''
  }

  const handleLogout = async () => {
    await logout()
    navigate('/portal/login', { replace: true })
  }

  const updateField = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-warm,#FFFCF5)] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-[#2D1B69] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[var(--color-text-muted,#6B7280)]">Loading your application…</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-warm,#FFFCF5)] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-red-100 p-8 max-w-md w-full text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-semibold text-gray-900">Could not load your application</h2>
          <p className="text-sm text-gray-500">Please refresh the page or try again later.</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['agent-onboarding-status'] })}
            className="px-5 py-2 bg-[#2D1B69] text-white text-sm font-medium rounded-lg hover:bg-[#3B2B85] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const uploadedDocs = data?.documents ?? {}
  const totalUploaded = Object.keys(uploadedDocs).length
  const wasRejected = data?.agent.status === 'rejected'
  const isSubmitting = draftMutation.isPending || submitMutation.isPending

  return (
    <div className="min-h-screen bg-[var(--color-surface-warm,#FFFCF5)]">
      <Toaster position="top-center" richColors />

      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[#2D1B69] flex items-center justify-center">
            <span className="text-white text-xs font-bold">TGA</span>
          </div>
          <span className="font-semibold text-[#2D1B69] text-sm">The Global Avenues</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <OnboardingTabs />

        {wasRejected && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-red-900 mb-1">Your previous application was not approved</h3>
            <p className="text-sm text-red-700">
              {data?.agent.rejected_reason || 'No reason was provided.'}
            </p>
            <p className="text-xs text-red-600 mt-2">
              Update the details below and submit again when you're ready.
            </p>
          </div>
        )}

        {/* Welcome card */}
        <div className="bg-gradient-to-br from-[#2D1B69] to-[#3B2B85] rounded-2xl p-7 text-white">
          <p className="text-sm text-purple-200 mb-1">Partner Application</p>
          <h1 className="text-2xl font-bold mb-1">
            {wasRejected ? 'Update Your Application' : "Let's Get You Onboarded"}
          </h1>
          <p className="text-sm text-purple-100 leading-relaxed">
            Fill in your details and upload the required documents below. You can save your progress as a
            draft and come back anytime — nothing is final until you submit.
          </p>
        </div>

        {/* Profile form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Partner Details</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Name and mobile number were set during registration. Update them from your Profile page.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LockedField label="First Name" value={form.first_name} />
            <LockedField label="Last Name" value={form.last_name} />
          </div>

          <Field label="Full Address" required>
            <textarea
              className={`${inputClass} min-h-[80px] resize-none`}
              value={form.address_line}
              onChange={(e) => updateField('address_line', e.target.value)}
              placeholder="House / street / area"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="City" required>
              <input
                className={inputClass}
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="City"
              />
            </Field>
            <Field label="State" required>
              <select
                className={inputClass}
                value={form.state}
                onChange={(e) => updateField('state', e.target.value)}
              >
                <option value="">Select state</option>
                {INDIAN_STATES_AND_UTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LockedField label="Mobile Number" value={form.mobile_number} />
            <Field label="Alternate Mobile Number">
              <input
                className={inputClass}
                value={form.alternate_mobile_number}
                onChange={(e) => updateField('alternate_mobile_number', e.target.value)}
                placeholder="Optional"
                inputMode="tel"
              />
            </Field>
          </div>
        </div>

        {/* Documents */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900 px-1">Required Documents</h2>

          {DOCS.map((doc) => {
            const uploaded = uploadedDocs[doc.key] as AgentOnboardingDoc | undefined
            const isUploading = uploading === doc.key

            return (
              <div
                key={doc.key}
                className={`bg-white rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-all ${
                  uploaded ? 'border-green-200 bg-green-50/40' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      uploaded ? 'bg-green-100 text-green-600' : 'bg-[#2D1B69]/8 text-[#2D1B69]'
                    }`}
                  >
                    {uploaded ? <CheckCircle2 className="h-5 w-5" /> : doc.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{doc.label}</span>
                      <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                        Required
                      </span>
                    </div>
                    {uploaded ? (
                      <p className="text-xs text-green-600 mt-0.5 truncate">{uploaded.filename}</p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5">{doc.hint}</p>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <input
                    ref={(el) => {
                      fileRefs.current[doc.key] = el
                    }}
                    type="file"
                    accept={doc.accept}
                    className="hidden"
                    onChange={(e) => handleFileChange(doc.key, e)}
                  />
                  <button
                    onClick={() => fileRefs.current[doc.key]?.click()}
                    disabled={isUploading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${
                      uploaded
                        ? 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                        : 'bg-[#D96200] text-white hover:bg-[#C15700]'
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Uploading…
                      </>
                    ) : uploaded ? (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        Replace
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        Upload
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}

          {totalUploaded > 0 && (
            <p className="text-xs text-gray-500 px-1">
              {totalUploaded} of {DOCS.length} document{DOCS.length !== 1 ? 's' : ''} uploaded
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => draftMutation.mutate()}
            disabled={isSubmitting}
            className="flex-1 px-5 py-3 rounded-xl text-sm font-bold border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            {draftMutation.isPending ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            onClick={() => submitMutation.mutate()}
            disabled={isSubmitting}
            className="flex-1 px-5 py-3 rounded-xl text-sm font-bold text-white bg-[#2D1B69] hover:bg-[#231552] transition-colors disabled:opacity-60"
          >
            {submitMutation.isPending ? 'Submitting…' : 'Submit Application'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 pb-6">
          Questions? Email us at{' '}
          <span className="text-[#D96200] font-medium">partners@theglobalavenues.com</span>
        </p>
      </main>
    </div>
  )
}
