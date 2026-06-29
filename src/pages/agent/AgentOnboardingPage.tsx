import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast, Toaster } from 'sonner'
import {
  CheckCircle2,
  Clock,
  Upload,
  FileText,
  Image,
  FileBadge,
  LogOut,
  AlertCircle,
  X,
} from 'lucide-react'
import {
  fetchAgentOnboardingStatus,
  uploadAgentOnboardingDocument,
  type AgentOnboardingDoc,
} from '../../lib/api'
import { useAuth } from '../../shared/hooks/useAuth'

type DocType = 'business_registration' | 'agency_logo' | 'partnership_scope_doc'

interface DocConfig {
  key: DocType
  label: string
  required: boolean
  accept: string
  hint: string
  icon: React.ReactNode
}

const DOCS: DocConfig[] = [
  {
    key: 'business_registration',
    label: 'Business Registration Certificate',
    required: true,
    accept: 'application/pdf,image/jpeg,image/png',
    hint: 'PDF or image — proof of your agency registration',
    icon: <FileBadge className="h-5 w-5" />,
  },
  {
    key: 'agency_logo',
    label: 'Agency Logo',
    required: false,
    accept: 'image/jpeg,image/png',
    hint: 'JPEG or PNG — your brand logo (optional)',
    icon: <Image className="h-5 w-5" />,
  },
  {
    key: 'partnership_scope_doc',
    label: 'Partnership Scope Document',
    required: false,
    accept: 'application/pdf',
    hint: 'PDF — outline of markets you operate in (optional)',
    icon: <FileText className="h-5 w-5" />,
  },
]

export default function AgentOnboardingPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileRefs = useRef<Record<DocType, HTMLInputElement | null>>({
    business_registration: null,
    agency_logo: null,
    partnership_scope_doc: null,
  })

  const [uploading, setUploading] = useState<DocType | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['agent-onboarding-status'],
    queryFn: fetchAgentOnboardingStatus,
    staleTime: 30_000,
  })

  const uploadMutation = useMutation({
    mutationFn: ({ file, docType }: { file: File; docType: DocType }) =>
      uploadAgentOnboardingDocument(file, docType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-onboarding-status'] })
      toast.success('Document uploaded successfully.')
      setUploading(null)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Upload failed. Please try again.')
      setUploading(null)
    },
  })

  const handleFileChange = (docType: DocType, e: React.ChangeEvent<HTMLInputElement>) => {
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

  const uploadedDocs = data?.documents ?? {}
  const requiredUploaded = !!uploadedDocs.business_registration
  const totalUploaded = Object.keys(uploadedDocs).length

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-warm,#FFFCF5)] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-[#2D1B69] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[var(--color-text-muted,#6B7280)]">Loading your onboarding status…</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-warm,#FFFCF5)] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-red-100 p-8 max-w-md w-full text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-semibold text-gray-900">Could not load onboarding status</h2>
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

  const agentName = data?.agent?.full_name || user?.name || 'Partner'
  const agencyName = data?.agent?.agency_name || ''

  return (
    <div className="min-h-screen bg-[var(--color-surface-warm,#FFFCF5)]">
      <Toaster position="top-center" richColors />

      {/* Header */}
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

        {/* Welcome card */}
        <div className="bg-gradient-to-br from-[#2D1B69] to-[#3B2B85] rounded-2xl p-7 text-white">
          <p className="text-sm text-purple-200 mb-1">Partner Application</p>
          <h1 className="text-2xl font-bold mb-1">Welcome, {agentName}!</h1>
          {agencyName && (
            <p className="text-sm text-purple-200 mb-4">{agencyName}</p>
          )}
          <p className="text-sm text-purple-100 leading-relaxed">
            You're one step away from joining our global partner network. Upload your agency
            documents below so our team can verify your account.
          </p>
        </div>

        {/* Progress steps */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-5">
            Application Progress
          </h2>
          <div className="flex items-center gap-0">
            {/* Step 1 */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:block">Basic Info</span>
            </div>

            <div className="flex-1 h-0.5 bg-gray-200 mx-3" />

            {/* Step 2 */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[#D96200] flex items-center justify-center flex-shrink-0 ring-4 ring-orange-100">
                <Upload className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-[#D96200] hidden sm:block">Documents</span>
            </div>

            <div className="flex-1 h-0.5 bg-gray-200 mx-3" />

            {/* Step 3 */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Clock className="h-4 w-4 text-gray-400" />
              </div>
              <span className="text-sm font-medium text-gray-400 hidden sm:block">Admin Review</span>
            </div>
          </div>
          {totalUploaded > 0 && (
            <p className="mt-4 text-xs text-gray-500">
              {totalUploaded} of {DOCS.length} document{DOCS.length !== 1 ? 's' : ''} uploaded
              {requiredUploaded ? ' — required document received' : ''}
            </p>
          )}
        </div>

        {/* Documents */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900 px-1">Supporting Documents</h2>

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
                {/* Icon + labels */}
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
                      {doc.required && (
                        <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                          Required
                        </span>
                      )}
                    </div>
                    {uploaded ? (
                      <p className="text-xs text-green-600 mt-0.5 truncate">{uploaded.filename}</p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5">{doc.hint}</p>
                    )}
                  </div>
                </div>

                {/* Action */}
                <div className="flex-shrink-0">
                  <input
                    ref={(el) => { fileRefs.current[doc.key] = el }}
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
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-blue-900">What happens next?</h3>
          <ul className="space-y-2">
            {[
              'Our compliance team will review your application within 2–3 business days.',
              'You will receive an email notification once your account is approved.',
              'After approval, you can start referring students and tracking commissions.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-blue-700">
                <CheckCircle2 className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 pb-6">
          Questions? Email us at{' '}
          <span className="text-[#D96200] font-medium">partners@theglobalavenues.com</span>
        </p>
      </main>
    </div>
  )
}
