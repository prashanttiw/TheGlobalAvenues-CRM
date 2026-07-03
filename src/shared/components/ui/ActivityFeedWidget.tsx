import React from 'react'
import { Activity, Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '../../../lib/api'
import * as Icons from 'lucide-react'

export function ActivityFeedWidget({ rolePrefix = 'admin' }: { rolePrefix?: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['activityFeed', rolePrefix],
    queryFn: () => api.get(`/${rolePrefix}/dashboard/activity-feed`).then(r => r.data),
    staleTime: 30_000,
  })

  const feed = Array.isArray(data) ? data : []

  // Rollup logic for consecutive identical actions by the same actor
  const rolledUpFeed = React.useMemo(() => {
    if (!feed || !feed.length) return []
    const result: any[] = []
    let currentGroup: any[] = [feed[0]]

    for (let i = 1; i < feed.length; i++) {
      const current = feed[i]
      const prev = feed[i - 1]
      
      // If same actor and action, group them
      if (current.actor_display_name === prev.actor_display_name && current.action === prev.action) {
        currentGroup.push(current)
      } else {
        result.push(currentGroup)
        currentGroup = [current]
      }
    }
    if (currentGroup.length > 0) result.push(currentGroup)
    return result
  }, [feed])

  if (isLoading) {
    return <div className="p-4 flex justify-center"><Activity className="animate-spin text-brand-orange-accessible w-6 h-6" /></div>
  }

  if (isError) {
    return <div className="text-sm text-red-500 py-4 text-center border border-red-200 bg-red-50 rounded-xl">Failed to load activity feed.</div>
  }

  return (
    <div className="space-y-3">
      {rolledUpFeed.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border-warm rounded-xl bg-white/40">No recent activity.</div>}
      
      {rolledUpFeed.map((group: any[], idx: number) => {
        const item = group[0]
        const Icon = (Icons as any)[item.icon] || Activity
        const count = group.length
        
        // Keep the same readable label when grouping repeats of the same
        // actor+action — just note the count, don't fall back to raw action keys.
        const displayLabel = count > 1 ? `${item.label} (×${count})` : item.label

        return (
          <div key={`${item.id || item.created_at}-${idx}`} className="flex items-start gap-3 rounded-2xl border border-border-warm bg-white p-3 hover:bg-surface-warm transition-colors">
            <div className="mt-0.5 rounded-full bg-brand-orange-accessible/10 p-1.5 text-brand-orange-accessible shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-brand-navy">
                {displayLabel}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1.5">
                <Clock className="w-3.5 h-3.5" />
                {item.time_ago}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
