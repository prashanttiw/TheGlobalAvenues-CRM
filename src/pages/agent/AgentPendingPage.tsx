import { ArrowLeft, Clock3, LogOut, Mail } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchAgentOnboardingStatus } from '../../lib/api'
import { useAuth } from '../../shared/hooks/useAuth'

const SUPPORT_EMAIL = 'connect@theglobalavenues.com'

export default function AgentPendingPage() {
  const navigate = useNavigate()
  const logout = useAuth((state) => state.logout)

  const { data } = useQuery({
    queryKey: ['agent-onboarding-status'],
    queryFn: fetchAgentOnboardingStatus,
    staleTime: 10_000,
  })

  const submittedLabel = data?.agent.created_at
    ? new Date(data.agent.created_at).toLocaleString()
    : null

  const handleLogout = () => {
    void logout().finally(() => {
      navigate('/portal/login', { replace: true })
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFCF5] via-white to-[#F4F0FF] px-6 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-2xl items-center justify-center">
        <section className="w-full rounded-[28px] border border-[#E8E4DE] bg-white p-8 shadow-[0_24px_60px_rgba(45,27,105,0.12)] sm:p-10">
          <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2D1B69]/10 text-[#2D1B69]">
            <Clock3 className="h-7 w-7" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#2D1B69]/60">Agent Application</p>
          <h1 className="mt-3 text-3xl font-black text-[#1E2A4A]">Your application is under review.</h1>
          <p className="mt-4 text-sm leading-6 text-[#5B6475]">
            Thanks for submitting your partner application. Our team typically reviews applications within
            2–3 business days — you'll receive an email once a decision has been made.
          </p>

          <div className="mt-8 space-y-4 rounded-2xl border border-[#E8E4DE] bg-[#FAFAF8] p-5 text-sm text-[#1E2A4A]">
            {data?.agent.full_name && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-[#2D1B69]" />
                <span>{data.agent.full_name}</span>
              </div>
            )}
            {submittedLabel && <p><strong>Registered:</strong> {submittedLabel}</p>}
            <p><strong>Support:</strong> {SUPPORT_EMAIL}</p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2D1B69] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#231552]"
            >
              <LogOut className="h-4 w-4" />
              Back to login
            </button>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8D0EA] px-5 py-3 text-sm font-bold text-[#2D1B69] transition hover:bg-[#F6F1FF]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to website
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
