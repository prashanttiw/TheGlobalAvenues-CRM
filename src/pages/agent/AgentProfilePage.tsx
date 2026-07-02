import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { toast } from 'sonner'
import { User, Shield, Key, Eye, EyeOff, Copy } from 'lucide-react'
import {
  changePassword,
  fetchAgentProfile,
  updateAgentProfile,
  type AgentProfileResponse,
} from '../../lib/api'

type ProfileFormState = {
  agency_name: string
  country: string
}

type PasswordFormState = {
  current_password: string
  new_password: string
  confirm_password: string
}

type PasswordFieldKey = keyof PasswordFormState

function toProfileForm(profile: AgentProfileResponse): ProfileFormState {
  return {
    agency_name: profile.agency_name ?? '',
    country: profile.country ?? '',
  }
}

function FieldDisplay({ value }: { value: string }) {
  const hasValue = value.trim().length > 0

  return (
    <div className="flex min-h-[42px] items-center rounded-md border border-border-warm bg-surface-warm px-3.5 py-2 text-sm text-brand-navy">
      {hasValue ? <span className="font-semibold text-brand-navy">{value}</span> : <span aria-hidden="true" className="opacity-0">empty</span>}
    </div>
  )
}

function PasswordField({
  name,
  placeholder,
  value,
  visible,
  disabled,
  onChange,
  onToggle,
}: {
  name: PasswordFieldKey
  placeholder: string
  value: string
  visible: boolean
  disabled: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onToggle: () => void
}) {
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full rounded-md border border-border-warm bg-surface-warm px-3.5 py-2 pr-11 text-sm text-brand-navy focus:border-brand-orange-accessible focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
      />
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label={visible ? `Hide ${placeholder}` : `Show ${placeholder}`}
        className="absolute inset-y-0 right-3 inline-flex items-center text-muted-foreground transition-colors hover:text-brand-navy disabled:cursor-not-allowed"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

export default function AgentProfilePage() {
  const [profile, setProfile] = React.useState<AgentProfileResponse | null>(null)
  const [formData, setFormData] = React.useState<ProfileFormState>({ agency_name: '', country: '' })
  const [passwordData, setPasswordData] = React.useState<PasswordFormState>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [showPassword, setShowPassword] = React.useState<Record<PasswordFieldKey, boolean>>({
    current_password: false,
    new_password: false,
    confirm_password: false,
  })
  const [loading, setLoading] = React.useState(true)
  const [isEditing, setIsEditing] = React.useState(false)
  const [isPasswordOpen, setIsPasswordOpen] = React.useState(false)
  const [savingProfile, setSavingProfile] = React.useState(false)
  const [savingPassword, setSavingPassword] = React.useState(false)

  const loadProfile = React.useCallback(async () => {
    try {
      setLoading(true)
      const nextProfile = await fetchAgentProfile()
      setProfile(nextProfile)
      setFormData(toProfileForm(nextProfile))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load profile.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData((prev) => ({ ...prev, [name]: value }))
  }

  const resetPasswordForm = React.useCallback(() => {
    setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
    setShowPassword({ current_password: false, new_password: false, confirm_password: false })
  }, [])

  const handleCancel = () => {
    if (profile) {
      setFormData(toProfileForm(profile))
    }
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (formData.agency_name.trim().length < 2) {
      toast.error('Agency name must be at least 2 characters.')
      return
    }

    try {
      setSavingProfile(true)
      await updateAgentProfile(formData)
      const updated = { ...profile, ...formData } as AgentProfileResponse
      setProfile(updated)
      setFormData(toProfileForm(updated))
      setIsEditing(false)
      toast.success('Profile saved successfully.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async () => {
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      toast.error('Fill all password fields first.')
      return
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match.')
      return
    }

    try {
      setSavingPassword(true)
      await changePassword(passwordData)
      resetPasswordForm()
      setIsPasswordOpen(false)
      toast.success('Password changed successfully.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to change password.')
    } finally {
      setSavingPassword(false)
    }
  }

  const copyCode = () => {
    if (!profile?.referral_code) return
    navigator.clipboard.writeText(profile.referral_code)
    toast.success('Referral code copied to clipboard')
  }

  if (loading) {
    return (
      <PageWrapper className="flex min-h-[320px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border-warm border-t-brand-orange-accessible" />
      </PageWrapper>
    )
  }

  if (!profile) {
    return (
      <PageWrapper>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Profile data unavailable.
        </div>
      </PageWrapper>
    )
  }

  const tierLabel = `Tier ${profile.tier} Agent`

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title={profile.full_name ? `Agency Profile - ${profile.full_name}` : 'Agency Profile'}
        subtitle="Manage your agency details, referral code, and account security."
        actions={
          isEditing ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleCancel} disabled={savingProfile}>Cancel</Button>
              <Button variant="primary" onClick={handleSave} isLoading={savingProfile}>Save Changes</Button>
            </div>
          ) : (
            <Button variant="primary" onClick={() => setIsEditing(true)}>Edit Profile</Button>
          )
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 border-b border-border-warm pb-2">
            <User className="h-5 w-5 text-brand-orange-accessible" />
            <CardTitle className="text-base font-semibold text-brand-navy">Agency Details</CardTitle>
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</label>
              <FieldDisplay value={profile.full_name ?? ''} />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Agency Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="agency_name"
                  value={formData.agency_name}
                  onChange={handleChange}
                  maxLength={200}
                  className="w-full rounded-md border border-border-warm bg-surface-warm px-3.5 py-2 text-sm text-brand-navy focus:border-brand-orange-accessible focus:outline-none"
                />
              ) : (
                <FieldDisplay value={formData.agency_name} />
              )}
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Country / Region</label>
              {isEditing ? (
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  maxLength={100}
                  className="w-full rounded-md border border-border-warm bg-surface-warm px-3.5 py-2 text-sm text-brand-navy focus:border-brand-orange-accessible focus:outline-none"
                />
              ) : (
                <FieldDisplay value={formData.country} />
              )}
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tier</label>
              <FieldDisplay value={tierLabel} />
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader className="flex flex-row items-center gap-3 border-b border-border-warm pb-2">
              <Shield className="h-5 w-5 text-brand-navy" />
              <CardTitle className="text-base font-semibold text-brand-navy">Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</label>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  profile.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-700'
                    : profile.status === 'suspended'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
                </span>
              </div>

              {profile.referral_code && (
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Referral Code</label>
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-medium text-brand-orange-accessible">{profile.referral_code}</p>
                    <button
                      type="button"
                      onClick={copyCode}
                      aria-label="Copy referral code"
                      className="inline-flex items-center text-muted-foreground transition-colors hover:text-brand-navy"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {!!profile.pending_student_requests && profile.pending_student_requests > 0 && (
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Students Requesting to Join You</label>
                  <p className="font-medium text-amber-600">
                    {profile.pending_student_requests} student{profile.pending_student_requests === 1 ? '' : 's'} asked to transfer to you, awaiting admin approval
                  </p>
                </div>
              )}
            </CardContent>
          </div>

          <CardContent className="mt-auto border-t border-border-warm pt-6">
            {isPasswordOpen ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
                  <Key className="h-4 w-4" />
                  Change Password
                </div>
                <PasswordField
                  name="current_password"
                  placeholder="Current password"
                  value={passwordData.current_password}
                  visible={showPassword.current_password}
                  disabled={savingPassword}
                  onChange={handlePasswordChange}
                  onToggle={() => setShowPassword((prev) => ({ ...prev, current_password: !prev.current_password }))}
                />
                <PasswordField
                  name="new_password"
                  placeholder="New password"
                  value={passwordData.new_password}
                  visible={showPassword.new_password}
                  disabled={savingPassword}
                  onChange={handlePasswordChange}
                  onToggle={() => setShowPassword((prev) => ({ ...prev, new_password: !prev.new_password }))}
                />
                <PasswordField
                  name="confirm_password"
                  placeholder="Confirm new password"
                  value={passwordData.confirm_password}
                  visible={showPassword.confirm_password}
                  disabled={savingPassword}
                  onChange={handlePasswordChange}
                  onToggle={() => setShowPassword((prev) => ({ ...prev, confirm_password: !prev.confirm_password }))}
                />
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => {
                    setIsPasswordOpen(false)
                    resetPasswordForm()
                  }} disabled={savingPassword}>
                    Cancel
                  </Button>
                  <Button variant="primary" className="flex-1" onClick={handlePasswordSubmit} isLoading={savingPassword}>
                    Update Password
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="secondary" className="flex w-full items-center justify-center gap-2" onClick={() => setIsPasswordOpen(true)}>
                <Key className="h-4 w-4" />
                Change Password
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
