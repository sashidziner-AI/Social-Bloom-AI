import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Image, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useCreative, useGenerateCreative } from '../../hooks/useCreatives';
import { creativeService } from '../../services/creativeService';
import { useQueryClient } from '@tanstack/react-query';

export function CreativeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const creativeId = Number(id);
  const { data: creative, isLoading, error } = useCreative(creativeId);
  const generateMutation = useGenerateCreative();
  const qc = useQueryClient();

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </PageWrapper>
    );
  }

  if (error || !creative) {
    return (
      <PageWrapper>
        <div className="text-center py-12">
          <p className="text-gray-500">Creative not found</p>
          <GradientButton onClick={() => navigate('/creatives')} className="mt-4">
            Back to Creatives
          </GradientButton>
        </div>
      </PageWrapper>
    );
  }

  const handleStatusUpdate = async (status: string) => {
    await creativeService.updateStatus(creativeId, status);
    qc.invalidateQueries({ queryKey: ['creative', creativeId] });
  };

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/creatives')}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <h1 className="text-2xl font-bold">Creative #{creative.id}</h1>
          <StatusBadge status={creative.status} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Generated */}
          <GlassCard>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Image className="w-5 h-5" /> AI Generated
            </h2>
            {creative.ai_generated_url ? (
              <img
                src={creative.ai_generated_url}
                alt="AI Generated"
                className="w-full rounded-lg object-cover max-h-96"
              />
            ) : (
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-400">No AI image generated yet</p>
              </div>
            )}
          </GlassCard>

          {/* Designer Uploaded */}
          <GlassCard>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Image className="w-5 h-5" /> Designer Upload
            </h2>
            {creative.designer_uploaded_url ? (
              <img
                src={creative.designer_uploaded_url}
                alt="Designer Uploaded"
                className="w-full rounded-lg object-cover max-h-96"
              />
            ) : (
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-400">No designer upload yet</p>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Details */}
        <GlassCard>
          <h2 className="text-lg font-semibold mb-4">Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Type</p>
              <p className="font-medium capitalize">{creative.creative_type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Content Request</p>
              <p className="font-medium">#{creative.content_request_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="font-medium">{new Date(creative.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <StatusBadge status={creative.status} />
            </div>
          </div>
          {creative.prompt && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Prompt</p>
              <p className="mt-1">{creative.prompt}</p>
            </div>
          )}
          {creative.notes && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Notes</p>
              <p className="mt-1">{creative.notes}</p>
            </div>
          )}
        </GlassCard>

        {/* Actions */}
        <div className="flex gap-3">
          {creative.status === 'pending' && (
            <GradientButton
              onClick={() => generateMutation.mutate(creativeId)}
              disabled={generateMutation.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
              Generate Creative
            </GradientButton>
          )}
          {creative.status === 'generated' && (
            <>
              <GradientButton onClick={() => handleStatusUpdate('approved')}>
                <CheckCircle className="w-4 h-4 mr-2" /> Approve
              </GradientButton>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStatusUpdate('rejected')}
                className="px-6 py-3 rounded-full font-semibold text-red-600 border-2 border-red-200 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2 inline" /> Reject
              </motion.button>
            </>
          )}
          {(creative.status === 'generated' || creative.status === 'designer_review') && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/creatives/${creativeId}/review`)}
              className="px-6 py-3 rounded-full font-semibold text-purple-600 border-2 border-purple-200 hover:bg-purple-50"
            >
              Designer Review
            </motion.button>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
