import * as React from 'react';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../shared/components/layout/PageHeader';
import { PageWrapper } from '../../shared/components/layout/PageWrapper';
import { Button } from '../../shared/components/ui/Button';
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable';
import { StatusBadge, type StatusType } from '../../shared/components/ui/Badge';
import { SearchInput } from '../../shared/components/ui/SearchInput';
import { InlineActions } from '../../shared/components/ui/InlineActions';
import { UserAvatar } from '../../shared/components/ui/Avatar';
import { 
  PreviewDrawer, 
  PreviewDrawerContent, 
  PreviewDrawerHeader, 
  PreviewDrawerBody, 
  PreviewDrawerFooter 
} from '../../shared/components/ui/PreviewDrawer';
import { Globe, Calendar, Eye, ShieldAlert, ArrowLeft, ArrowRight, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchAgentStudents, fetchAgentTeam } from '../../lib/api';

export default function AgentStudents() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlAgentPid = searchParams.get('agent_pid') || '';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [agentFilter, setAgentFilter] = useState<string>(urlAgentPid);
  const [team, setTeam] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Fetch team list for the agent filter
  useEffect(() => {
    async function loadTeam() {
      try {
        const teamData = await fetchAgentTeam();
        setTeam(teamData);
      } catch (err) {
        console.error('Failed to load team list:', err);
      }
    }
    void loadTeam();
  }, []);

  // Fetch students list
  useEffect(() => {
    async function loadStudents() {
      try {
        setLoading(true);
        const result = await fetchAgentStudents({
          page,
          perPage: 15,
          status: statusFilter,
          search: searchTerm,
          agentPid: agentFilter
        });
        setStudents(result.students);
        setMeta(result.meta);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load students list.');
      } finally {
        setLoading(false);
      }
    }
    void loadStudents();
  }, [page, statusFilter, searchTerm, agentFilter]);

  // Map backend status to frontend badges
  const mapStatusToBadge = (status: string): StatusType => {
    switch (status) {
      case 'registered': return 'pending';
      case 'enrolled': return 'approved';
      case 'rejected': return 'rejected';
      default: return 'pending';
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <UserAvatar name={row.full_name} image={row.avatar_thumb_url ?? undefined} size="sm" />
          <div>
            <p className="font-semibold text-brand-navy">{row.full_name}</p>
            <p className="text-[11px] text-muted-foreground">ID: {row.public_id}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'nationality',
      header: 'Nationality',
      cell: (row) => <span className="text-brand-navy">{row.nationality || 'Not specified'}</span>,
    },
    {
      key: 'status',
      header: 'Profile Status',
      cell: (row) => <StatusBadge status={mapStatusToBadge(row.profile_status)} />,
    },
    {
      key: 'applied',
      header: 'Applications',
      cell: (row) => <span className="text-brand-navy font-medium">{row.applied_count} Submitted</span>,
    },
    {
      key: 'agent_name',
      header: 'Assigned Agent',
      cell: (row) => <span className="text-sm font-medium text-brand-navy">{row.agent_name || 'Direct'}</span>,
    },
    {
      key: 'created_at',
      header: 'Assigned Date',
      cell: (row) => <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineActions 
            actions={[
              { label: 'View Profile', icon: Eye, onClick: () => setSelectedStudent(row) },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title="Students Roster"
        subtitle="Manage and track all students assigned within your agency network."
        actions={
          <Button variant="primary" onClick={() => navigate('/portal/agent/students/new')} className="flex items-center gap-1.5">
            <UserPlus className="h-4 w-4" /> Add Student
          </Button>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-surface-card p-4 rounded-xl border border-border-warm">
        <SearchInput 
          value={searchTerm} 
          onChange={(val) => { setSearchTerm(val); setPage(1); }} 
          placeholder="Search students..." 
          className="w-full md:max-w-xs"
        />
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <select 
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="registered">Registered</option>
            <option value="enrolled">Enrolled</option>
            <option value="rejected">Rejected</option>
          </select>

          <select 
            value={agentFilter}
            onChange={(e) => { setAgentFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none max-w-[200px]"
          >
            <option value="">All Agents</option>
            {team.map((sub: any) => (
              <option key={sub.public_id} value={sub.public_id}>
                {sub.full_name} ({sub.tier === 2 ? 'L2' : 'L3'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
        </div>
      ) : (
        <>
          <DataTable 
            columns={columns} 
            data={students}
            onRowClick={(row) => setSelectedStudent(row)}
            emptyMessage="No students found in your network matching these filters."
          />

          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-500">
                Page {page} of {meta.total_pages} (Total: {meta.total})
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="flex items-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" /> Previous
                </Button>
                <Button 
                  variant="outline" 
                  disabled={page >= meta.total_pages}
                  onClick={() => setPage(p => p + 1)}
                  className="flex items-center gap-1"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <PreviewDrawer open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <PreviewDrawerContent>
          {selectedStudent && (
            <>
              <PreviewDrawerHeader 
                title={selectedStudent.full_name}
                badge={<StatusBadge status={mapStatusToBadge(selectedStudent.profile_status)} />}
              />
              <PreviewDrawerBody>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Academic Scope & Detail
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-brand-navy">Nationality: {selectedStudent.nationality || 'Not specified'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-brand-navy">
                          Assigned Since: {new Date(selectedStudent.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Assigned Partner Agent
                    </h4>
                    <div className="p-3 bg-gray-50 rounded-lg text-sm text-brand-navy">
                      <p className="font-bold">{selectedStudent.agent_name || 'Direct / Head Office'}</p>
                      {selectedStudent.agent_agency && <p className="text-xs text-gray-500">{selectedStudent.agent_agency}</p>}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Open the full profile to view contact details, academic history, test scores, documents, and application status.
                    </p>
                  </div>
                </div>
              </PreviewDrawerBody>
              <PreviewDrawerFooter detailUrl={`/portal/agent/students/${selectedStudent.public_id}`} />
            </>
          )}
        </PreviewDrawerContent>
      </PreviewDrawer>
    </PageWrapper>
  );
}
