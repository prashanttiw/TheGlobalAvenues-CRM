import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { UniversityBrowse } from '../../shared/components/catalog/UniversityBrowse'

export default function StudentUniversitiesPage() {
  return (
    <PageWrapper className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Browse Universities"
        subtitle="Explore partner universities, programs, and open intakes."
      />

      <UniversityBrowse mode="student-apply" />
    </PageWrapper>
  )
}
