import api from './api';

interface OverviewData {
  total_impressions: number;
  total_clicks: number;
  total_likes: number;
  total_shares: number;
  avg_engagement_rate: number;
}

interface PlatformData {
  platform: string;
  total_posts: number;
  total_impressions: number;
  total_engagement: number;
}

interface TeamMember {
  user_id: number;
  full_name: string | null;
  content_created: number;
  content_approved: number;
  content_published: number;
}

export type { OverviewData, PlatformData, TeamMember };

export const analyticsService = {
  overview: () =>
    api.get<OverviewData>('/analytics/overview'),

  contentAnalytics: (contentId: number) =>
    api.get(`/analytics/content/${contentId}`),

  platformAnalytics: (platform: string) =>
    api.get<PlatformData>(`/analytics/platform/${platform}`),

  teamProductivity: () =>
    api.get<TeamMember[]>('/analytics/team'),
};
