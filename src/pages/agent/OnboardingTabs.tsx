import { useNavigate, useLocation } from 'react-router-dom'

const TABS = [
  { path: '/portal/agent/info', label: 'Company Info' },
  { path: '/portal/agent/onboarding', label: 'Apply to Become a Partner' },
] as const

export function OnboardingTabs() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 p-1.5">
      {TABS.map((tab) => {
        const active = location.pathname === tab.path
        return (
          <button
            key={tab.path}
            type="button"
            onClick={() => navigate(tab.path)}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              active ? 'bg-[#2D1B69] text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
