import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FileText, Image, CheckSquare, Send, Clock, AlertCircle, Users,
  Palette, ArrowUpCircle, Eye, RotateCcw,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '../components/layout/PageWrapper';
import { GlassCard } from '../components/ui/GlassCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DataTable } from '../components/ui/DataTable';
import { PlatformIcon } from '../components/ui/PlatformIcons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import type { UserRole } from '../types';

function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<Record<string, unknown>>('/analytics/dashboard').then((r) => r.data),
  });
}

interface StatCard {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  link?: string;
}

function getStatCards(role: UserRole, stats: Record<string, unknown>): StatCard[] {
  const n = (key: string) => (stats[key] as number) ?? 0;

  switch (role) {
    case 'creator':
      return [
        { label: 'My Requests', value: n('my_requests'), icon: <FileText size={22} />, color: 'from-blue-500 to-cyan-500', link: '/posters' },
        { label: 'Drafts', value: n('drafts'), icon: <Clock size={22} />, color: 'from-gray-500 to-slate-500', link: '/posters' },
        { label: 'Pending Review', value: n('pending_review'), icon: <ArrowUpCircle size={22} />, color: 'from-amber-500 to-orange-500', link: '/posters' },
        { label: 'Approved', value: n('approved'), icon: <CheckSquare size={22} />, color: 'from-green-500 to-emerald-500', link: '/posters' },
        { label: 'Published', value: n('published'), icon: <Send size={22} />, color: 'from-purple-500 to-pink-500', link: '/posters' },
        { label: 'Revisions Needed', value: n('revision_requested'), icon: <RotateCcw size={22} />, color: 'from-red-500 to-rose-500', link: '/posters' },
      ];
    case 'designer':
      return [
        { label: 'Assigned Creatives', value: n('assigned_creatives'), icon: <Palette size={22} />, color: 'from-purple-500 to-indigo-500', link: '/creatives' },
        { label: 'Pending Upload', value: n('pending_upload'), icon: <Image size={22} />, color: 'from-amber-500 to-orange-500', link: '/creatives' },
        { label: 'Submitted', value: n('submitted'), icon: <ArrowUpCircle size={22} />, color: 'from-blue-500 to-cyan-500', link: '/creatives' },
        { label: 'Approved', value: n('approved'), icon: <CheckSquare size={22} />, color: 'from-green-500 to-emerald-500', link: '/creatives' },
      ];
    case 'team_lead':
      return [
        { label: 'Content to Review', value: n('content_pending_review'), icon: <Eye size={22} />, color: 'from-amber-500 to-orange-500', link: '/posters' },
        { label: 'Creatives to Review', value: n('creatives_pending_review'), icon: <Palette size={22} />, color: 'from-purple-500 to-indigo-500', link: '/posters' },
        { label: 'Ready to Publish', value: n('ready_to_publish'), icon: <Send size={22} />, color: 'from-green-500 to-emerald-500', link: '/posters' },
        { label: 'Total Content', value: n('total_content'), icon: <FileText size={22} />, color: 'from-blue-500 to-cyan-500', link: '/posters' },
        { label: 'Published', value: n('published'), icon: <CheckSquare size={22} />, color: 'from-pink-500 to-rose-500', link: '/posters' },
      ];
    case 'manager':
      return [
        { label: 'Content to Review', value: n('content_pending_review'), icon: <Eye size={22} />, color: 'from-amber-500 to-orange-500', link: '/posters' },
        { label: 'Creatives to Review', value: n('creatives_pending_review'), icon: <Palette size={22} />, color: 'from-purple-500 to-indigo-500', link: '/posters' },
        { label: 'Total Content', value: n('total_content'), icon: <FileText size={22} />, color: 'from-blue-500 to-cyan-500', link: '/posters' },
        { label: 'Approved', value: n('approved'), icon: <CheckSquare size={22} />, color: 'from-green-500 to-emerald-500', link: '/posters' },
        { label: 'Published', value: n('published'), icon: <Send size={22} />, color: 'from-pink-500 to-rose-500', link: '/posters' },
      ];
    case 'admin':
      return [
        { label: 'Active Users', value: n('total_users'), icon: <Users size={22} />, color: 'from-blue-500 to-cyan-500', link: '/admin' },
        { label: 'Total Content', value: n('total_content'), icon: <FileText size={22} />, color: 'from-purple-500 to-pink-500', link: '/posters' },
        { label: 'Total Creatives', value: n('total_creatives'), icon: <Palette size={22} />, color: 'from-indigo-500 to-purple-500', link: '/creatives' },
        { label: 'Pending Approvals', value: n('pending_approvals'), icon: <AlertCircle size={22} />, color: 'from-amber-500 to-orange-500', link: '/approvals' },
        { label: 'Published', value: n('published'), icon: <Send size={22} />, color: 'from-green-500 to-emerald-500', link: '/posters' },
      ];
    default:
      return [];
  }
}

const roleDescriptions: Record<string, string> = {
  creator: "Here's an overview of your content requests",
  designer: "Here's your creative workload",
  team_lead: "Here's your team's content pipeline",
  manager: "Here's the content awaiting your review",
  admin: "Here's a platform-wide overview",
};

interface RecentItem {
  id: number;
  title: string;
  status: string;
  platform: string;
  updated_at: string;
  created_at: string;
  last_action?: string;
  last_action_by?: string;
  last_action_role?: string;
  last_action_at?: string;
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useDashboard();
  const role = (user?.role || 'creator') as UserRole;

  const cards = stats ? getStatCards(role, stats) : [];
  const recent = (stats?.recent_activity || []) as RecentItem[];

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            Welcome back, {user?.full_name || 'User'}
          </h1>
          <p className="text-gray-500 mt-1">{roleDescriptions[role] || "Here's your dashboard"}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  {stat.link ? (
                    <Link to={stat.link}>
                      <GlassCard className="flex items-center gap-4 hover:shadow-lg transition-shadow cursor-pointer">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center text-white`}>
                          {stat.icon}
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                          <p className="text-sm text-gray-500">{stat.label}</p>
                        </div>
                      </GlassCard>
                    </Link>
                  ) : (
                    <GlassCard className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center text-white`}>
                        {stat.icon}
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-sm text-gray-500">{stat.label}</p>
                      </div>
                    </GlassCard>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
              <GlassCard>
                {recent.filter((item) => item.platform !== 'twitter').length === 0 ? (
                  <p className="text-center text-gray-400 py-6">No recent activity yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                          <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                          <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Last Action</th>
                          <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="text-right py-2.5 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recent.filter((item) => item.platform !== 'twitter').map((item, idx) => {
                          const actionLabels: Record<string, { label: string; color: string }> = {
                            submitted: { label: 'Submitted', color: 'text-blue-600 bg-blue-50' },
                            approved: { label: 'Approved', color: 'text-green-600 bg-green-50' },
                            rejected: { label: 'Rejected', color: 'text-red-600 bg-red-50' },
                            revision_requested: { label: 'Revision', color: 'text-amber-600 bg-amber-50' },
                          };
                          const actionInfo = item.last_action ? actionLabels[item.last_action] : null;

                          const roleColors: Record<string, string> = {
                            admin: 'text-red-600',
                            manager: 'text-purple-600',
                            team_lead: 'text-indigo-600',
                            creator: 'text-cyan-600',
                            designer: 'text-pink-600',
                          };

                          const timeAgo = (() => {
                            const ts = item.last_action_at || item.updated_at || item.created_at;
                            if (!ts) return '';
                            const diff = Date.now() - new Date(ts).getTime();
                            const mins = Math.floor(diff / 60000);
                            if (mins < 1) return 'Just now';
                            if (mins < 60) return `${mins}m ago`;
                            const hrs = Math.floor(mins / 60);
                            if (hrs < 24) return `${hrs}h ago`;
                            const days = Math.floor(hrs / 24);
                            if (days < 7) return `${days}d ago`;
                            return new Date(ts).toLocaleDateString();
                          })();

                          return (
                            <motion.tr
                              key={item.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: idx * 0.03 }}
                              className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors"
                            >
                              <td className="py-2.5 px-3">
                                <Link to={`/posters/${item.id}`} className="text-sm font-medium text-purple-600 hover:underline truncate block max-w-[250px]">
                                  {item.title}
                                </Link>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="flex items-center gap-1.5 text-sm text-gray-700 capitalize">
                                  <PlatformIcon platform={item.platform} size={15} />
                                  {item.platform}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                {item.last_action_by && actionInfo ? (
                                  <div className="text-xs">
                                    <span className={`font-medium ${item.last_action_role ? roleColors[item.last_action_role] || 'text-gray-700' : 'text-gray-700'}`}>
                                      {item.last_action_by}
                                    </span>
                                    <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${actionInfo.color}`}>
                                      {actionInfo.label}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <StatusBadge status={item.status} />
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span className="text-xs text-gray-400">{timeAgo}</span>
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
          </>
        )}
      </div>
    </PageWrapper>
  );
}
