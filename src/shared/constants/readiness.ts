export const READY_STATUSES = new Set([
  'documents_submitted',
  'documents_verified',
  'application_in_progress',
  'application_submitted',
  'offer_received',
  'admitted',
  'enrolled',
])

export function isProfileReady(status: string | null | undefined): boolean {
  return !!status && READY_STATUSES.has(status)
}

export interface DocSlot {
  category: string
  label: string
  hint?: string
  required: boolean
}

export const REQUIRED_SLOTS: DocSlot[] = [
  { category: 'photo', label: 'Passport-size Photograph', required: true },
  { category: 'passport_front', label: 'Passport — Photo Page', required: true },
  { category: 'passport_back', label: 'Passport — Address Page', required: true },
  { category: 'academic_marksheet', label: 'Academic Marksheets (merged PDF)', hint: 'Combine mark sheets for every level you checked above into one PDF.', required: true },
  { category: 'transcript', label: 'Official Transcript', required: true },
]

export const OPTIONAL_SLOTS: DocSlot[] = [
  { category: 'cv', label: 'CV / Resume', required: false },
  { category: 'sop', label: 'Statement of Purpose (SOP)', required: false },
  { category: 'lor', label: 'Letter of Recommendation', required: false },
  { category: 'noi', label: 'No Objection Certificate (NOC)', required: false },
  { category: 'proficiency', label: 'English Proficiency Test Score', required: false },
]

export const PHD_SLOTS: DocSlot[] = [
  { category: 'phd_thesis', label: 'Thesis Proposal / Research Summary', required: true },
  { category: 'phd_lor_professional', label: 'Professional Letter of Recommendation', required: true },
]

export const EDUCATION_LEVELS = [
  { key: '10th', label: '10th / Secondary' },
  { key: '12th', label: '12th / Higher Secondary' },
  { key: 'bachelors', label: "Bachelor's Degree" },
  { key: 'masters', label: "Master's Degree" },
]

export const HOW_HEARD_OPTIONS = [
  { value: 'agent', label: 'Education Agent' },
  { value: 'university_staff', label: 'University Staff' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Friend / Family Referral' },
  { value: 'other', label: 'Other' },
]
