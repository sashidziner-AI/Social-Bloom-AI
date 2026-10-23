import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Send } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { useCreatePublishJob } from '../../hooks/usePublish';
import type { Platform, PublishTarget } from '../../types';

const PLATFORMS: Platform[] = ['facebook', 'linkedin', 'instagram', 'twitter'];
const TARGETS: PublishTarget[] = ['profile', 'company_page', 'both'];

export function PublishSchedulePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetContentId = searchParams.get('content_request_id');

  const [contentRequestId, setContentRequestId] = useState(presetContentId || '');
  const [creativeId, setCreativeId] = useState('');
  const [platform, setPlatform] = useState<Platform>('linkedin');
  const [publishTarget, setPublishTarget] = useState<PublishTarget>('profile');
  const [scheduledAt, setScheduledAt] = useState('');
  const createMutation = useCreatePublishJob();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      {
        content_request_id: Number(contentRequestId),
        creative_id: creativeId ? Number(creativeId) : undefined,
        platform,
        publish_target: publishTarget,
        scheduled_at: scheduledAt || undefined,
      } as Parameters<typeof createMutation.mutate>[0],
      { onSuccess: () => navigate('/publish') }
    );
  };

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/publish')}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <h1 className="text-2xl font-bold">Schedule Publication</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <GlassCard>
            <h2 className="text-lg font-semibold mb-4">Content</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Content Request ID *</label>
                <motion.input
                  whileFocus={{ scale: 1.01 }}
                  type="number"
                  value={contentRequestId}
                  onChange={(e) => setContentRequestId(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 outline-none"
                  placeholder="Enter content request ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Creative ID (optional)</label>
                <motion.input
                  whileFocus={{ scale: 1.01 }}
                  type="number"
                  value={creativeId}
                  onChange={(e) => setCreativeId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 outline-none"
                  placeholder="Enter creative ID"
                />
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="text-lg font-semibold mb-4">Platform</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PLATFORMS.map((p) => (
                <motion.button
                  key={p}
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPlatform(p)}
                  className={`p-3 rounded-xl border-2 font-medium capitalize transition-colors ${
                    platform === p
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {p}
                </motion.button>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="text-lg font-semibold mb-4">Publish Target</h2>
            <div className="grid grid-cols-3 gap-3">
              {TARGETS.map((t) => (
                <motion.button
                  key={t}
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPublishTarget(t)}
                  className={`p-3 rounded-xl border-2 font-medium capitalize transition-colors ${
                    publishTarget === t
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {t.replace('_', ' ')}
                </motion.button>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Schedule
            </h2>
            <div>
              <label className="block text-sm font-medium mb-1">
                Schedule Date & Time (leave empty for immediate)
              </label>
              <motion.input
                whileFocus={{ scale: 1.01 }}
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 outline-none"
              />
            </div>
          </GlassCard>

          <div className="flex gap-3">
            <GradientButton type="submit" disabled={createMutation.isPending}>
              <Send className="w-4 h-4 mr-2" />
              {scheduledAt ? 'Schedule Publication' : 'Publish Now'}
            </GradientButton>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/publish')}
              className="px-6 py-3 rounded-full font-semibold text-gray-600 border-2 border-gray-200 hover:bg-gray-50"
            >
              Cancel
            </motion.button>
          </div>
        </form>
      </div>
    </PageWrapper>
  );
}
