import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  MessageSquare,
  Eye,
  ArrowUpCircle,
  Shield,
} from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Select } from '../../components/ui/Select';
import { TextArea } from '../../components/ui/TextArea';
import { Pagination } from '../../components/ui/Pagination';
import {
  useApprovals,
  useApproveItem,
  useRejectItem,
  useRequestRevision,
} from '../../hooks/useApprovals';
import { useAuth } from '../../context/AuthContext';
import type { Approval } from '../../services/approvalService';

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'revision_requested', label: 'Revision Requested' },
];

const levelOptions = [
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'manager', label: 'Manager' },
];

function getWorkflowLabel(level: string, status: string): string {
  if (status === 'pending') {
    return level === 'team_lead'
      ? 'Awaiting Team Lead Approval'
      : 'Awaiting Manager Approval';
  }
  if (status === 'approved') {
    return level === 'team_lead'
      ? 'Team Lead Approved — Escalated to Manager'
      : 'Manager Approved — Awaiting Requester Confirmation';
  }
  if (status === 'rejected') {
    return level === 'team_lead'
      ? 'Rejected by Team Lead — Sent back to Requester'
      : 'Rejected by Manager — Sent back to Requester';
  }
  if (status === 'revision_requested') {
    return 'Revision Requested — Sent back to Requester';
  }
  return status;
}

function ApprovalCard({ approval }: { approval: Approval }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const approveMutation = useApproveItem();
  const rejectMutation = useRejectItem();
  const revisionMutation = useRequestRevision();
  const [comments, setComments] = useState('');
  const [activeForm, setActiveForm] = useState<'approve' | 'reject' | null>(null);

  const isPending = approval.status === 'pending';
  const role = user?.role;

  const canAct =
    isPending &&
    ((approval.approval_level === 'team_lead' &&
      (role === 'team_lead' || role === 'admin')) ||
      (approval.approval_level === 'manager' &&
        (role === 'manager' || role === 'admin')));

  const levelIcon =
    approval.approval_level === 'team_lead' ? (
      <ArrowUpCircle size={14} />
    ) : (
      <Shield size={14} />
    );

  const resetForm = () => {
    setActiveForm(null);
    setComments('');
  };

  const handleApprove = () => {
    if (!comments.trim()) return;
    approveMutation.mutate(
      { id: approval.id, comments },
      { onSuccess: resetForm }
    );
  };

  const handleReject = () => {
    if (!comments.trim()) return;
    rejectMutation.mutate(
      { id: approval.id, comments },
      { onSuccess: resetForm }
    );
  };

  const handleRevision = () => {
    if (!comments.trim()) return;
    revisionMutation.mutate(
      { id: approval.id, comments },
      { onSuccess: resetForm }
    );
  };

  const toggleForm = (form: 'approve' | 'reject') => {
    if (activeForm === form) {
      resetForm();
    } else {
      setActiveForm(form);
      setComments('');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <GlassCard>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-gray-900 capitalize">
                {approval.entity_type.replace('_', ' ')} #{approval.entity_id}
              </span>
              <StatusBadge status={approval.status} />
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded-full capitalize">
                {levelIcon}
                {approval.approval_level.replace('_', ' ')} level
              </span>
            </div>

            <p className="text-xs text-purple-600 font-medium mt-2">
              {getWorkflowLabel(approval.approval_level, approval.status)}
            </p>

            {approval.comments && (
              <div className="mt-2 p-2.5 bg-gray-50 border border-gray-100 rounded-lg">
                <p className="text-xs text-gray-500 mb-0.5">Reviewer Comments:</p>
                <p className="text-sm text-gray-700">{approval.comments}</p>
              </div>
            )}

            {approval.history && approval.history.length > 0 && (
              <div className="mt-3 space-y-1">
                {approval.history.map((h) => (
                  <div key={h.id} className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="capitalize">{h.action.replace('_', ' ')}</span>
                    <span>by {h.actor_name || `User #${h.actor_id}`}</span>
                    {h.comments && (
                      <span className="text-gray-500 italic">&mdash; &ldquo;{h.comments}&rdquo;</span>
                    )}
                    <span>{new Date(h.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-2">
              Created: {new Date(approval.created_at).toLocaleString()}
            </p>
          </div>

          <div className="flex gap-2 ml-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() =>
                navigate(`/posters/${approval.entity_id}`)
              }
              className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
              title="View Content"
            >
              <Eye size={18} />
            </motion.button>

            {canAct && (
              <>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleForm('approve')}
                  className={`p-2 rounded-lg ${activeForm === 'approve' ? 'bg-green-200 text-green-700' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                  title="Approve"
                >
                  <CheckCircle size={18} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleForm('reject')}
                  className={`p-2 rounded-lg ${activeForm === 'reject' ? 'bg-gray-200 text-gray-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                  title="Reject / Request Revision"
                >
                  <MessageSquare size={18} />
                </motion.button>
              </>
            )}
          </div>
        </div>

        {activeForm === 'approve' && canAct && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 space-y-3 border-t border-gray-100 pt-4"
          >
            <TextArea
              value={comments}
              onChange={setComments}
              placeholder="Add feedback comment before approving (required)..."
              rows={2}
            />
            <div className="flex gap-2">
              <GradientButton
                size="sm"
                onClick={handleApprove}
                isLoading={approveMutation.isPending}
                disabled={!comments.trim()}
              >
                <span className="flex items-center gap-1">
                  <CheckCircle size={14} /> Submit Approval
                </span>
              </GradientButton>
              <GradientButton
                size="sm"
                variant="secondary"
                onClick={resetForm}
              >
                Cancel
              </GradientButton>
            </div>
          </motion.div>
        )}

        {activeForm === 'reject' && canAct && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 space-y-3 border-t border-gray-100 pt-4"
          >
            <TextArea
              value={comments}
              onChange={setComments}
              placeholder="Add comments (required for rejection / revision)..."
              rows={2}
            />
            <div className="flex gap-2">
              <GradientButton
                size="sm"
                variant="danger"
                onClick={handleReject}
                isLoading={rejectMutation.isPending}
                disabled={!comments.trim()}
              >
                <span className="flex items-center gap-1">
                  <XCircle size={14} /> Reject
                </span>
              </GradientButton>
              <GradientButton
                size="sm"
                variant="secondary"
                onClick={handleRevision}
                isLoading={revisionMutation.isPending}
                disabled={!comments.trim()}
              >
                <span className="flex items-center gap-1">
                  <RotateCcw size={14} /> Request Revision
                </span>
              </GradientButton>
            </div>
          </motion.div>
        )}
      </GlassCard>
    </motion.div>
  );
}

export function ApprovalListPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');

  const { data, isLoading } = useApprovals({
    status: statusFilter || undefined,
    level: levelFilter || undefined,
    page,
  });

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">Approvals</h1>
          <p className="text-gray-500 mt-1">
            {user?.role === 'team_lead'
              ? 'Review content submitted by requesters for first-level approval'
              : user?.role === 'manager'
                ? 'Final approval for content that passed team lead review'
                : 'Review and approve content and creatives'}
          </p>
        </div>

        <div className="flex gap-3">
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            placeholder="All Statuses"
            className="w-52"
          />
          <Select
            value={levelFilter}
            onChange={setLevelFilter}
            options={levelOptions}
            placeholder="All Levels"
            className="w-44"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {data?.items.length === 0 ? (
              <GlassCard className="text-center py-12">
                <CheckCircle size={40} className="mx-auto text-green-300 mb-3" />
                <p className="text-gray-500">No pending approvals. All caught up!</p>
              </GlassCard>
            ) : (
              data?.items.map((approval) => (
                <ApprovalCard key={approval.id} approval={approval} />
              ))
            )}
          </div>
        )}
        {data && (
          <Pagination
            page={page}
            totalPages={Math.ceil(data.total / data.per_page)}
            onPageChange={setPage}
          />
        )}
      </div>
    </PageWrapper>
  );
}
