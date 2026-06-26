import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export type OverviewMetrics = {
  total_students: { value: number; prev_value: number; change_pct: number | null; trend: 'up' | 'down' | 'flat' };
  total_applications: { value: number; prev_value: number; change_pct: number | null; trend: 'up' | 'down' | 'flat' };
  total_offers: { value: number; prev_value: number; change_pct: number | null; trend: 'up' | 'down' | 'flat' };
  total_enrollments: { value: number; prev_value: number; change_pct: number | null; trend: 'up' | 'down' | 'flat' };
  total_leads: { value: number; prev_value: number; change_pct: number | null; trend: 'up' | 'down' | 'flat' };
  trend_new_students: Array<{ snapshot_date: string; metric_value: string }>;
};

export type FunnelStage = {
  stage: string;
  count: number;
  drop_off_pct: number | null;
};

export type AgentReportItem = {
  agent_public_id: string;
  students: number;
  enrollments: number;
  conversion_rate: number;
  commissions_paid: number;
  full_name: string;
  agency_name: string;
  tier: string;
  status: string;
  rank_position: number;
};

export type UniversityReportItem = {
  uni_public_id: string;
  applications: number;
  offers: number;
  enrollments: number;
  offer_rate: number;
  enrollment_rate: number;
  name: string;
  country: string;
  city: string | null;
};

export type LeadSourceItem = {
  source: string;
  students: number;
  enrollments: number;
  conversion_rate: number;
};

export function useReportOverview() {
  return useQuery({
    queryKey: ['reports', 'overview'],
    queryFn: async () => {
      const response = await api.get<{ data: OverviewMetrics }>('/admin/reports/overview');
      return response.data;
    },
    staleTime: 60 * 60 * 1000, // Cache for 1 hour since snapshots are daily
  });
}

export function useReportFunnel() {
  return useQuery({
    queryKey: ['reports', 'funnel'],
    queryFn: async () => {
      const response = await api.get<{ data: FunnelStage[] }>('/admin/reports/funnel');
      return response.data;
    },
    staleTime: 60 * 60 * 1000, // Cache for 1 hour since snapshots are daily
  });
}

export function useReportAgents(sortBy: string = 'conversion_rate', order: string = 'DESC') {
  return useQuery({
    queryKey: ['reports', 'agents', sortBy, order],
    queryFn: async () => {
      const response = await api.get<{ data: { data: AgentReportItem[]; snapshot_date: string | null } }>(
        '/admin/reports/agents',
        { params: { sort_by: sortBy, order } }
      );
      return response.data; // Note: structure is response.data -> { data, snapshot_date }
    },
    staleTime: 60 * 60 * 1000, // Cache for 1 hour since snapshots are daily
  });
}

export function useReportUniversities() {
  return useQuery({
    queryKey: ['reports', 'universities'],
    queryFn: async () => {
      const response = await api.get<{ data: { data: UniversityReportItem[]; snapshot_date: string | null } }>(
        '/admin/reports/universities'
      );
      return response.data;
    },
    staleTime: 60 * 60 * 1000, // Cache for 1 hour since snapshots are daily
  });
}

export function useReportLeadSources() {
  return useQuery({
    queryKey: ['reports', 'lead-sources'],
    queryFn: async () => {
      const response = await api.get<{ data: { data: LeadSourceItem[]; snapshot_date: string | null } }>(
        '/admin/reports/lead-sources'
      );
      return response.data;
    },
    staleTime: 60 * 60 * 1000, // Cache for 1 hour since snapshots are daily
  });
}

export function useReportTrends(metric: string, dimType: string = 'global', dimId?: string) {
  return useQuery({
    queryKey: ['reports', 'trends', metric, dimType, dimId],
    queryFn: async () => {
      const response = await api.get<{ data: any }>('/admin/reports/trends', {
        params: { metric, dim_type: dimType, dim_id: dimId }
      });
      return response.data;
    },
    staleTime: 60 * 60 * 1000, // Cache for 1 hour since snapshots are daily
  });
}
