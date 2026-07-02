import * as React from 'react';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../shared/components/layout/PageHeader';
import { PageWrapper } from '../../shared/components/layout/PageWrapper';
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card';
import { Button } from '../../shared/components/ui/Button';
import { UserCheck, MapPin, AlertCircle, RefreshCw, Clock, XCircle, CheckCircle2, Mail, Phone } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { fetchStudentAgentInfo, submitReassignmentRequest } from '../../lib/api';

export default function StudentAgentPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requestReason, setRequestReason] = useState('');
  const [requestedAgentCode, setRequestedAgentCode] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function loadAgentInfo() {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await fetchStudentAgentInfo();
      setData(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load agent assignment details.';
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAgentInfo();
  }, []);

  const handleRequestChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestReason.length < 10) {
      toast.error('Please provide a reason of at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await submitReassignmentRequest({
        reason: requestReason,
        requested_agent_code: requestedAgentCode.trim() || undefined
      });
      toast.success('Agent reassignment request submitted successfully.');
      setIsFormOpen(false);
      setRequestReason('');
      setRequestedAgentCode('');
      void loadAgentInfo();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
      </PageWrapper>
    );
  }

  if (!data) {
    return (
      <PageWrapper>
        <div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <div>
            <p className="font-semibold">Failed to retrieve agent settings.</p>
            {loadError && <p className="mt-1 text-xs text-red-600">{loadError}</p>}
          </div>
          <Button variant="secondary" size="sm" onClick={() => void loadAgentInfo()} className="flex items-center gap-1.5 shrink-0">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </PageWrapper>
    );
  }

  const { current_agent, agent_lock_status, can_request_reassignment, pending_reassignment } = data;

  return (
    <PageWrapper className="space-y-6">
      <Toaster position="top-center" richColors />
      <PageHeader 
        title="My Consultant & Agency" 
        subtitle="Manage your designated education consultant and agent network assignments." 
      />

      {/* Lock Status Alert */}
      {agent_lock_status === 'locked' && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Assignment locked</p>
            <p className="mt-1 text-xs text-blue-700 leading-relaxed">
              Your agent assignment is locked because you have been admitted or enrolled in a university program.
              Reassignment requests are disabled at this stage.
            </p>
          </div>
        </div>
      )}

      {/* Pending Reassignment Request */}
      {pending_reassignment && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
            <Clock className="h-4 w-4 text-amber-600" />
            Pending Reassignment Request
          </div>
          <div className="text-xs text-amber-700 space-y-1">
            <p><strong>Requested Agent:</strong> {pending_reassignment.requested_agent_name || 'System Auto-Assign / Head Office'}</p>
            <p><strong>Reason provided:</strong> {pending_reassignment.reason}</p>
            <p><strong>Submitted on:</strong> {new Date(pending_reassignment.created_at).toLocaleString()}</p>
          </div>
          <div className="pt-1">
            <span className="inline-flex rounded bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800">
              Pending Admin Review
            </span>
          </div>
        </div>
      )}

      {current_agent ? (
        <Card>
          <CardHeader className="flex flex-row items-center space-x-4 pb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy shrink-0">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>{current_agent.agency_name || 'Independent Partner Agent'}</CardTitle>
              <p className="text-sm text-muted-foreground flex items-center mt-1">
                <MapPin className="h-3 w-3 mr-1" /> {current_agent.country || 'Global'}
              </p>
            </div>
          </CardHeader>
          <CardContent className="mt-4 border-t border-border-warm pt-4 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Consultant Name</p>
                <p className="font-semibold text-brand-navy">{current_agent.full_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Partner Classification</p>
                <p className="font-medium text-brand-navy">Tier {current_agent.tier} Agency</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</p>
                <p className="font-medium text-brand-navy">{current_agent.email || 'Not available'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Mobile</p>
                <p className="font-medium text-brand-navy">{current_agent.phone || 'Not available'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Referral Code</p>
                <p className="font-bold text-brand-orange-accessible">{current_agent.referral_code || '-'}</p>
              </div>
            </div>

            {can_request_reassignment && !pending_reassignment && !isFormOpen && (
              <div className="pt-4 border-t border-border-warm flex justify-end">
                <Button 
                  variant="primary" 
                  onClick={() => setIsFormOpen(true)}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Request Agent Change
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-border-warm bg-surface-warm/50 py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 mb-4">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-brand-navy">No consultant assigned</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              You currently do not have a partner agent assigned to your account.
            </p>
            
            {can_request_reassignment && !pending_reassignment && !isFormOpen && (
              <Button variant="primary" className="mt-6" onClick={() => setIsFormOpen(true)}>
                Claim Referral Code / Assign Agent
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reassignment Request Form */}
      {isFormOpen && (
        <Card className="border border-brand-navy/10 bg-gray-50/50">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Request Consultant Assignment Change</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRequestChange} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Preferred Agent Code (Optional)
                </label>
                <input 
                  type="text"
                  placeholder="e.g. TGA-XXX999"
                  value={requestedAgentCode}
                  onChange={(e) => setRequestedAgentCode(e.target.value)}
                  className="w-full sm:max-w-xs px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
                />
                <p className="text-[11px] text-gray-500 mt-1">Leave empty if you want TGA head office to auto-assign a consultant.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reason for Request *
                </label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Please describe why you are requesting a reassignment (at least 10 characters)..."
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="secondary" type="button" onClick={() => setIsFormOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
}
