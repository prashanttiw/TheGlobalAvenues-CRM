import * as React from 'react'
import { useEffect, useState } from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card'
import { User, Copy, Edit2, Save, X } from 'lucide-react'
import { Button } from '../../shared/components/ui/Button'
import { toast, Toaster } from 'sonner'
import { fetchAgentProfile, updateAgentProfile, type AgentProfileResponse } from '../../lib/api'

export default function AgentProfilePage() {
  const [profile, setProfile] = useState<AgentProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [agencyName, setAgencyName] = useState('')
  const [country, setCountry] = useState('')

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const data = await fetchAgentProfile()
        setProfile(data)
        setAgencyName(data.agency_name ?? '')
        setCountry(data.country ?? '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile.')
        toast.error('Failed to load agent profile.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const copyCode = () => {
    if (!profile?.referral_code) return
    navigator.clipboard.writeText(profile.referral_code)
    toast.success('Referral code copied to clipboard')
  }

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    try {
      await updateAgentProfile({ agency_name: agencyName, country })
      setProfile({ ...profile, agency_name: agencyName, country })
      setEditing(false)
      toast.success('Profile updated successfully.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setAgencyName(profile.agency_name ?? '')
      setCountry(profile.country ?? '')
    }
    setEditing(false)
  }

  if (loading) {
    return (
      <PageWrapper className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy mx-auto" />
          <p className="text-sm text-gray-500">Loading profile...</p>
        </div>
      </PageWrapper>
    )
  }

  if (error || !profile) {
    return (
      <PageWrapper>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error ?? 'Profile data unavailable.'}
        </div>
      </PageWrapper>
    )
  }

  const tierLabel = typeof profile.tier === 'number'
    ? `Tier ${profile.tier} Agent`
    : `${String(profile.tier).charAt(0).toUpperCase()}${String(profile.tier).slice(1)} Agent`

  return (
    <PageWrapper className="space-y-6">
      <Toaster position="top-center" richColors />
      <PageHeader
        title="Agency Profile"
        subtitle="View and update your agency details."
      />

      <Card>
        <CardHeader className="flex flex-row items-center space-x-4 pb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy">
            <User className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <CardTitle>{editing ? agencyName || 'Agency' : profile.agency_name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{tierLabel}</p>
          </div>
          <div className="flex gap-2">
            {profile.referral_code && (
              <Button variant="outline" onClick={copyCode} className="gap-2">
                <Copy className="h-4 w-4" /> Copy Referral Code
              </Button>
            )}
            {!editing ? (
              <Button variant="secondary" onClick={() => setEditing(true)} className="gap-2">
                <Edit2 className="h-4 w-4" /> Edit
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={handleCancel} className="gap-2" disabled={saving}>
                  <X className="h-4 w-4" /> Cancel
                </Button>
                <Button variant="primary" onClick={handleSave} isLoading={saving} className="gap-2">
                  <Save className="h-4 w-4" /> Save
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="mt-4 border-t border-border-warm pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Full Name</p>
              <p className="font-medium text-brand-navy">{profile.full_name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
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
            <div>
              <p className="text-xs text-muted-foreground">Agency Name</p>
              {editing ? (
                <input
                  className="mt-1 w-full rounded-lg border border-border-warm bg-surface-warm px-3 py-1.5 text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-orange-accessible"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  maxLength={200}
                />
              ) : (
                <p className="font-medium text-brand-navy">{profile.agency_name}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Country / Region</p>
              {editing ? (
                <input
                  className="mt-1 w-full rounded-lg border border-border-warm bg-surface-warm px-3 py-1.5 text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-orange-accessible"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  maxLength={100}
                />
              ) : (
                <p className="font-medium text-brand-navy">{profile.country ?? '—'}</p>
              )}
            </div>
            {profile.referral_code && (
              <div>
                <p className="text-xs text-muted-foreground">Referral Code</p>
                <p className="font-medium text-brand-orange-accessible font-mono">{profile.referral_code}</p>
              </div>
            )}
            {profile.pending_student_requests !== undefined && profile.pending_student_requests > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Pending Reassignment Requests</p>
                <p className="font-medium text-amber-600">{profile.pending_student_requests}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  )
}
