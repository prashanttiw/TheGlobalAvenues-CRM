import { create } from 'zustand';
import { 
  User, StudentProfile, Agent, Application, ApplicationStatus, 
  DocumentRecord, CommissionClaim, NotificationRecord, Badge, Program 
} from '../types';
import { UNIVERSITIES } from '../data/universities';

// ─────────────────────────────────────────────────────────────────────────────
// Initial Mock Datasets
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_PROGRAMS: Program[] = [
  {
    id: 'prog-1',
    universityId: 'fh-kufstein-tirol',
    universityName: 'FH Kufstein Tirol',
    name: 'AI & Data Science',
    degreeLevel: 'Bachelor',
    subjectArea: 'IT & Game Design',
    durationMonths: 36,
    tuitionFee: '€363/semester',
    currency: 'EUR',
    intakeMonths: ['September'],
    englishRequirement: 'IELTS 6.0',
    applicationFee: '€0',
    scholarshipAvailable: true,
  },
  {
    id: 'prog-2',
    universityId: 'euas',
    universityName: 'Estonian Entrepreneurship University of Applied Sciences (EUAS)',
    name: 'MBA & International Business',
    degreeLevel: 'Master / MBA',
    subjectArea: 'Business & Management',
    durationMonths: 24,
    tuitionFee: '€5,000/year',
    currency: 'EUR',
    intakeMonths: ['September', 'February'],
    englishRequirement: 'IELTS 6.5',
    applicationFee: '€100',
    scholarshipAvailable: true,
  },
  {
    id: 'prog-3',
    universityId: 'st-georges-university',
    universityName: "St. George's University",
    name: 'Doctor of Medicine (MD)',
    degreeLevel: 'Doctoral',
    subjectArea: 'Medicine & Health',
    durationMonths: 48,
    tuitionFee: '$32,000/year',
    currency: 'USD',
    intakeMonths: ['January', 'August'],
    englishRequirement: 'IELTS 7.0',
    applicationFee: '$150',
    scholarshipAvailable: false,
  }
];

const MOCK_STUDENTS: StudentProfile[] = [
  {
    id: 'stud-1',
    userId: 'user-stud-1',
    firstName: 'Aarav',
    lastName: 'Sharma',
    dob: '2004-08-15',
    nationality: 'Indian',
    educationLevel: 'High School',
    gpa: '92%',
    englishScore: 'IELTS 7.5',
    desiredCountry: 'Austria',
    desiredSubject: 'IT & Game Design',
    budgetRange: '€5,000–€10,000/year',
    profileCompletionPct: 80,
    gamificationPoints: 125,
  }
];

const MOCK_AGENTS: Agent[] = [
  {
    id: 'agent-1',
    userId: 'user-agent-1',
    agencyName: 'Global Pathways India',
    agencyCountry: 'India',
    registrationNumber: 'REG129849',
    partnershipType: 'exclusive',
    tier: 'silver',
    status: 'approved',
  }
];

const INITIAL_APPLICATIONS: Application[] = [
  {
    id: 'app-1',
    studentId: 'stud-1',
    studentName: 'Aarav Sharma',
    agentId: 'agent-1',
    programId: 'prog-1',
    programName: 'AI & Data Science',
    universityId: 'fh-kufstein-tirol',
    universityName: 'FH Kufstein Tirol',
    status: 'offer_received',
    assignedTo: 'staff-counsellor-1',
    notes: 'Prioritized FH Kufstein Austria pathway lead. Highly qualified academic credentials.',
    createdAt: '2026-05-12T04:00:36Z',
    updatedAt: '2026-05-20T10:15:00Z',
  },
  {
    id: 'app-2',
    studentId: 'stud-1',
    studentName: 'Aarav Sharma',
    agentId: 'agent-1',
    programId: 'prog-2',
    programName: 'MBA & International Business',
    universityId: 'euas',
    universityName: 'Estonian Entrepreneurship University of Applied Sciences (EUAS)',
    status: 'documents_submitted',
    assignedTo: 'staff-counsellor-1',
    notes: 'Estonia startup visa track. Reviewing document checklist.',
    createdAt: '2026-05-15T09:20:00Z',
    updatedAt: '2026-05-16T11:40:00Z',
  }
];

const INITIAL_DOCUMENTS: DocumentRecord[] = [
  {
    id: 'doc-1',
    applicationId: 'app-1',
    uploadedBy: 'user-agent-1',
    documentType: 'Passport',
    filePath: '/uploads/passport_aarav.pdf',
    fileName: 'passport_aarav.pdf',
    verified: true,
    verifiedBy: 'staff-admin-1',
  },
  {
    id: 'doc-2',
    applicationId: 'app-1',
    uploadedBy: 'user-agent-1',
    documentType: 'IELTS Marksheet',
    filePath: '/uploads/ielts_aarav.pdf',
    fileName: 'ielts_aarav.pdf',
    verified: true,
    verifiedBy: 'staff-admin-1',
  }
];

const INITIAL_BADGES: Badge[] = [
  { id: 'badge-1', name: 'Explorer', icon: '🌍', description: 'Completed profile settings', triggerCondition: 'profile_100', pointsRequired: 50 },
  { id: 'badge-2', name: 'First Step', icon: '📝', description: 'Submitted first university choice', triggerCondition: 'first_app', pointsRequired: 75 },
  { id: 'badge-3', name: 'Document Ready', icon: '📁', description: 'All document packages verified', triggerCondition: 'docs_ok', pointsRequired: 50 },
  { id: 'badge-4', name: 'Visa Approved', icon: '✈️', description: 'Visa stamped successfully', triggerCondition: 'visa_ok', pointsRequired: 200 },
];

const INITIAL_COMMISSIONS: CommissionClaim[] = [
  {
    id: 'claim-1',
    agentId: 'agent-1',
    applicationId: 'app-1',
    studentName: 'Aarav Sharma',
    universityName: 'FH Kufstein Tirol',
    amount: 1200,
    currency: 'EUR',
    status: 'approved',
    invoiceNumber: 'TGA-INV-001',
    createdAt: '2026-05-20T10:15:00Z',
    approvedAt: '2026-05-22T08:30:00Z',
    estimatedPayoutDate: '2026-06-15',
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// Zustand Store Definition
// ─────────────────────────────────────────────────────────────────────────────

interface CRMState {
  // Authentication & Users
  currentUser: User | null;
  users: User[];
  students: StudentProfile[];
  agents: Agent[];
  notifications: NotificationRecord[];
  
  // Platform catalog
  programs: Program[];
  applications: Application[];
  documents: DocumentRecord[];
  badges: Badge[];
  studentBadges: { studentId: string; badgeId: string; earnedAt: string }[];
  commissionClaims: CommissionClaim[];

  // ── Auth Actions ──
  login: (email: string, role: string) => Promise<boolean>;
  logout: () => void;
  sendOTP: (email: string) => Promise<string>;
  verifyOTP: (email: string, code: string) => Promise<boolean>;
  setCurrentUser: (user: User | null) => void;
  upsertStudentRecord: (profile: StudentProfile) => void;
  upsertAgentRecord: (agent: Agent) => void;
  
  // ── Student Actions ──
  updateProfile: (profile: Partial<StudentProfile>) => void;
  claimBadge: (studentId: string, badgeId: string) => void;
  addPoints: (studentId: string, points: number) => void;
  
  // ── Agent Actions ──
  submitLead: (lead: { 
    firstName: string; 
    lastName: string; 
    phone: string;
    email: string;
    desiredCountry: string; 
    desiredSubject: string; 
    gpa: string;
    englishScore: string;
  }) => void;
  claimCommission: (claim: { agentId: string; applicationId: string; amount: number; currency: string }) => void;
  
  // ── Application/Admin Actions ──
  createApplication: (studentId: string, programId: string) => void;
  updateApplicationStatus: (appId: string, status: ApplicationStatus, reviewerId?: string) => void;
  uploadDocument: (appId: string, docType: string, fileName: string) => void;
  verifyDocument: (docId: string, verifierId: string) => void;
  approveAgent: (agentId: string, reviewerId: string) => void;
  addNotification: (userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'danger') => void;
  markNotificationRead: (notifId: string) => void;
}

export const useStore = create<CRMState>((set, get) => ({
  // Core datasets
  currentUser: null,
  users: [
    { id: 'user-stud-1', email: 'student@theglobalavenues.com', role: 'student', firstName: 'Aarav', lastName: 'Sharma', emailVerified: true, createdAt: '2026-05-12T04:00:36Z', status: 'active' },
    { id: 'user-agent-1', email: 'agent@theglobalavenues.com', role: 'agent', firstName: 'Prashant', lastName: 'Tiwari', emailVerified: true, createdAt: '2026-05-12T04:00:36Z', status: 'active' },
    { id: 'user-admin-1', email: 'admin@theglobalavenues.com', role: 'admin', firstName: 'Amit', lastName: 'Tiwari', emailVerified: true, createdAt: '2026-05-12T04:00:36Z', status: 'active' },
  ],
  students: MOCK_STUDENTS,
  agents: MOCK_AGENTS,
  programs: MOCK_PROGRAMS,
  applications: INITIAL_APPLICATIONS,
  documents: INITIAL_DOCUMENTS,
  badges: INITIAL_BADGES,
  studentBadges: [
    { studentId: 'stud-1', badgeId: 'badge-1', earnedAt: '2026-05-13T10:00:00Z' }
  ],
  commissionClaims: INITIAL_COMMISSIONS,
  notifications: [
    { id: 'notif-1', userId: 'user-stud-1', type: 'success', title: 'Offer Letter Received', message: 'Congratulations! You received an offer letter from FH Kufstein Tirol, Austria.', createdAt: '2026-05-20T10:15:00Z' },
    { id: 'notif-2', userId: 'user-agent-1', type: 'info', title: 'New Student Matches', message: 'Your lead Aarav Sharma has matched 96% with Austria programs.', createdAt: '2026-05-16T11:40:00Z' }
  ],

  // ── Auth Actions ──
  login: async (email, role) => {
    const user = get().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (user && user.role === role) {
      set({ currentUser: user });
      return true;
    }
    // Fallback/auto-register mock users for prototyping
    const id = `user-${role}-${Date.now()}`;
    const newUser: User = {
      id,
      email,
      role: role as any,
      firstName: role.charAt(0).toUpperCase() + role.slice(1),
      lastName: 'User',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    set((state) => ({
      users: [...state.users, newUser],
      currentUser: newUser,
    }));
    return true;
  },

  logout: () => set({ currentUser: null }),

  setCurrentUser: (user) => set({ currentUser: user }),

  sendOTP: async (_email) => {
    throw new Error('Not implemented — use api.ts OTP functions');
  },

  verifyOTP: async (email, code) => {
    throw new Error('Not implemented — use api.ts OTP functions');
  },

  upsertStudentRecord: (profile) => {
    set((state) => {
      const existingIndex = state.students.findIndex((student) => student.userId === profile.userId);

      if (existingIndex === -1) {
        return { students: [...state.students, profile] };
      }

      return {
        students: state.students.map((student) => student.userId === profile.userId ? profile : student),
      };
    });
  },

  upsertAgentRecord: (agent) => {
    set((state) => {
      const existingIndex = state.agents.findIndex((entry) => entry.userId === agent.userId);

      if (existingIndex === -1) {
        return { agents: [...state.agents, agent] };
      }

      return {
        agents: state.agents.map((entry) => entry.userId === agent.userId ? agent : entry),
      };
    });
  },

  // ── Student Actions ──
  updateProfile: (profile) => {
    set((state) => ({
      students: (() => {
        const currentUserId = state.currentUser?.id;

        if (!currentUserId) {
          return state.students;
        }

        const existing = state.students.find((s) => s.userId === currentUserId);
        const baseProfile: StudentProfile = existing ?? {
          id: `stud-${currentUserId}`,
          userId: currentUserId,
          firstName: state.currentUser?.firstName ?? 'Student',
          lastName: state.currentUser?.lastName ?? 'User',
          profileCompletionPct: 0,
          gamificationPoints: 0,
        };

        const merged = { ...baseProfile, ...profile };
        let filled = 0;
        const fields: (keyof StudentProfile)[] = ['firstName', 'lastName', 'dob', 'nationality', 'educationLevel', 'gpa', 'englishScore', 'desiredCountry', 'desiredSubject', 'budgetRange'];
        fields.forEach((f) => {
          if (merged[f]) filled++;
        });
        merged.profileCompletionPct = Math.round((filled / fields.length) * 100);

        if (!existing) {
          return [...state.students, merged];
        }

        return state.students.map((student) => student.userId === currentUserId ? merged : student);
      })(),
    }));
  },

  claimBadge: (studentId, badgeId) => {
    set((state) => {
      const alreadyEarned = state.studentBadges.some(
        (b) => b.studentId === studentId && b.badgeId === badgeId
      );
      if (alreadyEarned) return {};
      const badge = state.badges.find((b) => b.id === badgeId);
      const pointsBonus = badge ? badge.pointsRequired : 0;
      
      // Update points and assign badge
      return {
        studentBadges: [
          ...state.studentBadges,
          { studentId, badgeId, earnedAt: new Date().toISOString() },
        ],
        students: state.students.map((s) => {
          if (s.id === studentId) {
            return { ...s, gamificationPoints: s.gamificationPoints + pointsBonus };
          }
          return s;
        }),
      };
    });
  },

  addPoints: (studentId, points) => {
    set((state) => ({
      students: state.students.map((s) => {
        if (s.id === studentId) {
          return { ...s, gamificationPoints: s.gamificationPoints + points };
        }
        return s;
      }),
    }));
  },

  // ── Agent Actions ──
  submitLead: (lead) => {
    const studentId = `stud-${Date.now()}`;
    const newStudent: StudentProfile = {
      id: studentId,
      userId: `user-stud-${Date.now()}`,
      firstName: lead.firstName,
      lastName: lead.lastName,
      educationLevel: 'Bachelor Completed',
      gpa: lead.gpa,
      englishScore: lead.englishScore,
      desiredCountry: lead.desiredCountry,
      desiredSubject: lead.desiredSubject,
      profileCompletionPct: 50,
      gamificationPoints: 50,
    };
    
    set((state) => ({
      students: [...state.students, newStudent],
    }));

    // Find first program that matches to automatically create an application inquiry
    const matchedProg = get().programs.find(p => p.subjectArea === lead.desiredSubject) || get().programs[0];
    get().createApplication(studentId, matchedProg.id);
  },

  claimCommission: (claim) => {
    const app = get().applications.find(a => a.id === claim.applicationId);
    const newClaim: CommissionClaim = {
      id: `claim-${Date.now()}`,
      agentId: claim.agentId,
      applicationId: claim.applicationId,
      studentName: app?.studentName || 'Student Lead',
      universityName: app?.universityName || 'Partner Institution',
      amount: claim.amount,
      currency: claim.currency,
      status: 'pending',
      invoiceNumber: `TGA-INV-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      estimatedPayoutDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // same-day estimated indicator
    };
    set((state) => ({
      commissionClaims: [newClaim, ...state.commissionClaims],
    }));
  },

  // ── Application/Admin Actions ──
  createApplication: (studentId, programId) => {
    const prog = get().programs.find((p) => p.id === programId);
    const stud = get().students.find((s) => s.id === studentId);
    if (!prog || !stud) return;

    const newApp: Application = {
      id: `app-${Date.now()}`,
      studentId,
      studentName: `${stud.firstName} ${stud.lastName}`,
      agentId: get().currentUser?.role === 'agent' ? get().currentUser?.id : undefined,
      programId,
      programName: prog.name,
      universityId: prog.universityId,
      universityName: prog.universityName,
      status: 'inquiry',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      applications: [newApp, ...state.applications],
    }));
  },

  updateApplicationStatus: (appId, status, reviewerId) => {
    set((state) => ({
      applications: state.applications.map((a) => {
        if (a.id === appId) {
          // Trigger points triggers for milestones
          let pointsBonus = 0;
          if (status === 'applied') pointsBonus = 75;
          if (status === 'offer_received') pointsBonus = 150;
          if (status === 'visa_approved') pointsBonus = 200;

          if (pointsBonus > 0) {
            // Find student profile and increment points
            setTimeout(() => get().addPoints(a.studentId, pointsBonus), 0);
          }

          // Evaluate Badge claims dynamically based on status shifts
          if (status === 'offer_received') {
            setTimeout(() => get().claimBadge(a.studentId, 'badge-3'), 0);
          }
          if (status === 'visa_approved') {
            setTimeout(() => get().claimBadge(a.studentId, 'badge-4'), 0);
          }

          return {
            ...a,
            status,
            assignedTo: reviewerId || a.assignedTo,
            updatedAt: new Date().toISOString(),
          };
        }
        return a;
      }),
    }));
  },

  uploadDocument: (appId, docType, fileName) => {
    const newDoc: DocumentRecord = {
      id: `doc-${Date.now()}`,
      applicationId: appId,
      uploadedBy: get().currentUser?.id || 'unknown',
      documentType: docType,
      filePath: `/uploads/${fileName}`,
      fileName,
      verified: false,
    };
    set((state) => ({
      documents: [...state.documents, newDoc],
    }));
  },

  verifyDocument: (docId, verifierId) => {
    set((state) => ({
      documents: state.documents.map((d) => {
        if (d.id === docId) {
          return { ...d, verified: true, verifiedBy: verifierId };
        }
        return d;
      }),
    }));
  },

  approveAgent: (agentId, reviewerId) => {
    set((state) => ({
      agents: state.agents.map((a) => {
        if (a.id === agentId) {
          return { ...a, status: 'approved', approvedBy: reviewerId };
        }
        return a;
      }),
    }));
  },

  addNotification: (userId, title, message, type) => {
    const newNotif: NotificationRecord = {
      id: `notif-${Date.now()}`,
      userId,
      type,
      title,
      message,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      notifications: [newNotif, ...state.notifications],
    }));
  },

  markNotificationRead: (notifId) => {
    set((state) => ({
      notifications: state.notifications.map((n) => {
        if (n.id === notifId) {
          return { ...n, readAt: new Date().toISOString() };
        }
        return n;
      }),
    }));
  },
}));
