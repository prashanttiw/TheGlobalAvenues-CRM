import { ArrowLeft, LogOut, Mail, ShieldAlert } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../shared/hooks/useAuth'

type RejectedState = {
  email?: string
  message?: string
  rejectionReason?: string
}

const SUPPORT_EMAIL = 'connect@theglobalavenues.com'

export default function AgentRejectedPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAuth((state) => state.logout)
  const state = (location.state as RejectedState | null) ?? null

  const handleLogout = () => {
    void logout().finally(() => {
      navigate('/portal/login', { replace: true })
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F2] via-white to-[#FFF0EB] px-6 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-2xl items-center justify-center">
        <section className="w-full rounded-[28px] border border-[#F3D3C7] bg-white p-8 shadow-[0_24px_60px_rgba(201,77,27,0.12)] sm:p-10">
          <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C94D1B]/10 text-[#C94D1B]">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#C94D1B]/70">Agent Application</p>
          <h1 className="mt-3 text-3xl font-black text-[#1E2A4A]">Your application was not approved.</h1>
          <p className="mt-4 text-sm leading-6 text-[#5B6475]">
            {state?.message || 'The backend correctly denied portal access because this agent account does not have an approved status. No agent session is created for rejected applications.'}
          </p>

          <div className="mt-8 space-y-4 rounded-2xl border border-[#F3D3C7] bg-[#FFF8F2] p-5 text-sm text-[#1E2A4A]">
            {state?.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-[#C94D1B]" />
                <span>{state.email}</span>
              </div>
            )}
            <p><strong>Reason:</strong> {state?.rejectionReason || 'A rejection reason was not returned in the current response.'}</p>
            <p><strong>Support:</strong> {SUPPORT_EMAIL}</p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C94D1B] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#A53D15]"
            >
              <LogOut className="h-4 w-4" />
              Back to login
            </button>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#F3D3C7] px-5 py-3 text-sm font-bold text-[#C94D1B] transition hover:bg-[#FFF1EA]"
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


