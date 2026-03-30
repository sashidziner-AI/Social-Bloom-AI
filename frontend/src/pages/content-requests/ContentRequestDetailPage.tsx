import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Sparkles,
  Send,
  Trash2,
  CheckCircle,
  XCircle,
  RotateCcw,
  AlertCircle,
  Clock,
  ArrowUpCircle,
  Palette,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TextArea } from '../../components/ui/TextArea';
import {
  useContentRequest,
  useGenerateContent,
  useUpdateContentStatus,
  useUpdateContentRequest,
  useDeleteContentRequest,
  useSubmitForApproval,
} from '../../hooks/useContentRequests';
// AnimatedInput available for form editing
import { useCreatives } from '../../hooks/useCreatives';
import { useMyPermissions } from '../../hooks/usePermissions';
import { PlatformIcon } from '../../components/ui/PlatformIcons';
import { approvalService } from '../../services/approvalService';
import { creativeService } from '../../services/creativeService';
import { useAuth } from '../../context/AuthContext';
import type { UserRole, Creative, ContentRequest } from '../../types';

const WORKFLOW_STEPS = [
  { key: 'draft', label: 'Draft', icon: Clock },
  { key: 'pending_review', label: 'Team Lead Review', icon: ArrowUpCircle },
  { key: 'reviewed', label: 'Manager Review', icon: ArrowUpCircle },
  { key: 'designer_review', label: 'Designer Review', icon: Palette },
  { key: 'approved', label: 'Approved', icon: CheckCircle },
  { key: 'published', label: 'Published', icon: Send },
];

function getStepIndex(status: string): number {
  if (status === 'revision_requested') return -1;
  return WORKFLOW_STEPS.findIndex((s) => s.key === status);
}

function WorkflowProgress({ status }: { status: string }) {
  const currentIdx = getStepIndex(status);
  const isRevision = status === 'revision_requested';

  return (
    <GlassCard>
      <h3 className="font-semibold text-gray-900 mb-4">Workflow Progress</h3>
      {isRevision && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle size={16} className="text-amber-600" />
          <span className="text-sm text-amber-800">
            Revision requested — content sent back to requester for corrections
          </span>
        </div>
      )}
      <div className="flex items-center gap-1">
        {WORKFLOW_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isComplete = currentIdx > idx;
          const isCurrent = currentIdx === idx;
          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isComplete
                      ? 'bg-green-100 text-green-600'
                      : isCurrent
                        ? 'bg-purple-100 text-purple-600 ring-2 ring-purple-300'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <Icon size={16} />
                </div>
                <span
                  className={`text-[10px] mt-1 text-center leading-tight ${
                    isCurrent ? 'text-purple-700 font-medium' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < WORKFLOW_STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 -mt-4 ${
                    isComplete ? 'bg-green-300' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

function canPerformAction(role: UserRole, status: string, isOwner: boolean): string[] {
  const actions: string[] = [];
  switch (role) {
    case 'creator':
      if (status === 'draft') actions.push('generate', 'submit', 'delete');
      if (status === 'revision_requested' && isOwner) actions.push('generate', 'resubmit', 'edit');
      break;
    case 'team_lead':
      if (status === 'draft') actions.push('generate', 'submit', 'delete');
      if (status === 'revision_requested' && isOwner) actions.push('generate', 'resubmit', 'edit');
      if (status === 'pending_review') actions.push('tl_approve', 'tl_reject');
      if (status === 'approved') actions.push('publish');
      break;
    case 'manager':
      if (status === 'reviewed') actions.push('mgr_approve', 'mgr_reject');
      break;
    case 'designer':
      // Designer actions are handled in CreativesSection, not here
      break;
    case 'admin':
      if (status === 'pending_review') actions.push('tl_approve', 'tl_reject');
      if (status === 'reviewed') actions.push('mgr_approve', 'mgr_reject');
      if (status === 'approved') actions.push('publish');
      break;
    default:
      break;
  }
  return actions;
}

function RequestDetailsCard({ content, canEdit, contentId }: { content: ContentRequest; canEdit: boolean; contentId: number }) {
  const qc = useQueryClient();
  const updateMutation = useUpdateContentRequest();
  const [editing, setEditing] = useState(false);
  const [targetAudience, setTargetAudience] = useState(content.target_audience || '');
  const [topic, setTopic] = useState(content.topic);
  const [keywordsStr, setKeywordsStr] = useState(content.keywords.join(', '));

  const startEdit = () => {
    setTargetAudience(content.target_audience || '');
    setTopic(content.topic);
    setKeywordsStr(content.keywords.join(', '));
    setEditing(true);
  };

  const handleSave = async () => {
    const keywords = keywordsStr.split(',').map((k) => k.trim()).filter(Boolean);
    await updateMutation.mutateAsync({
      id: contentId,
      data: { target_audience: targetAudience || undefined, topic, keywords },
    });
    qc.invalidateQueries({ queryKey: ['content-request', contentId] });
    setEditing(false);
  };

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Request Details</h3>
        {canEdit && !editing && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startEdit}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200"
          >
            <Pencil size={12} /> Edit
          </motion.button>
        )}
        {editing && (
          <div className="flex items-center gap-1.5">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setEditing(false)}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200"
            >
              <X size={12} /> Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            >
              <Save size={12} /> {updateMutation.isPending ? 'Saving...' : 'Save'}
            </motion.button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500">Target Audience</label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-purple-500 outline-none"
              placeholder="E.g., Marketing professionals aged 25-40"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Topic / Brief</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={3}
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-purple-500 outline-none resize-none"
              placeholder="Describe the content topic..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Keywords (comma-separated)</label>
            <input
              type="text"
              value={keywordsStr}
              onChange={(e) => setKeywordsStr(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-purple-500 outline-none"
              placeholder="marketing, social media, growth"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-gray-500">Target Audience:</span>
            <p className="text-gray-900 mt-0.5">{content.target_audience || 'Not specified'}</p>
          </div>
          <div>
            <span className="text-gray-500">Topic:</span>
            <p className="text-gray-900 mt-0.5">{content.topic}</p>
          </div>
          <div>
            <span className="text-gray-500">Keywords:</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {content.keywords.length > 0 ? (
                content.keywords.map((kw) => (
                  <span key={kw} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs">{kw}</span>
                ))
              ) : (
                <span className="text-gray-400">None</span>
              )}
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function AIContentCard({ content, canEdit, contentId }: { content: ContentRequest; canEdit: boolean; contentId: number }) {
  const qc = useQueryClient();
  const updateMutation = useUpdateContentRequest();
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(content.generated_caption || '');
  const [description, setDescription] = useState(content.generated_description || '');
  const [hashtagsStr, setHashtagsStr] = useState((content.generated_hashtags || []).join(', '));

  const startEdit = () => {
    setCaption(content.generated_caption || '');
    setDescription(content.generated_description || '');
    setHashtagsStr((content.generated_hashtags || []).join(', '));
    setEditing(true);
  };

  const handleSave = async () => {
    const hashtags = hashtagsStr.split(',').map((t) => t.trim()).filter(Boolean);
    await updateMutation.mutateAsync({
      id: contentId,
      data: { generated_caption: caption, generated_description: description, generated_hashtags: hashtags },
    });
    qc.invalidateQueries({ queryKey: ['content-request', contentId] });
    setEditing(false);
  };

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">
          AI-Generated Content
          {content.generated_caption && <Sparkles size={14} className="inline ml-2 text-purple-500" />}
        </h3>
        {canEdit && content.generated_caption && !editing && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startEdit}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200"
          >
            <Pencil size={12} /> Edit
          </motion.button>
        )}
        {editing && (
          <div className="flex items-center gap-1.5">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setEditing(false)}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200"
            >
              <X size={12} /> Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            >
              <Save size={12} /> {updateMutation.isPending ? 'Saving...' : 'Save'}
            </motion.button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-purple-500 outline-none resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-purple-500 outline-none resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Hashtags (comma-separated)</label>
            <input
              type="text"
              value={hashtagsStr}
              onChange={(e) => setHashtagsStr(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-purple-500 outline-none"
              placeholder="#marketing, #content, #growth"
            />
          </div>
        </div>
      ) : content.generated_caption ? (
        <div className="space-y-4 text-sm">
          <div>
            <span className="text-gray-500">Caption:</span>
            <p className="text-gray-900 mt-0.5 bg-gray-50 p-3 rounded-lg">{content.generated_caption}</p>
          </div>
          <div>
            <span className="text-gray-500">Description:</span>
            <p className="text-gray-900 mt-0.5 bg-gray-50 p-3 rounded-lg">{content.generated_description}</p>
          </div>
          <div>
            <span className="text-gray-500">Hashtags:</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {content.generated_hashtags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-400 text-sm">
          Click &quot;Generate with AI&quot; to create content for this request.
        </p>
      )}
    </GlassCard>
  );
}

function CreativesSection({ contentRequestId, role }: { contentRequestId: number; role: UserRole }) {
  const qc = useQueryClient();
  const { data: creativesData, isLoading } = useCreatives({ content_request_id: contentRequestId });
  const { data: permissions, isLoading: permsLoading } = useMyPermissions();
  const hasImagePreviewPerm = permsLoading ? true : (permissions?.['creatives.image_preview'] ?? true);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      creativeService.upload(id, file),
    onSuccess: async () => {
      setUploadingId(null);
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      await qc.invalidateQueries({ queryKey: ['creatives'] });
    },
  });

  const resetUpload = () => {
    setUploadingId(null);
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      creativeService.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['creatives'] });
      qc.invalidateQueries({ queryKey: ['content-request', contentRequestId] });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: (id: number) => creativeService.generate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['creatives'] });
    },
  });

  if (isLoading) {
    return (
      <GlassCard>
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
        </div>
      </GlassCard>
    );
  }

  const creatives: Creative[] = creativesData?.items || [];

  if (creatives.length === 0) {
    return (
      <GlassCard>
        <h3 className="font-semibold text-gray-900 mb-2">Creatives</h3>
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Clock size={16} className="text-amber-600" />
          <span className="text-sm text-amber-800">
            AI image is being generated. Please refresh in a moment.
          </span>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <h3 className="font-semibold text-gray-900 mb-4">Creatives</h3>
      <div className="space-y-4">
        {creatives.map((creative) => (
          <div key={creative.id} className="border border-gray-200 rounded-xl overflow-hidden">
            {(() => {
              // Image & prompt visibility logic per role and creative status:
              // Designer: always sees image (it's their work)
              // Team Lead: sees image only after designer submits (submitted, tl_approved, approved)
              // Manager: sees image only after TL approves (tl_approved, approved) — unless image_preview perm enabled
              // Admin: always sees image
              const postSubmitStatuses = ['submitted', 'tl_approved', 'approved'];
              const postTlStatuses = ['tl_approved', 'approved'];

              let canSeeImageAndPrompt = false;
              if (role === 'designer' || role === 'admin') {
                canSeeImageAndPrompt = true;
              } else if (role === 'team_lead') {
                // TL sees only after designer submits — permission doesn't override stage visibility
                canSeeImageAndPrompt = postSubmitStatuses.includes(creative.status);
              } else if (role === 'manager') {
                // Manager sees only after TL approves — image_preview perm can unlock earlier access
                canSeeImageAndPrompt = postTlStatuses.includes(creative.status) || hasImagePreviewPerm;
              } else {
                canSeeImageAndPrompt = hasImagePreviewPerm;
              }

              if (!canSeeImageAndPrompt) {
                // User can't see image/prompt — show only a status update message
                const statusMessages: Record<string, { text: string; color: string }> = {
                  generated: { text: 'Creative has been generated — pending designer review', color: 'bg-gray-50 border-gray-200 text-gray-700' },
                  designer_replaced: { text: 'Designer has uploaded a replacement — pending submission', color: 'bg-purple-50 border-purple-200 text-purple-700' },
                  submitted: { text: 'Creative submitted — awaiting Team Lead review', color: 'bg-blue-50 border-blue-200 text-blue-700' },
                  rejected: { text: 'Creative was rejected — sent back to designer for corrections', color: 'bg-red-50 border-red-200 text-red-700' },
                };
                const msg = statusMessages[creative.status];
                if (!msg) return null;
                return (
                  <div className="p-4">
                    <div className={`flex items-center gap-2 p-3 rounded-lg border ${msg.color}`}>
                      <Clock size={16} />
                      <span className="text-sm">{msg.text}</span>
                    </div>
                  </div>
                );
              }

              return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {/* Left: Actions above Image */}
              <div className="space-y-3">
                {/* Designer: Upload + Submit grouped */}
                {(role === 'designer' || role === 'admin') &&
                  ['generated', 'designer_review', 'designer_replaced'].includes(creative.status) && (
                  <div className="rounded-xl bg-gradient-to-b from-purple-50 to-indigo-50 border border-purple-200/60 p-3 space-y-3">
                    {/* Upload Replacement */}
                    <div>
                      <span className="text-xs font-medium text-purple-700 mb-2 block">Upload Replacement</span>
                      {uploadingId === creative.id && selectedFile && previewUrl ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200">
                            <img src={previewUrl} alt="Preview" className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                              <p className="text-xs text-gray-400">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                            </div>
                            <button
                              onClick={() => { setSelectedFile(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
                              className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50"
                            >
                              <XCircle size={16} />
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => uploadMutation.mutate({ id: creative.id, file: selectedFile })}
                              disabled={uploadMutation.isPending}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                            >
                              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={resetUpload}
                              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white rounded-lg hover:bg-gray-50 border border-gray-200"
                            >
                              Cancel
                            </motion.button>
                          </div>
                        </div>
                      ) : (
                        <label className="flex items-center gap-3 p-2.5 rounded-lg border border-dashed border-purple-300 bg-white hover:border-purple-400 hover:bg-purple-50/30 cursor-pointer transition-colors">
                          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Choose file</p>
                            <p className="text-[10px] text-gray-400">PNG, JPG, WebP, GIF up to 50MB</p>
                          </div>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            onChange={(e) => { setUploadingId(creative.id); handleFileSelect(e); }}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {/* Submit for Approval */}
                    {['generated', 'designer_replaced'].includes(creative.status) && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => statusMutation.mutate({ id: creative.id, status: 'submitted' })}
                        disabled={statusMutation.isPending}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:from-purple-700 hover:to-indigo-700 shadow-sm disabled:opacity-50"
                      >
                        <Send size={16} />
                        {statusMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
                      </motion.button>
                    )}
                  </div>
                )}

                {/* Designer: Regenerate AI image */}
                {(role === 'designer' || role === 'admin') &&
                  ['generated', 'designer_replaced'].includes(creative.status) && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => regenerateMutation.mutate(creative.id)}
                    disabled={regenerateMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 border border-purple-200 disabled:opacity-50"
                  >
                    <RotateCcw size={14} className={regenerateMutation.isPending ? 'animate-spin' : ''} />
                    {regenerateMutation.isPending ? 'Regenerating...' : 'Regenerate AI Image'}
                  </motion.button>
                )}

                {/* Designer: Rejected — regenerate, re-upload and resubmit */}
                {(role === 'designer' || role === 'admin') &&
                  creative.status === 'rejected' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <XCircle size={14} className="text-red-600" />
                      <span className="text-xs text-red-700">Creative rejected. Regenerate or upload a revised image and resubmit.</span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => regenerateMutation.mutate(creative.id)}
                      disabled={regenerateMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 border border-purple-200 disabled:opacity-50"
                    >
                      <RotateCcw size={14} className={regenerateMutation.isPending ? 'animate-spin' : ''} />
                      {regenerateMutation.isPending ? 'Regenerating...' : 'Regenerate AI Image'}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setUploadingId(creative.id)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 border border-purple-200"
                    >
                      Upload Revised Image
                    </motion.button>
                  </div>
                )}

                {/* Image */}
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {(creative.final_url || creative.designer_uploaded_url || creative.ai_generated_url) ? (
                    <img
                      src={creative.final_url || creative.designer_uploaded_url || creative.ai_generated_url || ''}
                      alt={`Creative ${creative.id}`}
                      className="w-full h-full object-cover"
                    />
                  ) : creative.status === 'generating' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-purple-400">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-2" />
                      <span className="text-sm">Generating...</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Palette size={40} className="text-gray-300" />
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium text-gray-500 uppercase text-center">
                  {creative.designer_uploaded_url ? 'Designer Upload' : 'AI Generated Image'}
                </p>
              </div>

              {/* Right: Status & Prompt */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <StatusBadge status={creative.status} />
                  <span className="text-xs text-gray-500 capitalize">{creative.creative_type}</span>
                </div>

                {creative.prompt && (
                  <div>
                    <span className="text-xs text-gray-500">Prompt:</span>
                    <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-line">{creative.prompt}</p>
                  </div>
                )}

                {/* Submitted: Waiting for TL */}
                {creative.status === 'submitted' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <Clock size={14} className="text-blue-600" />
                      <span className="text-xs text-blue-700">Submitted — awaiting Team Lead review</span>
                    </div>

                    {/* TL: Approve/Reject creative */}
                    {(role === 'team_lead' || role === 'admin') && (
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => statusMutation.mutate({ id: creative.id, status: 'tl_approved' })}
                          disabled={statusMutation.isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle size={14} /> Approve
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => statusMutation.mutate({ id: creative.id, status: 'rejected' })}
                          disabled={statusMutation.isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          <XCircle size={14} /> Reject
                        </motion.button>
                      </div>
                    )}
                  </div>
                )}

                {/* TL Approved: Waiting for Manager */}
                {creative.status === 'tl_approved' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <Clock size={14} className="text-indigo-600" />
                      <span className="text-xs text-indigo-700">Team Lead approved — awaiting Manager review</span>
                    </div>

                    {/* Manager: Approve/Reject creative */}
                    {(role === 'manager' || role === 'admin') && (
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => statusMutation.mutate({ id: creative.id, status: 'approved' })}
                          disabled={statusMutation.isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle size={14} /> Approve
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => statusMutation.mutate({ id: creative.id, status: 'rejected' })}
                          disabled={statusMutation.isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          <XCircle size={14} /> Reject
                        </motion.button>
                      </div>
                    )}
                  </div>
                )}

                {/* Fully approved */}
                {creative.status === 'approved' && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle size={14} className="text-green-600" />
                    <span className="text-xs text-green-700">Creative approved — ready for publishing</span>
                  </div>
                )}
              </div>
            </div>
              );
            })()}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

export function ContentRequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const contentId = Number(id);

  const { data: content, isLoading } = useContentRequest(contentId);
  const generateMutation = useGenerateContent();
  const statusMutation = useUpdateContentStatus();
  const deleteMutation = useDeleteContentRequest();
  const submitMutation = useSubmitForApproval();

  const [rejectComments, setRejectComments] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Fetch the pending approval for this content (used by TL/Manager/Designer to approve via approval service)
  const { data: pendingApproval } = useQuery({
    queryKey: ['pending-approval', contentId],
    queryFn: () =>
      approvalService.getPending('content_request', contentId).then((r) => r.data),
    enabled: !!contentId,
  });

  // Approve via approval service
  const approveMutation = useMutation({
    mutationFn: (approvalId: number) => approvalService.approve(approvalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-request', contentId] });
      qc.invalidateQueries({ queryKey: ['pending-approval', contentId] });
      qc.invalidateQueries({ queryKey: ['approvals'] });
    },
  });

  // Reject via approval service
  const rejectMutation = useMutation({
    mutationFn: ({ approvalId, comments }: { approvalId: number; comments: string }) =>
      approvalService.reject(approvalId, comments),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-request', contentId] });
      qc.invalidateQueries({ queryKey: ['pending-approval', contentId] });
      qc.invalidateQueries({ queryKey: ['approvals'] });
    },
  });

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        </div>
      </PageWrapper>
    );
  }

  if (!content) {
    return (
      <PageWrapper>
        <div className="text-center py-20 text-gray-500">Content request not found</div>
      </PageWrapper>
    );
  }

  const role = user?.role || 'creator';
  const isOwner = user?.id === content.created_by;
  const actions = canPerformAction(role, content.status, isOwner);
  const hasPendingApproval = pendingApproval && pendingApproval.id !== null;

  const handleGenerate = async () => {
    await generateMutation.mutateAsync(contentId);
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(contentId);
    navigate('/posters');
  };

  const handleSubmitForApproval = async () => {
    await submitMutation.mutateAsync({ entityType: 'content_request', entityId: contentId });
  };

  const handleApprove = async () => {
    if (!hasPendingApproval) return;
    await approveMutation.mutateAsync(pendingApproval.id as number);
  };

  const handleRejectWithComments = async () => {
    if (!rejectComments.trim() || !hasPendingApproval) return;
    await rejectMutation.mutateAsync({
      approvalId: pendingApproval.id as number,
      comments: rejectComments,
    });
    setShowRejectForm(false);
    setRejectComments('');
  };

  // Designer approve/reject is now handled in CreativesSection via creative status transitions

  const handlePublish = async () => {
    await statusMutation.mutateAsync({ id: contentId, status: 'published' });
  };

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/posters')}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{content.title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <StatusBadge status={content.status} />
              <span className="flex items-center gap-1.5 text-sm text-gray-500 capitalize">
                <PlatformIcon platform={content.platform} size={16} />
                {content.platform}
              </span>
              <span className="text-sm text-gray-500 capitalize">{content.tone}</span>
            </div>
          </div>
        </div>

        {/* Workflow Progress */}
        <WorkflowProgress status={content.status} />

        {/* Content Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RequestDetailsCard
            content={content}
            canEdit={isOwner && ['draft', 'revision_requested'].includes(content.status)}
            contentId={contentId}
          />
          <AIContentCard
            content={content}
            canEdit={isOwner && ['draft', 'revision_requested'].includes(content.status)}
            contentId={contentId}
          />
        </div>

        {/* Role-Based Actions */}
        {actions.length > 0 && (
          <GlassCard>
            <h3 className="font-semibold text-gray-900 mb-3">Actions</h3>

            {/* Status banners */}
            {content.status === 'revision_requested' && isOwner && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <RotateCcw size={16} className="text-amber-600" />
                <span className="text-sm text-amber-800">
                  Your content was sent back for revisions. Please make corrections and resubmit.
                </span>
              </div>
            )}

            {content.status === 'pending_review' && (role === 'team_lead' || role === 'admin') && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <ArrowUpCircle size={16} className="text-blue-600" />
                <span className="text-sm text-blue-800">
                  This content is awaiting your review as Team Lead.
                </span>
              </div>
            )}

            {content.status === 'reviewed' && (role === 'manager' || role === 'admin') && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <ArrowUpCircle size={16} className="text-blue-600" />
                <span className="text-sm text-blue-800">
                  Team Lead approved. Awaiting your final review as Manager.
                </span>
              </div>
            )}

            {content.status === 'designer_review' && (role === 'designer' || role === 'admin') && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <Palette size={16} className="text-orange-600" />
                <span className="text-sm text-orange-800">
                  Manager approved. Please review the creatives and approve for publishing.
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {/* Requester/TL: Generate / Regenerate */}
              {actions.includes('generate') && (
                <GradientButton onClick={handleGenerate} isLoading={generateMutation.isPending}>
                  <span className="flex items-center gap-2">
                    {content.generated_caption ? (
                      <><RotateCcw size={16} /> Regenerate AI Content</>
                    ) : (
                      <><Sparkles size={16} /> Generate with AI</>
                    )}
                  </span>
                </GradientButton>
              )}
              {actions.includes('submit') && content.generated_caption && (
                <GradientButton
                  onClick={handleSubmitForApproval}
                  isLoading={submitMutation.isPending}
                >
                  <span className="flex items-center gap-2">
                    <Send size={16} /> Submit for Approval
                  </span>
                </GradientButton>
              )}
              {actions.includes('delete') && (
                <GradientButton
                  variant="danger"
                  onClick={handleDelete}
                  isLoading={deleteMutation.isPending}
                >
                  <span className="flex items-center gap-2">
                    <Trash2 size={16} /> Delete
                  </span>
                </GradientButton>
              )}

              {/* Requester: Resubmit after revision */}
              {actions.includes('resubmit') && (
                <GradientButton
                  onClick={handleSubmitForApproval}
                  isLoading={submitMutation.isPending}
                >
                  <span className="flex items-center gap-2">
                    <ArrowUpCircle size={16} /> Resubmit for Approval
                  </span>
                </GradientButton>
              )}

              {/* Team Lead: Approve/Reject via approval service */}
              {actions.includes('tl_approve') && hasPendingApproval && (
                <>
                  <GradientButton
                    onClick={handleApprove}
                    isLoading={approveMutation.isPending}
                  >
                    <span className="flex items-center gap-2">
                      <CheckCircle size={16} /> Approve (Team Lead)
                    </span>
                  </GradientButton>
                  <GradientButton
                    variant="danger"
                    onClick={() => setShowRejectForm(true)}
                  >
                    <span className="flex items-center gap-2">
                      <XCircle size={16} /> Reject
                    </span>
                  </GradientButton>
                </>
              )}

              {/* Manager: Approve/Reject via approval service */}
              {actions.includes('mgr_approve') && hasPendingApproval && (
                <>
                  <GradientButton
                    onClick={handleApprove}
                    isLoading={approveMutation.isPending}
                  >
                    <span className="flex items-center gap-2">
                      <CheckCircle size={16} /> Approve (Manager)
                    </span>
                  </GradientButton>
                  <GradientButton
                    variant="danger"
                    onClick={() => setShowRejectForm(true)}
                  >
                    <span className="flex items-center gap-2">
                      <XCircle size={16} /> Reject
                    </span>
                  </GradientButton>
                </>
              )}

              {/* Publish approved content */}
              {actions.includes('publish') && (
                <GradientButton onClick={handlePublish} isLoading={statusMutation.isPending}>
                  <span className="flex items-center gap-2">
                    <Send size={16} /> Publish Now
                  </span>
                </GradientButton>
              )}
            </div>

            {/* Reject/Revision comment form */}
            {showRejectForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 space-y-3 border-t border-gray-100 pt-4"
              >
                <TextArea
                  value={rejectComments}
                  onChange={setRejectComments}
                  placeholder="Please provide reasons for rejection (required)..."
                  rows={3}
                  label="Rejection Comments"
                />
                <div className="flex gap-2">
                  <GradientButton
                    variant="danger"
                    size="sm"
                    onClick={handleRejectWithComments}
                    isLoading={rejectMutation.isPending}
                  >
                    <span className="flex items-center gap-1">
                      <XCircle size={14} /> Send Back for Revision
                    </span>
                  </GradientButton>
                  <GradientButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectComments('');
                    }}
                  >
                    Cancel
                  </GradientButton>
                </div>
              </motion.div>
            )}
          </GlassCard>
        )}

        {/* Creatives Section — shown for designer_review, approved, published */}
        {['designer_review', 'approved', 'published'].includes(content.status) && (
          <CreativesSection contentRequestId={contentId} role={role} />
        )}

        {/* Published success */}
        {content.status === 'published' && (
          <GlassCard>
            <div className="flex items-center gap-3 p-2">
              <CheckCircle size={24} className="text-green-500" />
              <div>
                <h3 className="font-semibold text-green-800">Published Successfully</h3>
                <p className="text-sm text-green-600">
                  This content has been published to <span className="inline-flex items-center gap-1 capitalize"><PlatformIcon platform={content.platform} size={14} /> {content.platform}</span>.
                </p>
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </PageWrapper>
  );
}
