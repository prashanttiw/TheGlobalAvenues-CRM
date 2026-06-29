import * as React from 'react';
import { useState } from 'react';
import { ChevronDown, ChevronRight, User } from 'lucide-react';

export type AgentNode = {
  public_id: string;
  parent_public_id: string | null;
  root_public_id: string | null;
  tier: number;
  full_name: string;
  agency_name: string | null;
  country: string | null;
  referral_code: string | null;
  status: string;
  created_at: string;
  email: string | null;
  children: AgentNode[];
};

export function AgentTreeNode({ node, depth = 0 }: { node: AgentNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="space-y-1">
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition"
        style={{ marginLeft: `${depth * 24}px` }}
      >
        <div className="flex items-center gap-3">
          {hasChildren ? (
            <button 
              onClick={() => setExpanded(!expanded)} 
              className="p-1 rounded hover:bg-gray-200 text-gray-500 transition"
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <div className="w-6" /> // spacer
          )}

          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy shrink-0">
            <User className="h-4 w-4" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-brand-navy">{node.full_name}</p>
              <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-brand-navy/5 text-brand-navy">
                Tier {node.tier}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {node.agency_name || 'No Agency'} · {node.country || 'Global'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pl-9 sm:pl-0 text-xs">
          {node.email && <span className="text-muted-foreground">{node.email}</span>}
          {node.referral_code && (
            <span className="font-bold text-brand-orange-accessible bg-brand-orange-accessible/5 px-2 py-0.5 rounded">
              {node.referral_code}
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            node.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
            node.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
          }`}>
            {node.status}
          </span>
        </div>
      </div>

      {expanded && hasChildren && node.children.map((child) => (
        <AgentTreeNode key={child.public_id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}
