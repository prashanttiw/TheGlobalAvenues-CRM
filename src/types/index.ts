export type UserRole = 
  | 'student' 
  | 'agent' 
  | 'sub_agent' 
  | 'counsellor' 
  | 'visa_officer' 
  | 'admin' 
  | 'super_admin';

export interface User {
  id: string;
  email: string;
  phone?: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  emailVerified: boolean;
  createdAt: string;
  status: 'active' | 'suspended' | 'pending' | 'deleted';
}

export interface StudentProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  dob?: string;
  nationality?: string;
  educationLevel?: string;
  gpa?: string;
  englishScore?: string;
  desiredCountry?: string;
  desiredSubject?: string;
  budgetRange?: string;
  profileCompletionPct: number;
  gamificationPoints: number;
}

export interface Agent {
  id: string;
  userId: string;
  agencyName: string;
  agencyCountry: string;
  registrationNumber: string;
  partnershipType: 'exclusive' | 'non_exclusive';
  tier: 'bronze' | 'silver' | 'gold';
  approvedBy?: string;
  status: 'pending' | 'approved' | 'suspended';
}

export interface SubAgent {
  id: string;
  agentId: string;
  userId: string;
  permissions: string[];
}

export interface University {
  id: string;
  name: string;
  country: string;
  city: string;
  logo: string;
  heroImage: string;
  description: string;
  partnershipType: 'exclusive' | 'non_exclusive';
  isActive: boolean;
  website?: string;
}

export interface Program {
  id: string;
  universityId: string;
  universityName: string;
  name: string;
  degreeLevel: string;
  subjectArea: string;
  durationMonths: number;
  tuitionFee: string;
  currency: string;
  intakeMonths: string[];
  englishRequirement: string;
  applicationFee: string;
  scholarshipAvailable: boolean;
}

export type ApplicationStatus =
  | 'inquiry'
  | 'profile_review'
  | 'applied'
  | 'documents_submitted'
  | 'under_review'
  | 'offer_received'
  | 'conditional_offer'
  | 'unconditional_offer'
  | 'enrolled'
  | 'cas_coe_issued'
  | 'visa_applied'
  | 'visa_approved'
  | 'visa_rejected'
  | 'pre_departure'
  | 'departed'
  | 'deferred'
  | 'withdrawn';

export interface Application {
  id: string;
  studentId: string;
  studentName: string;
  agentId?: string;
  programId: string;
  programName: string;
  universityId: string;
  universityName: string;
  status: ApplicationStatus;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRecord {
  id: string;
  applicationId: string;
  uploadedBy: string;
  documentType: string;
  filePath: string;
  fileName: string;
  verified: boolean;
  verifiedBy?: string;
}

export interface CommissionRule {
  id: string;
  universityId: string;
  agentTier: 'bronze' | 'silver' | 'gold';
  commissionValue: string;
  currency: string;
}

export interface CommissionClaim {
  id: string;
  agentId: string;
  applicationId: string;
  studentName: string;
  universityName: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'paid';
  invoiceNumber?: string;
  createdAt: string;
  approvedAt?: string;
  paidAt?: string;
  estimatedPayoutDate?: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  message: string;
  readAt?: string;
  createdAt: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  triggerCondition: string;
  pointsRequired: number;
  earnedAt?: string;
}
