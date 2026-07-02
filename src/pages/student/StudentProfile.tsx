import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { useAuth } from '../../shared/hooks/useAuth'
import { toast } from 'sonner'
import { User, Shield, Key, Eye, EyeOff, FileCheck } from 'lucide-react'
import {
  changePassword,
  fetchReadiness,
  fetchStudentProfile,
  updateStudentProfile,
  type StudentProfileResponse,
} from '../../lib/api'
import { isProfileReady } from '../../shared/constants/readiness'

type ProfileFormState = {
  first_name: string
  last_name: string
  email: string
  phone: string
  dob: string
  nationality: string
  passport_number: string
  passport_expiry: string
}

type PasswordFormState = {
  current_password: string
  new_password: string
  confirm_password: string
}

type PasswordFieldKey = keyof PasswordFormState

function toProfileForm(profile: StudentProfileResponse): ProfileFormState {
  return {
    first_name: profile.first_name ?? '',
    last_name: profile.last_name ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    dob: profile.dob ?? '',
    nationality: profile.nationality ?? '',
    passport_number: profile.passport_number ?? '',
    passport_expiry: profile.passport_expiry ?? '',
  }
}

function buildDisplayName(firstName: string, lastName: string, fallbackEmail = ''): string {
  const fullName = `${firstName} ${lastName}`.trim()
  return fullName || fallbackEmail
}

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

export default function StudentProfile() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = React.useState<StudentProfileResponse | null>(null)
  const [formData, setFormData] = React.useState<ProfileFormState>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    dob: '',
    nationality: '',
    passport_number: '',
    passport_expiry: '',
  })
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

  const [readiness, setReadiness] = React.useState<any>(null)

  const loadProfile = React.useCallback(async () => {
    try {
      setLoading(true)
      const nextProfile = await fetchStudentProfile()
      setProfile(nextProfile)
      setFormData(toProfileForm(nextProfile))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load profile.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadReadiness = React.useCallback(async () => {
    try {
      const data = await fetchReadiness()
      setReadiness(data)
    } catch (error) {
      // Non-fatal: the profile summary card simply won't render.
    }
  }, [])

  React.useEffect(() => {
    void loadProfile()
    void loadReadiness()
  }, [loadProfile, loadReadiness])

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
    try {
      setSavingProfile(true)
      const updated = await updateStudentProfile(formData)
      setProfile(updated)
      setFormData(toProfileForm(updated))
      setIsEditing(false)

      const nextDisplayName = buildDisplayName(updated.first_name, updated.last_name, updated.email ?? user?.email ?? '')
      useAuth.setState((state) => ({
        user: state.user
          ? {
              ...state.user,
              name: nextDisplayName,
              email: updated.email ?? state.user.email,
            }
          : null,
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

  const titleName = buildDisplayName(formData.first_name, formData.last_name)

  if (loading) {
    return (
      <PageWrapper className="flex min-h-[320px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border-warm border-t-brand-orange-accessible" />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper className="space-y-6 sm:space-y-8">
      <PageHeader
        title={titleName ? `Student Profile - ${titleName}` : 'Student Profile'}
        subtitle="Manage your personal credentials, study profile, and account security."
        actions={
          isEditing ? (
            <div className="flex flex-wrap gap-2">
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
          <CardHeader className="flex flex-row items-center gap-3 border-b border-border-warm pb-3">
            <User className="h-5 w-5 text-brand-orange-accessible" />
            <CardTitle className="text-base font-semibold text-brand-navy">Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">First Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="w-full rounded-button border border-border-warm bg-surface-warm px-3.5 py-2 text-sm text-brand-navy shadow-sm transition-colors focus:border-brand-orange-accessible focus:outline-none focus:ring-2 focus:ring-brand-orange-accessible/20"
                  />
                ) : (
                  <FieldDisplay value={formData.first_name} />
                )}
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Last Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className="w-full rounded-button border border-border-warm bg-surface-warm px-3.5 py-2 text-sm text-brand-navy shadow-sm transition-colors focus:border-brand-orange-accessible focus:outline-none focus:ring-2 focus:ring-brand-orange-accessible/20"
                  />
                ) : (
                  <FieldDisplay value={formData.last_name} />
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date of Birth</label>
              {isEditing ? (
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className="w-full rounded-button border border-border-warm bg-surface-warm px-3.5 py-2 text-sm text-brand-navy shadow-sm transition-colors focus:border-brand-orange-accessible focus:outline-none focus:ring-2 focus:ring-brand-orange-accessible/20"
                />
              ) : (
                <FieldDisplay value={formData.dob} />
              )}
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nationality</label>
              {isEditing ? (
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleChange}
                  className="w-full rounded-button border border-border-warm bg-surface-warm px-3.5 py-2 text-sm text-brand-navy shadow-sm transition-colors focus:border-brand-orange-accessible focus:outline-none focus:ring-2 focus:ring-brand-orange-accessible/20"
                />
              ) : (
                <FieldDisplay value={formData.nationality} />
              )}
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Passport Number</label>
              {isEditing ? (
                <input
                  type="text"
                  name="passport_number"
                  value={formData.passport_number}
                  onChange={handleChange}
                  className="w-full rounded-button border border-border-warm bg-surface-warm px-3.5 py-2 text-sm text-brand-navy shadow-sm transition-colors focus:border-brand-orange-accessible focus:outline-none focus:ring-2 focus:ring-brand-orange-accessible/20"
                />
              ) : (
                <FieldDisplay value={formData.passport_number} />
              )}
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Passport Expiry</label>
              {isEditing ? (
                <input
                  type="date"
                  name="passport_expiry"
                  value={formData.passport_expiry}
                  onChange={handleChange}
                  className="w-full rounded-button border border-border-warm bg-surface-warm px-3.5 py-2 text-sm text-brand-navy shadow-sm transition-colors focus:border-brand-orange-accessible focus:outline-none focus:ring-2 focus:ring-brand-orange-accessible/20"
                />
              ) : (
                <FieldDisplay value={formData.passport_expiry} />
              )}
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
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-button border border-border-warm bg-surface-warm px-3.5 py-2 text-sm text-brand-navy shadow-sm transition-colors focus:border-brand-orange-accessible focus:outline-none focus:ring-2 focus:ring-brand-orange-accessible/20"
                  />
                ) : (
                  <FieldDisplay value={formData.email} />
                )}
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone Number</label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full rounded-button border border-border-warm bg-surface-warm px-3.5 py-2 text-sm text-brand-navy shadow-sm transition-colors focus:border-brand-orange-accessible focus:outline-none focus:ring-2 focus:ring-brand-orange-accessible/20"
                  />
                ) : (
                  <FieldDisplay value={formData.phone} />
                )}
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

      {readiness && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border-warm pb-2">
            <div className="flex items-center gap-3">
              <FileCheck className={`h-5 w-5 ${isProfileReady(readiness.profile_status) ? 'text-emerald-600' : 'text-amber-600'}`} />
              <CardTitle className="text-base font-semibold text-brand-navy">Application Profile</CardTitle>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate('/portal/student/profile/complete')}>
              {isProfileReady(readiness.profile_status) ? 'Edit' : 'Complete Profile'}
            </Button>
          </CardHeader>
          <CardContent className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              {isProfileReady(readiness.profile_status)
                ? 'Your personal details, academic history, and documents are complete — apply to any program without re-entering this information.'
                : 'Finish your personal details, academic history, and required documents to unlock applying to programs.'}
            </p>
            <p className="text-xs text-muted-foreground">{(readiness.documents ?? []).length} document(s) on file</p>
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  )
}
