import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { useAuth } from '../../shared/hooks/useAuth'
import { toast } from 'sonner'
import { User, Shield, Key } from 'lucide-react'

export default function StudentProfile() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = React.useState(false)
  const [formData, setFormData] = React.useState({
    name: user?.name || 'Amit Tiwari',
    dob: '1998-05-14',
    nationality: 'Indian',
    passport: 'L8374829',
    email: user?.email || 'amit@example.com',
    phone: '+91 98765 43210'
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, name: value })) // Quick inline handler wrapper or standard:
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = () => {
    setIsEditing(false)
    toast.success('Profile saved successfully!')
  }

  return (
    <PageWrapper className="space-y-6">
      <PageHeader 
        title={`Student Profile — ${formData.name}`} 
        subtitle="Manage your personal credentials, study profiles and security."
        actions={
          isEditing ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSave}>Save Changes</Button>
            </div>
          ) : (
            <Button variant="primary" onClick={() => setIsEditing(true)}>Edit Profile</Button>
          )
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Info */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2 border-b border-border-warm">
            <User className="h-5 w-5 text-brand-orange-accessible" />
            <CardTitle className="text-base font-semibold text-brand-navy">Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Full Name</label>
              {isEditing ? (
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none focus:border-brand-orange-accessible"
                />
              ) : (
                <p className="text-sm font-semibold text-brand-navy">{formData.name}</p>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Date of Birth</label>
              {isEditing ? (
                <input 
                  type="date" 
                  name="dob" 
                  value={formData.dob} 
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none focus:border-brand-orange-accessible"
                />
              ) : (
                <p className="text-sm font-semibold text-brand-navy">{formData.dob}</p>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Nationality</label>
              {isEditing ? (
                <input 
                  type="text" 
                  name="nationality" 
                  value={formData.nationality} 
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none focus:border-brand-orange-accessible"
                />
              ) : (
                <p className="text-sm font-semibold text-brand-navy">{formData.nationality}</p>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Passport Number</label>
              {isEditing ? (
                <input 
                  type="text" 
                  name="passport" 
                  value={formData.passport} 
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none focus:border-brand-orange-accessible"
                />
              ) : (
                <p className="text-sm font-semibold text-brand-navy">{formData.passport}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader className="flex flex-row items-center gap-3 pb-2 border-b border-border-warm">
              <Shield className="h-5 w-5 text-brand-navy" />
              <CardTitle className="text-base font-semibold text-brand-navy">Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="mt-4 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Email Address</label>
                {isEditing ? (
                  <input 
                    type="email" 
                    name="email" 
                    value={formData.email} 
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none focus:border-brand-orange-accessible"
                  />
                ) : (
                  <p className="text-sm font-semibold text-brand-navy">{formData.email}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Phone Number</label>
                {isEditing ? (
                  <input 
                    type="tel" 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none focus:border-brand-orange-accessible"
                  />
                ) : (
                  <p className="text-sm font-semibold text-brand-navy">{formData.phone}</p>
                )}
              </div>
            </CardContent>
          </div>

          <CardContent className="mt-auto pt-6 border-t border-border-warm">
            <Button variant="secondary" className="w-full flex items-center justify-center gap-2">
              <Key className="h-4 w-4" />
              Change Password
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
