import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, CheckCircle, XCircle, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useCreative, useUploadCreative } from '../../hooks/useCreatives';
import { useContentRequest } from '../../hooks/useContentRequests';
import { useCompany } from '../../hooks/useCompanies';
import { creativeService } from '../../services/creativeService';
import { useQueryClient } from '@tanstack/react-query';
import { ManualImageEditor } from './ManualImageEditor';

export function CreativeReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const creativeId = Number(id);
  const { data: creative, isLoading } = useCreative(creativeId);
  const { data: contentRequest } = useContentRequest(creative?.content_request_id ?? 0);
  const { data: company } = useCompany(contentRequest?.company_id ?? null);
  const uploadMutation = useUploadCreative();
  const qc = useQueryClient();
  const [dragActive, setDragActive] = useState(false);
  const [comments, setComments] = useState('');
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      uploadMutation.mutate({ id: creativeId, file });
    }
  }, [creativeId, uploadMutation]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate({ id: creativeId, file });
    }
  };

  const handleStatusUpdate = async (status: string) => {
    await creativeService.updateStatus(creativeId, status);
    qc.invalidateQueries({ queryKey: ['creative', creativeId] });
    navigate(`/creatives/${creativeId}`);
  };

  if (isLoading || !creative) {
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
            onClick={() => navigate(`/creatives/${creativeId}`)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <h1 className="text-2xl font-bold">Designer Review</h1>
          <StatusBadge status={creative.status} />
          <div className="ml-auto inline-flex rounded-full bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setMode('auto')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition ${
                mode === 'auto' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Sparkles className="w-4 h-4" /> Auto
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition ${
                mode === 'manual' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Wand2 className="w-4 h-4" /> Manual
            </button>
          </div>
        </div>

        {mode === 'manual' ? (
          <ManualImageEditor
            creativeId={creativeId}
            defaultHeadline={contentRequest?.title}
            companyLogoUrl={company?.logo_url ?? null}
          />
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Generated */}
          <GlassCard>
            <h2 className="text-lg font-semibold mb-4">AI Generated</h2>
            {creative.ai_generated_url ? (
              <div
                className="bg-gray-100 rounded-lg overflow-hidden w-full mx-auto aspect-square"
                style={{ maxWidth: 1200, maxHeight: 1200 }}
              >
                <img
                  src={creative.ai_generated_url}
                  alt="AI Generated"
                  className="w-full h-full object-contain"
                  width={1200}
                  height={1200}
                />
              </div>
            ) : (
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-400">No AI image</p>
              </div>
            )}
          </GlassCard>

          {/* Upload Zone */}
          <GlassCard>
            <h2 className="text-lg font-semibold mb-4">Upload Replacement</h2>
            {creative.designer_uploaded_url ? (
              <div className="space-y-4">
                <div
                  className="bg-gray-100 rounded-lg overflow-hidden w-full mx-auto aspect-square"
                  style={{ maxWidth: 1200, maxHeight: 1200 }}
                >
                  <img
                    src={creative.designer_uploaded_url}
                    alt="Designer Upload"
                    className="w-full h-full object-contain"
                    width={1200}
                    height={1200}
                  />
                </div>
                <label className="block">
                  <motion.span
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-block px-4 py-2 rounded-lg border-2 border-purple-200 text-purple-600 cursor-pointer hover:bg-purple-50"
                  >
                    Replace Image
                  </motion.span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                </label>
              </div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors ${
                  dragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300'
                }`}
              >
                <Upload className="w-10 h-10 text-gray-400 mb-3" />
                <p className="text-gray-500 mb-2">Drag & drop an image here</p>
                <label>
                  <motion.span
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-block px-4 py-2 rounded-lg bg-purple-100 text-purple-600 cursor-pointer"
                  >
                    Browse Files
                  </motion.span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                </label>
                {uploadMutation.isPending && (
                  <p className="text-sm text-purple-500 mt-2">Uploading...</p>
                )}
              </div>
            )}
          </GlassCard>
        </div>
        )}

        {/* Comments */}
        <GlassCard>
          <h2 className="text-lg font-semibold mb-3">Review Comments</h2>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Add comments about this creative..."
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 outline-none min-h-[100px]"
          />
        </GlassCard>

        {/* Actions */}
        <div className="flex gap-3">
          <GradientButton onClick={() => handleStatusUpdate('approved')}>
            <CheckCircle className="w-4 h-4 mr-2" /> Approve Creative
          </GradientButton>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleStatusUpdate('rejected')}
            className="px-6 py-3 rounded-full font-semibold text-red-600 border-2 border-red-200 hover:bg-red-50"
          >
            <XCircle className="w-4 h-4 mr-2 inline" /> Reject
          </motion.button>
        </div>
      </div>
    </PageWrapper>
  );
}
