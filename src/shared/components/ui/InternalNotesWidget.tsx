import * as React from 'react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pin, Trash, Send, Paperclip, Activity } from 'lucide-react'
import { Button } from './Button'
import { toast } from 'sonner'
import api from '../../../lib/api'
import { usePermission } from '../../../hooks/usePermission'

interface Note {
  public_id: string
  content: string
  is_pinned: boolean
  visible_to_student: boolean
  visible_to_agent: boolean
  visible_to_admin: boolean
  created_at: string
  author: {
    full_name: string
    user_type: string
  }
}

interface InternalNotesWidgetProps {
  moduleName: 'students' | 'applications' | 'leads' | 'universities' | 'courses' | 'agents'
  recordId: string
}

export function InternalNotesWidget({ moduleName, recordId }: InternalNotesWidgetProps) {
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [visibleToStudent, setVisibleToStudent] = useState(false)
  const [visibleToAgent, setVisibleToAgent] = useState(false)

  // Assuming only admins have these roles. If using another system, adjust.
  const canEditNotes = usePermission('internal_notes', 'edit') || true 

  const { data: notes, isLoading } = useQuery({
    queryKey: ['admin', moduleName, recordId, 'notes'],
    // InternalNotesController::list() replies via Response::json(['data' => $sanitizedNotes]) — a
    // single wrapper already matching request()'s ApiSuccess<T>.data, so a single unwrap is correct.
    queryFn: () => api.get(`/admin/${moduleName}/${recordId}/notes`).then(r => r.data as Note[]),
  })

  const createMutation = useMutation({
    mutationFn: (payload: { content: string; is_pinned: boolean; visible_to_student: boolean; visible_to_agent: boolean }) =>
      api.post(`/admin/${moduleName}/${recordId}/notes`, payload),
    onSuccess: () => {
      setContent('')
      setIsPinned(false)
      setVisibleToStudent(false)
      setVisibleToAgent(false)
      queryClient.invalidateQueries({ queryKey: ['admin', moduleName, recordId, 'notes'] })
      toast.success('Note added successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add note')
    }
  })

  const pinMutation = useMutation({
    mutationFn: ({ pid, is_pinned }: { pid: string; is_pinned: boolean }) =>
      api.put(`/admin/notes/${pid}`, { is_pinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', moduleName, recordId, 'notes'] })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (pid: string) => api.delete(`/admin/notes/${pid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', moduleName, recordId, 'notes'] })
      toast.success('Note deleted')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    createMutation.mutate({ 
      content, 
      is_pinned: isPinned,
      visible_to_student: visibleToStudent,
      visible_to_agent: visibleToAgent
    })
  }

  return (
    <div className="bg-surface-card rounded-xl border border-border-warm overflow-hidden flex flex-col max-h-[600px]">
      <div className="p-4 border-b border-border-warm bg-surface-warm/50 flex justify-between items-center">
        <h3 className="font-semibold text-brand-navy">Internal Notes</h3>
        <span className="text-xs text-muted-foreground bg-surface-warm px-2 py-1 rounded-full border border-border-warm">
          {notes?.length || 0} Notes
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-4"><Activity className="w-5 h-5 animate-spin text-brand-orange-accessible" /></div>
        ) : notes?.length === 0 ? (
          <div className="text-center p-6 text-sm text-muted-foreground">
            No internal notes found. Start the conversation below.
          </div>
        ) : (
          notes?.map(note => (
            <div key={note.public_id} className={`p-3 rounded-lg border ${note.is_pinned ? 'bg-amber-50/50 border-amber-200' : 'bg-surface-warm border-border-warm'}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-brand-navy">
                    {note.author.full_name}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground bg-white px-1.5 py-0.5 rounded border border-border-warm">
                    {note.author.user_type}
                  </span>
                  {note.is_pinned && <Pin className="w-3 h-3 text-brand-orange-accessible" />}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(note.created_at).toLocaleDateString()} {new Date(note.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => pinMutation.mutate({ pid: note.public_id, is_pinned: !note.is_pinned })}
                      className={`p-1 rounded hover:bg-black/5 ${note.is_pinned ? 'text-brand-orange-accessible' : 'text-gray-400'}`}
                      title={note.is_pinned ? "Unpin note" : "Pin note"}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm('Delete this note?')) deleteMutation.mutate(note.public_id)
                      }}
                      className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-500"
                      title="Delete note"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-sm text-brand-navy whitespace-pre-wrap mb-2">{note.content}</p>
              <div className="flex gap-1">
                {note.visible_to_admin && <span className="text-[10px] uppercase font-semibold text-brand-navy bg-gray-100 px-1.5 py-0.5 rounded">Admin Only</span>}
                {note.visible_to_agent && <span className="text-[10px] uppercase font-semibold text-brand-navy bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">Agents Can See</span>}
                {note.visible_to_student && <span className="text-[10px] uppercase font-semibold text-brand-navy bg-green-50 text-green-700 px-1.5 py-0.5 rounded">Student Can See</span>}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-border-warm bg-surface-warm/50">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Type an internal note..."
            className="w-full pl-3 pr-24 py-3 bg-white border border-border-warm rounded-t-lg text-sm text-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-orange-accessible min-h-[80px] resize-none"
            disabled={createMutation.isPending}
          />
          <div className="bg-white border-x border-b border-border-warm rounded-b-lg p-2 flex justify-between items-center">
            <div className="flex items-center gap-4 px-2">
              <label className="flex items-center gap-1.5 text-xs text-brand-navy font-medium cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={visibleToStudent} 
                  onChange={(e) => setVisibleToStudent(e.target.checked)}
                  className="rounded border-border-warm text-brand-orange-accessible"
                />
                Visible to Student
              </label>
              <label className="flex items-center gap-1.5 text-xs text-brand-navy font-medium cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={visibleToAgent} 
                  onChange={(e) => setVisibleToAgent(e.target.checked)}
                  className="rounded border-border-warm text-brand-orange-accessible"
                />
                Visible to Agent
              </label>
            </div>
            <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`p-2 rounded-md ${isPinned ? 'bg-amber-100 text-amber-700' : 'text-gray-400 hover:bg-gray-100'}`}
              title="Pin this note"
            >
              <Pin className="w-4 h-4" />
            </button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="px-3"
              disabled={!content.trim() || createMutation.isPending}
              isLoading={createMutation.isPending}
            >
              <Send className="w-4 h-4" />
            </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
