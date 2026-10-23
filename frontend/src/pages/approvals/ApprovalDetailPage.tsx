import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, XCircle, RotateCcw, RefreshCw, Clock, Send } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useApproval, useApproveItem, useRejectItem, useRequestRevision } from '../../hooks/useApprovals';

export function ApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const approvalId = Number(id);
  const { data: approval, isLoading } = useApproval(approvalId);
  const approveMutation = useApproveItem();
  const rejectMutation = useRejectItem();
  const revisionMutation = useRequestRevision();
  const [comments, setComments] = useState('');
  const [activeAction, setActiveAction] = useState<'approve' | 'reject' | 'revision' | null>(null);

  if (isLoading || !approval) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </PageWrapper>
    );
  }

  const resetForm = () => {
    setActiveAction(null);
    setComments('');
  };

  const switchAction = (action: 'approve' | 'reject' | 'revision') => {
    if (activeAction === action) {
      resetForm();
    } else {
      setActiveAction(action);
      setComments('');
    }
  };

  const handleApprove = () => {
    if (!comments.trim()) return;
    approveMutation.mutate({ id: approvalId, comments }, {
      onSuccess: () => navigate('/approvals'),
    });
  };

  const handleReject = () => {
    if (!comments.trim()) return;
    rejectMutation.mutate({ id: approvalId, comments }, {
      onSuccess: () => navigate('/approvals'),
    });
  };

  const handleRevision = () => {
    if (!comments.trim()) return;
    revisionMutation.mutate({ id: approvalId, comments }, {
      onSuccess: () => navigate('/approvals'),
    });
  };

  const isPending = approval.status === 'pending';

  const actionConfig = {
    approve: { placeholder: 'Add feedback comment before approving (required)...', borderColor: 'focus:border-green-500' },
    reject: { placeholder: 'Rejection reason (required)...', borderColor: 'focus:border-red-500' },
    revision: { placeholder: 'Revision details (required)...', borderColor: 'focus:border-amber-500' },
  };

  const historyActionConfig: Record<string, {
    bg: string; text: string; icon: typeof CheckCircle; label: string;
  }> = {
    submitted: { bg: 'bg-blue-500', text: 'text-white', icon: Send, label: 'Submitted' },
    approved: { bg: 'bg-green-500', text: 'text-white', icon: CheckCircle, label: 'Approved' },
    rejected: { bg: 'bg-red-500', text: 'text-white', icon: XCircle, label: 'Rejected' },
    revision_requested: { bg: 'bg-amber-500', text: 'text-white', icon: RotateCcw, label: 'Revision Requested' },
  };

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/approvals')}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <h1 className="text-2xl font-bold">Approval #{approval.id}</h1>
          <StatusBadge status={approval.status} />
        </div>

        {/* Approval Info */}
        <GlassCard>
          <h2 className="text-lg font-semibold mb-4">Approval Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Entity Type</p>
              <p className="font-medium capitalize">{approval.entity_type.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Entity ID</p>
              <p className="font-medium">#{approval.entity_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Level</p>
              <p className="font-medium capitalize">{approval.approval_level.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="font-medium">{new Date(approval.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          {approval.comments && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Comments</p>
              <p className="mt-1">{approval.comments}</p>
            </div>
          )}
        </GlassCard>

        {/* History Timeline */}
        {'history' in approval && Array.isArray((approval as Record<string, unknown>).history) && (
          <GlassCard>
            <h2 className="text-lg font-semibold mb-4">Approval History</h2>
            <div className="space-y-4">
              {((approval as Record<string, unknown>).history as Array<{
                id: number;
                action: string;
                actor_id: number;
                actor_name: string | null;
                actor_role: string | null;
                comments: string | null;
                created_at: string;
              }>).map((entry) => {
                const config = historyActionConfig[entry.action] || historyActionConfig.submitted;
                const Icon = config.icon;
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-3 pl-4 border-l-2 border-purple-200"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${config.bg} ${config.text} flex-shrink-0 mt-0.5`}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <div>
                      <p className="font-medium">{config.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {entry.actor_name || `User #${entry.actor_id}`}
                        {entry.actor_role && <span className="ml-1 text-gray-500">({entry.actor_role})</span>}
                        {' — '}
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                      {entry.comments && (
                        <div className="mt-1.5 text-sm text-gray-600 bg-gray-50 rounded-lg p-2 border border-gray-100 italic">
                          &ldquo;{entry.comments}&rdquo;
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        )}

        {/* Actions */}
        {isPending && (
          <GlassCard>
            <h2 className="text-lg font-semibold mb-4">Actions</h2>

            {!activeAction && (
              <div className="flex gap-3 flex-wrap">
                <GradientButton onClick={() => switchAction('approve')}>
                  <CheckCircle className="w-4 h-4 mr-2" /> Approve
                </GradientButton>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => switchAction('reject')}
                  className="px-6 py-3 rounded-full font-semibold text-red-600 border-2 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2 inline" /> Reject
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => switchAction('revision')}
                  className="px-6 py-3 rounded-full font-semibold text-amber-600 border-2 border-amber-200 hover:bg-amber-50"
                >
                  <RotateCcw className="w-4 h-4 mr-2 inline" /> Request Revision
                </motion.button>
              </div>
            )}

            {activeAction && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  {activeAction === 'approve' && <CheckCircle className="w-5 h-5 text-green-600" />}
                  {activeAction === 'reject' && <XCircle className="w-5 h-5 text-red-600" />}
                  {activeAction === 'revision' && <RotateCcw className="w-5 h-5 text-amber-600" />}
                  <span className="font-medium text-gray-900 capitalize">
                    {activeAction === 'revision' ? 'Request Revision' : activeAction}
                  </span>
                </div>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={actionConfig[activeAction].placeholder}
                  className={`w-full px-4 py-3 rounded-xl border-2 border-gray-200 ${actionConfig[activeAction].borderColor} outline-none min-h-[100px]`}
                />
                <div className="flex gap-3">
                  {activeAction === 'approve' && (
                    <GradientButton
                      onClick={handleApprove}
                      disabled={!comments.trim()}
                      isLoading={approveMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> Submit Approval
                    </GradientButton>
                  )}
                  {activeAction === 'reject' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleReject}
                      disabled={!comments.trim() || rejectMutation.isPending}
                      className="px-6 py-3 rounded-full font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4 mr-2 inline" /> Submit Rejection
                    </motion.button>
                  )}
                  {activeAction === 'revision' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleRevision}
                      disabled={!comments.trim() || revisionMutation.isPending}
                      className="px-6 py-3 rounded-full font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                    >
                      <RotateCcw className="w-4 h-4 mr-2 inline" /> Submit Revision Request
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={resetForm}
                    className="px-6 py-3 rounded-full font-semibold text-gray-600 border-2 border-gray-200 hover:bg-gray-50"
                  >
                    Cancel
                  </motion.button>
                </div>
              </motion.div>
            )}
          </GlassCard>
        )}
      </div>
    </PageWrapper>
  );
}
