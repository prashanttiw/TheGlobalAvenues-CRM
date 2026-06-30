import { useNavigate } from 'react-router-dom'
import { LogOut, Globe2, Users, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../shared/hooks/useAuth'
import { OnboardingTabs } from './OnboardingTabs'

export default function AgentInfoPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/portal/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface-warm,#FFFCF5)]">
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

        <div className="bg-gradient-to-br from-[#2D1B69] to-[#3B2B85] rounded-2xl p-7 text-white">
          <p className="text-sm text-purple-200 mb-1">About Us</p>
          <h1 className="text-2xl font-bold mb-3">The Global Avenues</h1>
          <p className="text-sm text-purple-100 leading-relaxed">
            An ICEF-certified international education consultancy helping students study abroad, and
            partnering with education agents worldwide to grow their student rosters and commission earnings.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: <Globe2 className="h-5 w-5" />, title: 'Global Reach', body: 'Partner universities and intakes across multiple countries.' },
            { icon: <Users className="h-5 w-5" />, title: 'Partner Network', body: 'A 3-tier agent network with commission tracking built in.' },
            { icon: <ShieldCheck className="h-5 w-5" />, title: 'Verified Partners', body: 'Every partner application is reviewed before activation.' },
          ].map((item) => (
            <div key={item.title} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="h-10 w-10 rounded-xl bg-[#2D1B69]/8 text-[#2D1B69] flex items-center justify-center mb-3">
                {item.icon}
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{item.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 pb-6">
          More details about working with TGA will appear here soon. Ready to get started? Head to the{' '}
          <span className="text-[#D96200] font-medium">Apply to Become a Partner</span> tab.
        </p>
      </main>
    </div>
  )
}
