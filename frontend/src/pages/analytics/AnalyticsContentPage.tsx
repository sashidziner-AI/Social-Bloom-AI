import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, MousePointer, Heart, Share2, MessageCircle, TrendingUp, RefreshCw } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { AnimatedList } from '../../components/ui/AnimatedList';
import { analyticsService } from '../../services/analyticsService';
import type { Analytics } from '../../types';

export function AnalyticsContentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const contentId = Number(id);

  const { data, isLoading } = useQuery({
    queryKey: ['analytics-content', contentId],
    queryFn: () => analyticsService.contentAnalytics(contentId).then((r) => r.data),
    enabled: !!contentId,
  });

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </PageWrapper>
    );
  }

  const analytics: Analytics[] = Array.isArray(data) ? data : data ? [data] : [];

  const totals = analytics.reduce(
    (acc, a) => ({
      impressions: acc.impressions + a.impressions,
      clicks: acc.clicks + a.clicks,
      likes: acc.likes + a.likes,
      shares: acc.shares + a.shares,
      comments: acc.comments + a.comments_count,
      engagement: acc.engagement + a.engagement_rate,
    }),
    { impressions: 0, clicks: 0, likes: 0, shares: 0, comments: 0, engagement: 0 }
  );

  const avgEngagement = analytics.length > 0 ? totals.engagement / analytics.length : 0;

  const statCards = [
    { label: 'Impressions', value: totals.impressions.toLocaleString(), icon: Eye, color: 'text-blue-500' },
    { label: 'Clicks', value: totals.clicks.toLocaleString(), icon: MousePointer, color: 'text-green-500' },
    { label: 'Likes', value: totals.likes.toLocaleString(), icon: Heart, color: 'text-red-500' },
    { label: 'Shares', value: totals.shares.toLocaleString(), icon: Share2, color: 'text-purple-500' },
    { label: 'Comments', value: totals.comments.toLocaleString(), icon: MessageCircle, color: 'text-amber-500' },
    { label: 'Avg Engagement', value: `${avgEngagement.toFixed(2)}%`, icon: TrendingUp, color: 'text-pink-500' },
  ];

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/analytics')}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <h1 className="text-2xl font-bold">Content #{contentId} Analytics</h1>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <AnimatedList>
            {statCards.map((stat) => (
              <GlassCard key={stat.label} className="text-center">
                <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </GlassCard>
            ))}
          </AnimatedList>
        </div>

        {/* Per Platform Breakdown */}
        <GlassCard>
          <h2 className="text-lg font-semibold mb-4">Platform Breakdown</h2>
          {analytics.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No analytics data available yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Platform</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Impressions</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Clicks</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Likes</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Shares</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.map((a) => (
                    <motion.tr
                      key={a.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 capitalize font-medium">{a.platform}</td>
                      <td className="py-3 px-4 text-right">{a.impressions.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">{a.clicks.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">{a.likes.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">{a.shares.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">{a.engagement_rate.toFixed(2)}%</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>
    </PageWrapper>
  );
}
