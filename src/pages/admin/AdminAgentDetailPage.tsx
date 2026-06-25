import * as React from 'react';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../shared/components/layout/PageHeader';
import { PageWrapper } from '../../shared/components/layout/PageWrapper';
import { Button } from '../../shared/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card';
import { ArrowLeft, Users, GitFork, AlertCircle } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { fetchAdminAgentTree } from '../../lib/api';
import { AgentTreeNode } from '../../components/agent/AgentTreeNode';

export default function AdminAgentDetailPage() {
  const { pid } = useParams<{ pid: string }>();
  const navigate = useNavigate();
  const [treeData, setTreeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTree() {
      if (!pid) return;
      try {
        setLoading(true);
        const data = await fetchAdminAgentTree(pid);
        setTreeData(data);
      } catch (err) {
        toast.error('Failed to load agent tree hierarchy.');
      } finally {
        setLoading(false);
      }
    }
    void loadTree();
  }, [pid]);

  return (
    <PageWrapper className="space-y-6">
      <Toaster position="top-center" richColors />
      <PageHeader 
        title="Agent Hierarchy Tree" 
        subtitle="Visual representation of L1, L2, L3 sub-agents and team structural overrides." 
        actions={
          <Button variant="outline" onClick={() => navigate('/portal/admin/agents')} className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Directory
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
        </div>
      ) : !treeData ? (
        <Card className="border-dashed border-border-warm bg-surface-warm/50 py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-10 w-10 text-red-600 mb-3" />
            <h3 className="text-lg font-semibold text-brand-navy">No tree data found</h3>
            <p className="text-sm text-muted-foreground mt-2">
              The agent may not have any sub-agents in their tree structure, or the public ID is invalid.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-6">
          <CardHeader className="border-b border-border-warm pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy/5 text-brand-navy shrink-0">
                <GitFork className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">{treeData.full_name}'s Tree</CardTitle>
                <p className="text-xs text-muted-foreground">
                  L1 Representative · Code: {treeData.referral_code || 'N/A'} · Region: {treeData.country || 'Global'}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <AgentTreeNode node={treeData} depth={0} />
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
}
