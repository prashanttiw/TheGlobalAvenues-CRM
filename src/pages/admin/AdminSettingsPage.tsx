import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { usePermission } from '../../hooks/usePermission'
import { ForbiddenPage } from '../../shared/components/ui/ForbiddenPage'
import { toast } from 'sonner'
import { Settings, ShieldAlert, Key, Upload, Bell, Database } from 'lucide-react'

export default function AdminSettingsPage() {
  const isSuperAdmin = usePermission('settings', 'manage')

  if (!isSuperAdmin) {
    return <ForbiddenPage />
  }

  const handleSaveGroup = (groupName: string) => {
    toast.success(`${groupName} settings updated successfully!`)
  }

  return (
    <PageWrapper className="space-y-8">
      <PageHeader 
        title="System Settings" 
        subtitle="Manage global configurations, integrations, and environment controls." 
      />

      <div className="space-y-6">
        {/* OTP Settings */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2 border-b border-border-warm">
            <Key className="h-5 w-5 text-brand-orange-accessible" />
            <CardTitle className="text-base font-semibold text-brand-navy">OTP Settings</CardTitle>
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">OTP Validity Duration</label>
                <input 
                  type="text" 
                  defaultValue="5 minutes" 
                  className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Time duration before generated verification codes expire.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Max Retry Attempts</label>
                <input 
                  type="number" 
                  defaultValue={3} 
                  className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Maximum verification retries before lock status triggers.</p>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-border-warm">
              <Button variant="primary" size="sm" onClick={() => handleSaveGroup('OTP')}>Save OTP Settings</Button>
            </div>
          </CardContent>
        </Card>

        {/* Upload Settings */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2 border-b border-border-warm">
            <Upload className="h-5 w-5 text-brand-navy" />
            <CardTitle className="text-base font-semibold text-brand-navy">Upload & Files</CardTitle>
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Max Document Size (MB)</label>
                <input 
                  type="number" 
                  defaultValue={10} 
                  className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Upload limit ceiling for student credentials and passports.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Allowed File Types</label>
                <input 
                  type="text" 
                  defaultValue=".pdf, .png, .jpg, .jpeg, .doc, .docx" 
                  className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Comma-delimited set of allowed file format extensions.</p>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-border-warm">
              <Button variant="primary" size="sm" onClick={() => handleSaveGroup('Upload')}>Save Upload Settings</Button>
            </div>
          </CardContent>
        </Card>

        {/* System Reminders */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2 border-b border-border-warm">
            <Bell className="h-5 w-5 text-brand-amber" />
            <CardTitle className="text-base font-semibold text-brand-navy">Automated Reminders</CardTitle>
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">SLA Alert Threshold (Hours)</label>
                <input 
                  type="number" 
                  defaultValue={48} 
                  className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Hours before unresolved agent requests trigger warning status.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Email Reminder Frequency</label>
                <select 
                  defaultValue="weekly"
                  className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
                >
                  <option value="daily">Daily digest</option>
                  <option value="weekly">Weekly digest</option>
                  <option value="off">Deactivated</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">Frequency for dispatching digest tables to administrators.</p>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-border-warm">
              <Button variant="primary" size="sm" onClick={() => handleSaveGroup('Reminders')}>Save Reminder Settings</Button>
            </div>
          </CardContent>
        </Card>

        {/* Database Backup */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2 border-b border-border-warm">
            <Database className="h-5 w-5 text-brand-navy" />
            <CardTitle className="text-base font-semibold text-brand-navy">Database & Backups</CardTitle>
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Backup Frequency</label>
                <select 
                  defaultValue="daily"
                  className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
                >
                  <option value="hourly">Hourly incremental</option>
                  <option value="daily">Daily full dump</option>
                  <option value="weekly">Weekly snapshot</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">Schedules for automated snapshot pipelines.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Backup Retention Period</label>
                <input 
                  type="text" 
                  defaultValue="30 days" 
                  className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Length of time backup dumps persist before auto-purging.</p>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-border-warm">
              <Button variant="primary" size="sm" onClick={() => handleSaveGroup('Database')}>Save Backup Settings</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
