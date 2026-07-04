import * as React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../shared/components/layout/PageHeader';
import { PageWrapper } from '../../shared/components/layout/PageWrapper';
import { Card } from '../../shared/components/ui/Card';
import { Button } from '../../shared/components/ui/Button';
import { SlideOverPanel } from '../../shared/components/ui/SlideOverPanel';
import { StatusBadge, type StatusType } from '../../shared/components/ui/Badge';
import { Users, ChevronDown, ChevronUp, UserPlus, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAgentTeam, fetchSubAgents, inviteSubAgent } from '../../lib/api';
import { useAuth } from '../../shared/hooks/useAuth';

export default function AgentTeamPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Tier 3 (sub-sub-agent) is a hard cap — the backend rejects invites from tier >= 3
  // (SubAgentController::invite(), TIER_LIMIT_REACHED), so the button must not even
  // be offered at that tier.
  const canCreateSubAgent = user?.tier === 1 || user?.tier === 2;
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [subAgentsMap, setSubAgentsMap] = useState<Record<string, any[]>>({});
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    full_name: '',
    agency: '',
    country: '',
    email: '',
    password: '',
  });

  async function loadTeam() {
    try {
      setLoading(true);
      const teamData = await fetchAgentTeam();
      setTeam(teamData);
    } catch (err) {
      toast.error('Failed to load agency team.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTeam();
  }, []);

  const toggleExpand = async (pid: string, hasChildren: boolean) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(pid)) {
        next.delete(pid);
      } else {
        next.add(pid);
      }
      return next;
    });

    if (hasChildren && !subAgentsMap[pid]) {
      try {
        const children = await fetchSubAgents(pid);
        setSubAgentsMap(prev => ({ ...prev, [pid]: children }));
      } catch (err) {
        toast.error('Failed to load sub-sub-agents.');
      }
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await inviteSubAgent({
        full_name: inviteForm.full_name,
        agency_name: inviteForm.agency,
        country: inviteForm.country,
        email: inviteForm.email,
        password: inviteForm.password,
      });
      toast.success(`Invitation sent successfully to ${inviteForm.email}!`);
      setIsInviteOpen(false);
      setInviteForm({ full_name: '', agency: '', country: '', email: '', password: '' });
      void loadTeam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invitation.');
    } finally {
      setBusy(false);
    }
  };

  const mapStatusToBadge = (status: string): StatusType => {
    switch (status) {
      case 'approved': return 'approved';
      case 'pending': return 'pending';
      case 'suspended': return 'rejected';
      default: return 'pending';
    }
  };

  const viewStudents = (agentPid: string) => {
    navigate(`/portal/agent/students?agent_pid=${agentPid}`);
  };

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title="My Team Network"
        subtitle="Manage your network of L2 and L3 sub-agents and oversee performance."
        actions={
          canCreateSubAgent ? (
            <Button variant="primary" onClick={() => setIsInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Sub-Agent
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {team.length === 0 && (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
              <Users className="mx-auto h-10 w-10 text-gray-300 mb-3" />
              {canCreateSubAgent ? (
                <>
                  <p className="text-sm text-gray-500">You haven't added any sub-agents to your network yet.</p>
                  <Button variant="outline" className="mt-4" onClick={() => setIsInviteOpen(true)}>Invite your first Sub-Agent</Button>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  You're a Tier 3 sub-agent — the maximum depth in the network. Sub-agent creation isn't available at this tier.
                </p>
              )}
            </div>
          )}

          {team.map((agent) => {
            const isExpanded = expandedIds.has(agent.public_id);
            const hasChildren = agent.sub_agent_count > 0;

            return (
              <Card key={agent.public_id} className="overflow-hidden border border-border-warm hover:shadow-sm transition-shadow">
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy shrink-0">
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base text-brand-navy">{agent.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{agent.agency_name || 'No Agency Name'}</p>
                      <div className="flex flex-wrap gap-2 items-center mt-1">
                        <span className="text-[10px] uppercase font-bold text-brand-orange-accessible bg-brand-orange-accessible/10 px-2 py-0.5 rounded">
                          {agent.tier === 2 ? 'Sub-Agent (L2)' : 'Sub-Sub-Agent (L3)'}
                        </span>
                        <span className="text-xs text-muted-foreground">• {agent.student_count || 0} Students ({agent.enrolled_count || 0} enrolled)</span>
                        {agent.referral_code && <span className="text-xs text-gray-400">• Code: {agent.referral_code}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => viewStudents(agent.public_id)}
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" /> View Students
                    </Button>

                    <StatusBadge status={mapStatusToBadge(agent.status)} />
                    
                    {hasChildren && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => void toggleExpand(agent.public_id, hasChildren)}
                        aria-label={isExpanded ? "Collapse subtree" : "Expand subtree"}
                      >
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </Button>
                    )}
                  </div>
                </div>

                {isExpanded && hasChildren && (
                  <div className="bg-surface-warm/40 border-t border-border-warm p-6 space-y-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-4">
                      Sub-Sub-Agents (Level 3) under {agent.full_name}
                    </h4>
                    
                    <div className="pl-6 border-l-2 border-border-warm space-y-4">
                      {!subAgentsMap[agent.public_id] ? (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-brand-navy"></div>
                          Loading L3 sub-agents...
                        </div>
                      ) : subAgentsMap[agent.public_id].length === 0 ? (
                        <p className="text-xs text-gray-500 pl-4">No L3 sub-agents under this L2 agent.</p>
                      ) : (
                        subAgentsMap[agent.public_id].map((child) => (
                          <div key={child.public_id} className="flex items-center justify-between bg-white p-4 rounded-xl border border-border-warm">
                            <div>
                              <p className="font-semibold text-sm text-brand-navy">{child.full_name}</p>
                              <p className="text-xs text-muted-foreground">{child.agency_name || 'No Agency Name'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] uppercase font-bold text-brand-navy bg-brand-navy/10 px-2 py-0.5 rounded inline-block">
                                  Sub-Sub-Agent (L3)
                                </span>
                                {child.referral_code && <span className="text-xs text-gray-400">Code: {child.referral_code}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">{child.student_count || 0} Students ({child.enrolled_count || 0} enrolled)</span>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => viewStudents(child.public_id)}
                                className="h-7 text-xs flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" /> View Students
                              </Button>
                              <StatusBadge status={mapStatusToBadge(child.status)} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <SlideOverPanel 
        title="Invite Sub-Agent" 
        open={isInviteOpen} 
        onOpenChange={setIsInviteOpen}
      >
        <form onSubmit={handleInviteSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Sub-Agent Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Verma"
                value={inviteForm.full_name}
                onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Agency Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Verma Consultancy"
                value={inviteForm.agency}
                onChange={(e) => setInviteForm({ ...inviteForm, agency: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Country / Region</label>
              <input
                type="text"
                required
                placeholder="e.g. India"
                value={inviteForm.country}
                onChange={(e) => setInviteForm({ ...inviteForm, country: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="e.g. ramesh@vermaconsultancy.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Initial Password</label>
              <input
                type="password"
                required
                minLength={8}
                placeholder="Minimum 8 characters"
                value={inviteForm.password}
                onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
              />
              <p className="text-[11px] text-muted-foreground mt-1">The sub-agent will use this password to log in for the first time.</p>
            </div>
          </div>

          <div className="pt-6 border-t border-border-warm flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setIsInviteOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </SlideOverPanel>
    </PageWrapper>
  );
}
