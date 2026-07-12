import * as React from 'react'
import { useState, useEffect } from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { usePermission } from '../../hooks/usePermission'
import { ForbiddenPage } from '../../shared/components/ui/ForbiddenPage'
import { toast } from 'sonner'
import { Settings as SettingsIcon, ShieldAlert, Key, Upload, Activity, GraduationCap } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { formatDistanceToNow } from 'date-fns'

interface SystemSetting {
  setting_key: string;
  setting_value: string;
  value_type: 'string' | 'integer' | 'boolean' | 'json';
  label: string;
  description: string;
  is_editable: number;
}

type SettingsGroup = Record<string, SystemSetting[]>;

// Settings whose only effect runs on a periodic cron job (disk usage is checked every 12h by
// cron/monitor-disk.php) rather than taking effect immediately — hidden here since we aren't
// actively managing them right now. Backend rows + cron logic are left untouched.
const HIDDEN_SETTING_KEYS = new Set(['disk_warn_threshold_pct', 'disk_critical_threshold_pct'])

export default function AdminSettingsPage() {
  const canView = usePermission('system_settings', 'view')
  const canEdit = usePermission('system_settings', 'edit')

  const queryClient = useQueryClient()
  const [localValues, setLocalValues] = useState<Record<string, string>>({})

  const { data: rawSettingsGroups, isLoading, isError } = useQuery<SettingsGroup>({
    queryKey: ['admin', 'system-settings'],
    queryFn: () => api.get('/admin/system-settings').then(r => r.data),
  })

  const settingsGroups = React.useMemo(() => {
    if (!rawSettingsGroups) return rawSettingsGroups
    const filtered: SettingsGroup = {}
    for (const [groupName, settings] of Object.entries(rawSettingsGroups)) {
      const visible = settings.filter(s => !HIDDEN_SETTING_KEYS.has(s.setting_key))
      if (visible.length > 0) filtered[groupName] = visible
    }
    return filtered
  }, [rawSettingsGroups])

  const { data: recentChanges } = useQuery({
    queryKey: ['admin', 'system-settings-audit'],
    // '/admin/logs' was never a registered route (always 404'd, so this widget was permanently
    // empty) — the real endpoint is activity-logs (ActivityLogController::adminList(), self-scoped,
    // no extra permission beyond being an authenticated admin — matches system_settings.view already
    // gating this whole page). Its response is Response::json(['data' => ...]), a single wrapper
    // already matching request()'s ApiSuccess<T>.data, so a single unwrap is correct here too.
    queryFn: () => api.get('/admin/activity-logs?target_type=system_setting&per_page=10').then(r => r.data),
  })

  useEffect(() => {
    if (isError) {
      toast.error('Failed to load system settings')
    }
  }, [isError])

  useEffect(() => {
    if (settingsGroups) {
      const initial: Record<string, string> = {}
      Object.values(settingsGroups).flat().forEach(setting => {
        initial[setting.setting_key] = setting.setting_value
      })
      setLocalValues(initial)
    }
  }, [settingsGroups])

  const saveMutation = useMutation({
    mutationFn: (payload: { settings: { key: string; value: string }[] }) =>
      api.put('/admin/system-settings', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'system-settings'] })
      toast.success('Settings saved successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Failed to save settings')
    },
  })

  if (!canView) {
    return <ForbiddenPage />
  }

  const handleSaveGroup = (groupName: string) => {
    if (!settingsGroups || !settingsGroups[groupName]) return

    const settingsToSave = settingsGroups[groupName]
      .filter(s => s.is_editable === 1)
      .map(s => ({
        key: s.setting_key,
        value: localValues[s.setting_key] ?? s.setting_value
      }))

    saveMutation.mutate({ settings: settingsToSave })
  }

  const handleChange = (key: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [key]: value }))
  }

  const getGroupIcon = (group: string) => {
    switch (group.toLowerCase()) {
      case 'otp': return <Key className="h-5 w-5 text-brand-orange-accessible" />
      case 'upload': return <Upload className="h-5 w-5 text-brand-navy" />
      case 'security': return <ShieldAlert className="h-5 w-5 text-red-500" />
      case 'applications': return <GraduationCap className="h-5 w-5 text-brand-orange-accessible" />
      default: return <SettingsIcon className="h-5 w-5 text-gray-500" />
    }
  }

  return (
    <PageWrapper className="space-y-8">
      <PageHeader 
        title="System Settings" 
        subtitle="Manage global configurations, integrations, and environment controls." 
      />

      {isLoading ? (
        <div className="flex justify-center p-12"><Activity className="w-6 h-6 animate-spin text-brand-orange-accessible" /></div>
      ) : (
        <div className="space-y-6">
          {settingsGroups && Object.entries(settingsGroups).map(([groupName, settings]) => (
            <Card key={groupName}>
              <CardHeader className="flex flex-row items-center gap-3 pb-2 border-b border-border-warm">
                {getGroupIcon(groupName)}
                <CardTitle className="text-base font-semibold text-brand-navy capitalize">{groupName} Settings</CardTitle>
              </CardHeader>
              <CardContent className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {settings.map(setting => (
                    <div key={setting.setting_key}>
                      <label className="text-xs font-semibold text-brand-navy block mb-1">
                        {setting.label}
                      </label>
                      {setting.value_type === 'boolean' ? (
                        <select
                          value={localValues[setting.setting_key] ?? setting.setting_value}
                          onChange={(e) => handleChange(setting.setting_key, e.target.value)}
                          disabled={!canEdit || setting.is_editable === 0}
                          className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none disabled:opacity-50"
                        >
                          <option value="1">Enabled</option>
                          <option value="0">Disabled</option>
                        </select>
                      ) : setting.value_type === 'json' ? (
                        <textarea
                          value={localValues[setting.setting_key] ?? setting.setting_value}
                          onChange={(e) => handleChange(setting.setting_key, e.target.value)}
                          disabled={!canEdit || setting.is_editable === 0}
                          rows={3}
                          className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none font-mono disabled:opacity-50"
                        />
                      ) : (
                        <input
                          type={setting.value_type === 'integer' ? 'number' : 'text'}
                          value={localValues[setting.setting_key] ?? setting.setting_value}
                          onChange={(e) => handleChange(setting.setting_key, e.target.value)}
                          disabled={!canEdit || setting.is_editable === 0}
                          className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none disabled:opacity-50"
                        />
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">{setting.description}</p>
                    </div>
                  ))}
                </div>
                {canEdit && (
                  <div className="flex justify-end pt-4 border-t border-border-warm">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSaveGroup(groupName)}
                      isLoading={saveMutation.isPending}
                    >
                      Save {groupName} Settings
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader className="flex flex-row items-center gap-3 pb-2 border-b border-border-warm">
              <Activity className="h-5 w-5 text-brand-navy" />
              <CardTitle className="text-base font-semibold text-brand-navy">Recent Configuration Changes</CardTitle>
            </CardHeader>
            <CardContent className="mt-4">
              <div className="space-y-4">
                {(!recentChanges || recentChanges.length === 0) ? (
                  <p className="text-xs text-muted-foreground">No recent changes found.</p>
                ) : (
                  recentChanges.map((log: any) => (
                    <div key={log.id} className="text-xs border-b border-border-warm last:border-0 pb-3 last:pb-0">
                      {/* target_display is always null for system_setting.changed entries (never
                          populated by ActivityLogger for this action) — label is the same backend's
                          pre-formatted, human-readable description and already includes the actor
                          name and the before/after values, so it doesn't need reassembling here. */}
                      <div className="font-semibold text-brand-navy">
                        {log.label ?? `${log.actor_display_name} updated a setting`}
                      </div>
                      <div className="text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageWrapper>
  )
}
