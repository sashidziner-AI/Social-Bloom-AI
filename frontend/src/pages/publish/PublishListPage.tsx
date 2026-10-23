import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, RefreshCw, XCircle, ExternalLink, Send } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { DataTable } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Pagination } from '../../components/ui/Pagination';
import { Select } from '../../components/ui/Select';
import { usePublishJobs, useCancelPublishJob, useRetryPublishJob } from '../../hooks/usePublish';
import { PlatformIcon } from '../../components/ui/PlatformIcons';
import type { PublishJob } from '../../types';

const platformOptions = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter/X' },
];

const statusOptions = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'publishing', label: 'Publishing' },
  { value: 'published', label: 'Published' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function PublishListPage() {
  const [page, setPage] = useState(1);
  const [platformFilter, setPlatformFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = usePublishJobs({
    platform: platformFilter || undefined,
    status: statusFilter || undefined,
    page,
  });

  const cancelMutation = useCancelPublishJob();
  const retryMutation = useRetryPublishJob();

  const columns = [
    {
      key: 'content',
      header: 'Content',
      render: (item: PublishJob) => (
        <Link to={`/posters/${item.content_request_id}`} className="flex items-center gap-2 min-w-0">
          <PlatformIcon platform={item.platform} size={20} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-purple-600 hover:underline truncate">
              {item.content_title || `Request #${item.content_request_id}`}
            </p>
            <p className="text-xs text-gray-400 capitalize">{item.platform}</p>
          </div>
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: PublishJob) => <StatusBadge status={item.status} />,
    },
    {
      key: 'scheduled',
      header: 'Scheduled',
      render: (item: PublishJob) =>
        item.scheduled_at ? (
          <span className="flex items-center gap-1 text-sm text-gray-600">
            <Calendar size={13} className="text-gray-400" />
            {new Date(item.scheduled_at).toLocaleString()}
          </span>
        ) : (
          <span className="text-xs text-gray-400">Immediate</span>
        ),
    },
    {
      key: 'published',
      header: 'Published At',
      render: (item: PublishJob) =>
        item.published_at ? (
          <span className="text-sm text-gray-600">{new Date(item.published_at).toLocaleString()}</span>
        ) : (
          <span className="text-gray-300">-</span>
        ),
    },
    {
      key: 'link',
      header: 'Post Link',
      render: (item: PublishJob) =>
        item.platform_post_url ? (
          <a
            href={item.platform_post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-purple-600 hover:underline"
          >
            <ExternalLink size={12} /> View Post
          </a>
        ) : (
          <span className="text-gray-300">-</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      render: (item: PublishJob) => (
        <div className="flex gap-1">
          {item.status === 'scheduled' && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => cancelMutation.mutate(item.id)}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
              title="Cancel"
            >
              <XCircle size={16} />
            </motion.button>
          )}
          {item.status === 'failed' && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => retryMutation.mutate(item.id)}
              className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50"
              title="Retry"
            >
              <RefreshCw size={16} />
            </motion.button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">Publishing</h1>
          <p className="text-gray-500 mt-1">Manage scheduled and published posts</p>
        </div>

        <div className="flex gap-3">
          <Select
            value={platformFilter}
            onChange={setPlatformFilter}
            options={platformOptions}
            placeholder="All Platforms"
            className="w-48"
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            placeholder="All Statuses"
            className="w-44"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          </div>
        ) : (data?.items.length ?? 0) === 0 ? (
          <GlassCard className="text-center py-12">
            <Send size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No publish jobs yet.</p>
          </GlassCard>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={data?.items || []}
              keyExtractor={(item) => item.id}
              emptyMessage="No publish jobs yet."
            />
            {data && (
              <Pagination
                page={page}
                totalPages={Math.ceil(data.total / data.per_page)}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
