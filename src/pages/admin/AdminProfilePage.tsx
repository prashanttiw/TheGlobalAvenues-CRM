import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { AvatarPicker } from '../../shared/components/ui/AvatarPicker'
import { useAuth } from '../../shared/hooks/useAuth'
import { toast } from 'sonner'
import { User, Shield, Key, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import {
  changePassword,
  fetchAdminProfile,
  toggle2FA,
  updateAdminProfile,
  type AdminProfileResponse,
  type AvatarUpdateResponse,
} from '../../lib/api'

type PasswordFormState = {
  current_password: string
  new_password: string
  confirm_password: string
}

type PasswordFieldKey = keyof PasswordFormState

function FieldDisplay({ value }: { value: string }) {
  const hasValue = value.trim().length > 0

  return (
    <div className="flex min-h-[42px] items-center rounded-button border border-border-warm bg-surface-card px-3.5 py-2 text-sm text-brand-navy shadow-sm">
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
        className="w-full rounded-button border border-border-warm bg-surface-warm px-3.5 py-2 pr-11 text-sm text-brand-navy shadow-sm transition-colors focus:border-brand-orange-accessible focus:outline-none focus:ring-2 focus:ring-brand-orange-accessible/20 disabled:cursor-not-allowed disabled:opacity-70"
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

export default function AdminProfilePage() {
  const [profile, setProfile] = React.useState<AdminProfileResponse | null>(null)
  const [fullName, setFullName] = React.useState('')
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
  const [is2faFormOpen, setIs2faFormOpen] = React.useState(false)
  const [twoFaPassword, setTwoFaPassword] = React.useState('')
  const [showTwoFaPassword, setShowTwoFaPassword] = React.useState(false)
  const [saving2fa, setSaving2fa] = React.useState(false)

  const loadProfile = React.useCallback(async () => {
    try {
      setLoading(true)
      const nextProfile = await fetchAdminProfile()
      setProfile(nextProfile)
      setFullName(nextProfile.full_name ?? '')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load profile.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadProfile()
  }, [loadProfile])

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
      setFullName(profile.full_name ?? '')
    }
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (fullName.trim().length < 2) {
      toast.error('Full name must be at least 2 characters.')
      return
    }

    try {
      setSavingProfile(true)
      await updateAdminProfile({ full_name: fullName.trim() })
      const updated = profile ? { ...profile, full_name: fullName.trim() } : profile
      setProfile(updated)
      setIsEditing(false)

      useAuth.setState((state) => ({
        user: state.user ? { ...state.user, name: fullName.trim() } : null,
      }))

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

  const handleToggle2FA = async () => {
    if (!twoFaPassword) {
      toast.error('Enter your password to confirm this change.')
      return
    }

    const nextEnabled = !profile?.two_factor_enabled

    try {
      setSaving2fa(true)
      await toggle2FA({ enable: nextEnabled, password: twoFaPassword })
      setProfile((prev) => (prev ? { ...prev, two_factor_enabled: nextEnabled } : prev))
      setTwoFaPassword('')
      setShowTwoFaPassword(false)
      setIs2faFormOpen(false)
      toast.success(nextEnabled ? 'Two-factor authentication enabled.' : 'Two-factor authentication disabled.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update two-factor authentication.')
    } finally {
      setSaving2fa(false)
    }
  }

  const handleAvatarChange = (result: AvatarUpdateResponse) => {
    setProfile((prev) => (prev ? { ...prev, avatar_url: result.avatar_url, avatar_thumb_url: result.avatar_thumb_url } : prev))
    useAuth.getState().updateAvatar(result.avatar_thumb_url)
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

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title={profile.full_name ? `Admin Profile - ${profile.full_name}` : 'Admin Profile'}
        subtitle="Manage your account details and security."
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

      <Card>
        <CardContent className="flex items-center gap-4 py-5">
          <AvatarPicker
            name={profile.full_name || 'Admin'}
            avatarUrl={profile.avatar_url}
            avatarThumbUrl={profile.avatar_thumb_url}
            onChange={handleAvatarChange}
          />
          <div>
            <p className="text-sm font-semibold text-brand-navy">Profile photo</p>
            <p className="text-xs text-muted-foreground">Choose a preset avatar or upload your own photo.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 border-b border-border-warm pb-3">
            <User className="h-5 w-5 text-brand-orange-accessible" />
            <CardTitle className="text-base font-semibold text-brand-navy">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={255}
                  className="w-full rounded-button border border-border-warm bg-surface-warm px-3.5 py-2 text-sm text-brand-navy shadow-sm transition-colors focus:border-brand-orange-accessible focus:outline-none focus:ring-2 focus:ring-brand-orange-accessible/20"
                />
              ) : (
                <FieldDisplay value={fullName} />
              )}
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Role</label>
              <span className="inline-flex items-center rounded-full bg-brand-navy/10 px-2.5 py-0.5 text-xs font-semibold text-brand-navy">
                {profile.role_name}
              </span>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Admin Since</label>
              <FieldDisplay value={new Date(profile.created_at).toLocaleDateString()} />
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader className="flex flex-row items-center gap-3 border-b border-border-warm pb-3">
              <Shield className="h-5 w-5 text-brand-navy" />
              <CardTitle className="text-base font-semibold text-brand-navy">Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
                <FieldDisplay value={profile.email ?? ''} />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone Number</label>
                <FieldDisplay value={profile.phone ?? ''} />
              </div>
            </CardContent>
          </div>

          <CardContent className="mt-auto border-t border-border-warm pt-5">
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
                <div className="flex flex-wrap gap-2">
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

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 border-b border-border-warm pb-3">
          <ShieldCheck className="h-5 w-5 text-brand-orange-accessible" />
          <CardTitle className="text-base font-semibold text-brand-navy">Two-Factor Authentication</CardTitle>
        </CardHeader>
        <CardContent className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-brand-navy">
                {profile.two_factor_enabled ? 'Enabled' : 'Disabled'}
              </p>
              <p className="text-xs text-muted-foreground">
                When enabled, a one-time code is emailed to you at every login in addition to your password.
              </p>
            </div>
            {!is2faFormOpen && (
              <Button
                variant={profile.two_factor_enabled ? 'secondary' : 'primary'}
                onClick={() => setIs2faFormOpen(true)}
              >
                {profile.two_factor_enabled ? 'Disable 2FA' : 'Enable 2FA'}
              </Button>
            )}
          </div>

          {is2faFormOpen && (
            <div className="max-w-sm space-y-3 border-t border-border-warm pt-4">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Confirm your password
              </label>
              <PasswordField
                name="current_password"
                placeholder="Password"
                value={twoFaPassword}
                visible={showTwoFaPassword}
                disabled={saving2fa}
                onChange={(e) => setTwoFaPassword(e.target.value)}
                onToggle={() => setShowTwoFaPassword((prev) => !prev)}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  disabled={saving2fa}
                  onClick={() => {
                    setIs2faFormOpen(false)
                    setTwoFaPassword('')
                    setShowTwoFaPassword(false)
                  }}
                >
                  Cancel
                </Button>
                <Button variant="primary" className="flex-1" onClick={handleToggle2FA} isLoading={saving2fa}>
                  {profile.two_factor_enabled ? 'Disable 2FA' : 'Enable 2FA'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  )
}
