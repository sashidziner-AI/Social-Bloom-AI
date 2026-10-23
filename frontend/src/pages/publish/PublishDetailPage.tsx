import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, ExternalLink, RotateCcw, XCircle } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { usePublishJob, useRetryPublishJob, useCancelPublishJob } from '../../hooks/usePublish';

export function PublishDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const jobId = Number(id);
  const { data: job, isLoading } = usePublishJob(jobId);
  const retryMutation = useRetryPublishJob();
  const cancelMutation = useCancelPublishJob();

  if (isLoading || !job) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/publish')}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <h1 className="text-2xl font-bold">Publish Job #{job.id}</h1>
          <StatusBadge status={job.status} />
        </div>

        {/* Job Details */}
        <GlassCard>
          <h2 className="text-lg font-semibold mb-4">Job Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Platform</p>
              <p className="font-medium capitalize">{job.platform}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Content Request</p>
              <p className="font-medium">#{job.content_request_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Publish Target</p>
              <p className="font-medium capitalize">{job.publish_target.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Scheduled At</p>
              <p className="font-medium">
                {job.scheduled_at ? new Date(job.scheduled_at).toLocaleString() : 'Immediate'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Published At</p>
              <p className="font-medium">
                {job.published_at ? new Date(job.published_at).toLocaleString() : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Retry Count</p>
              <p className="font-medium">{job.retry_count}</p>
            </div>
          </div>
        </GlassCard>

        {/* Platform Response */}
        {(job.platform_post_url || job.platform_post_id) && (
          <GlassCard>
            <h2 className="text-lg font-semibold mb-4">Platform Response</h2>
            {job.platform_post_id && (
              <div className="mb-2">
                <p className="text-sm text-gray-500">Post ID</p>
                <p className="font-mono text-sm">{job.platform_post_id}</p>
              </div>
            )}
            {job.platform_post_url && (
              <a
                href={job.platform_post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800"
              >
                <ExternalLink className="w-4 h-4" /> View Post on {job.platform}
              </a>
            )}
          </GlassCard>
        )}

        {/* Error */}
        {job.error_message && (
          <GlassCard className="border-red-200">
            <h2 className="text-lg font-semibold mb-2 text-red-600">Error</h2>
            <p className="text-red-500 font-mono text-sm bg-red-50 p-3 rounded-lg">
              {job.error_message}
            </p>
          </GlassCard>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {job.status === 'failed' && (
            <GradientButton
              onClick={() => retryMutation.mutate(jobId)}
              disabled={retryMutation.isPending}
            >
              <RotateCcw className={`w-4 h-4 mr-2 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
              Retry Publish
            </GradientButton>
          )}
          {job.status === 'scheduled' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => cancelMutation.mutate(jobId)}
              disabled={cancelMutation.isPending}
              className="px-6 py-3 rounded-full font-semibold text-red-600 border-2 border-red-200 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2 inline" /> Cancel
            </motion.button>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
