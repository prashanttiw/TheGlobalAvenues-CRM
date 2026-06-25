const fs = require('fs');
const pages = [
  { name: 'AdminUniversitiesPage', title: 'Universities', icon: 'Globe' },
  { name: 'AdminCoursesPage', title: 'Courses', icon: 'BookOpen' },
  { name: 'AdminIntakesPage', title: 'Intakes', icon: 'Calendar' },
  { name: 'AdminStudentsPage', title: 'Students', icon: 'GraduationCap' },
  { name: 'AdminAgentsPage', title: 'Agents', icon: 'Handshake' },
  { name: 'AdminApplicationsPage', title: 'Applications', icon: 'FileText' },
  { name: 'AdminCommissionsPage', title: 'Commissions', icon: 'DollarSign' },
  { name: 'AdminLeadsPage', title: 'Leads', icon: 'Target' },
  { name: 'AdminNoticesPage', title: 'Notices & Events', icon: 'Megaphone' },
  { name: 'AdminReportsPage', title: 'Reports', icon: 'BarChart2' },
  { name: 'AdminRolesPage', title: 'Roles', icon: 'Key' },
  { name: 'AdminSettingsPage', title: 'Settings', icon: 'Settings' },
  { name: 'AdminLogsPage', title: 'Activity Logs', icon: 'Activity' },
  { name: 'AdminSecurityPage', title: 'Security Events', icon: 'Lock' }
];

pages.forEach(p => {
  const content = `import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { ${p.icon} } from 'lucide-react'

export default function ${p.name}() {
  return (
    <PageWrapper className="space-y-6">
      <PageHeader 
        title="${p.title}" 
        subtitle="Manage ${p.title.toLowerCase()} across the system." 
      />
      <EmptyState
        icon={${p.icon}}
        heading="No ${p.title.toLowerCase()} found"
        description="The directory is currently empty."
      />
    </PageWrapper>
  )
}
`;
  fs.writeFileSync(`d:/TheGlobalAvenues-CRM/src/pages/admin/${p.name}.tsx`, content);
});
console.log('Created admin pages');
