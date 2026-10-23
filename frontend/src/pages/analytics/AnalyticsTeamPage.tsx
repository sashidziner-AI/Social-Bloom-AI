import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, RefreshCw } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { AnimatedList } from '../../components/ui/AnimatedList';
import { analyticsService, type TeamMember } from '../../services/analyticsService';

export function AnalyticsTeamPage() {
  const navigate = useNavigate();

  const { data: members, isLoading } = useQuery({
    queryKey: ['analytics-team'],
    queryFn: () => analyticsService.teamProductivity().then((r) => r.data),
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

  const teamMembers: TeamMember[] = members || [];

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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> Team Productivity
          </h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AnimatedList>
            {[
              {
                label: 'Total Members',
                value: teamMembers.length,
              },
              {
                label: 'Total Content Created',
                value: teamMembers.reduce((s, m) => s + m.content_created, 0),
              },
              {
                label: 'Total Published',
                value: teamMembers.reduce((s, m) => s + m.content_published, 0),
              },
            ].map((stat) => (
              <GlassCard key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-purple-600">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </GlassCard>
            ))}
          </AnimatedList>
        </div>

        {/* Team Table */}
        <GlassCard>
          <h2 className="text-lg font-semibold mb-4">Member Performance</h2>
          {teamMembers.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No team data available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Member</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Created</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Approved</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Published</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Approval Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member) => {
                    const approvalRate = member.content_created > 0
                      ? ((member.content_approved / member.content_created) * 100).toFixed(0)
                      : '0';
                    return (
                      <motion.tr
                        key={member.user_id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 font-medium">
                          {member.full_name || `User #${member.user_id}`}
                        </td>
                        <td className="py-3 px-4 text-right">{member.content_created}</td>
                        <td className="py-3 px-4 text-right">{member.content_approved}</td>
                        <td className="py-3 px-4 text-right">{member.content_published}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-medium ${
                            Number(approvalRate) >= 80 ? 'text-green-600' :
                            Number(approvalRate) >= 50 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {approvalRate}%
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>
    </PageWrapper>
  );
}
