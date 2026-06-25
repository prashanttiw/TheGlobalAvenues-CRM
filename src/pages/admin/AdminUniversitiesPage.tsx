import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { StatusBadge } from '../../shared/components/ui/Badge'
import { SlideOverPanel } from '../../shared/components/ui/SlideOverPanel'
import { FileUpload } from '../../shared/components/ui/FileUpload'
import { Globe, GraduationCap, Plus, BookOpen } from 'lucide-react'
import { toast } from 'sonner'

interface University {
  id: string
  name: string
  country: string
  coursesCount: number
  status: 'registered' | 'approved'
  logoUrl?: string
}

const MOCK_UNIVERSITIES: University[] = [
  {
    id: 'univ-1',
    name: 'University of Toronto',
    country: 'Canada',
    coursesCount: 45,
    status: 'approved',
  },
  {
    id: 'univ-2',
    name: 'Technical University of Vienna',
    country: 'Austria',
    coursesCount: 22,
    status: 'approved',
  },
  {
    id: 'univ-3',
    name: 'University of Nicosia',
    country: 'Cyprus',
    coursesCount: 18,
    status: 'registered',
  }
]

export default function AdminUniversitiesPage() {
  const [universities, setUniversities] = React.useState<University[]>(MOCK_UNIVERSITIES)
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [form, setForm] = React.useState({
    name: '',
    country: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newUniv: University = {
      id: `univ-${Date.now()}`,
      name: form.name,
      country: form.country,
      coursesCount: 0,
      status: 'registered',
    }
    setUniversities([...universities, newUniv])
    setIsAddOpen(false)
    setForm({ name: '', country: '' })
    toast.success('University added successfully!')
  }

  return (
    <PageWrapper className="space-y-6">
      <PageHeader 
        title="Universities" 
        subtitle="Manage academic institutions and partners." 
        actions={
          <Button variant="primary" onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add University
          </Button>
        }
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {universities.map((univ) => (
          <Card key={univ.id} className="hover:shadow-card-hover transition-shadow flex flex-col justify-between">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-navy/5 text-brand-navy font-bold shrink-0">
                  {univ.name.split(' ').map(w => w[0]).join('').substring(0, 3).toUpperCase()}
                </div>
                <StatusBadge status={univ.status} />
              </div>
              <CardTitle className="text-base font-semibold text-brand-navy mt-4 leading-tight">
                {univ.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-4 border-t border-border-warm pt-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Globe className="h-3.5 w-3.5" />
                {univ.country}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-brand-navy font-semibold">
                <BookOpen className="h-3.5 w-3.5 text-brand-orange-accessible" />
                {univ.coursesCount} Courses
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SlideOverPanel 
        title="Add University Partner" 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">University Name</label>
              <input 
                type="text" 
                required
                placeholder="e.g. University of Vienna"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Country</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Austria"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">University Logo</label>
              <FileUpload acceptedTypes={[".png", ".jpg", ".jpeg"]} />
            </div>
          </div>

          <div className="pt-6 border-t border-border-warm flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Partner</Button>
          </div>
        </form>
      </SlideOverPanel>
    </PageWrapper>
  )
}
