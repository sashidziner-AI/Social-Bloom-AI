import { motion } from 'framer-motion';
import { Eye, MousePointer, Heart, Share2, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { PlatformIcon } from '../../components/ui/PlatformIcons';
import { GlassCard } from '../../components/ui/GlassCard';
import { analyticsService } from '../../services/analyticsService';
import type { OverviewData, PlatformData } from '../../services/analyticsService';

function StatCard({
  label,
  value,
  icon,
  color,
  delay,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <GlassCard className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-r ${color} flex items-center justify-center text-white`}
        >
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </GlassCard>
    </motion.div>
  );
}

const platforms = ['facebook', 'linkedin', 'instagram', 'twitter'];
// Platform gradient colors available for future chart styling
// facebook: 'from-blue-500 to-blue-600', linkedin: 'from-sky-600 to-sky-700',
// instagram: 'from-pink-500 to-rose-500', twitter: 'from-gray-700 to-gray-900'

export function AnalyticsPage() {
  const { data: overview } = useQuery<OverviewData>({
    queryKey: ['analytics-overview'],
    queryFn: () => analyticsService.overview().then((r) => r.data),
  });

  const { data: platformData } = useQuery<PlatformData[]>({
    queryKey: ['analytics-platforms'],
    queryFn: async () => {
      const results = await Promise.all(
        platforms.map((p) => analyticsService.platformAnalytics(p).then((r) => r.data))
      );
      return results;
    },
  });

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">Analytics</h1>
          <p className="text-gray-500 mt-1">Content performance and engagement metrics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="Impressions"
            value={formatNumber(overview?.total_impressions || 0)}
            icon={<Eye size={22} />}
            color="from-blue-500 to-cyan-500"
            delay={0}
          />
          <StatCard
            label="Clicks"
            value={formatNumber(overview?.total_clicks || 0)}
            icon={<MousePointer size={22} />}
            color="from-purple-500 to-pink-500"
            delay={0.1}
          />
          <StatCard
            label="Likes"
            value={formatNumber(overview?.total_likes || 0)}
            icon={<Heart size={22} />}
            color="from-red-400 to-rose-500"
            delay={0.2}
          />
          <StatCard
            label="Shares"
            value={formatNumber(overview?.total_shares || 0)}
            icon={<Share2 size={22} />}
            color="from-green-500 to-emerald-500"
            delay={0.3}
          />
          <StatCard
            label="Avg Engagement"
            value={`${(overview?.avg_engagement_rate || 0).toFixed(1)}%`}
            icon={<TrendingUp size={22} />}
            color="from-amber-500 to-orange-500"
            delay={0.4}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(platformData || platforms.map((p) => ({
              platform: p,
              total_posts: 0,
              total_impressions: 0,
              total_engagement: 0,
            }))).map((pd, i) => (
              <motion.div
                key={pd.platform}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <GlassCard>
                  <div className="flex items-center gap-2 mb-3">
                    <PlatformIcon platform={pd.platform} size={28} />
                    <span className="font-medium text-gray-900 capitalize">
                      {pd.platform}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Posts</span>
                      <span className="font-medium">{pd.total_posts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Impressions</span>
                      <span className="font-medium">{formatNumber(pd.total_impressions)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Engagement</span>
                      <span className="font-medium">{formatNumber(pd.total_engagement)}</span>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
