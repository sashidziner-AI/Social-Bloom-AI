import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Sparkles, Trash2, X } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { DataTable } from '../../components/ui/DataTable';
import { PlatformIcon } from '../../components/ui/PlatformIcons';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Pagination } from '../../components/ui/Pagination';
import { Select } from '../../components/ui/Select';
import { useContentRequests, useDeleteContentRequest } from '../../hooks/useContentRequests';
import { useAuth } from '../../context/AuthContext';
import type { ContentRequest } from '../../types';

const platformOptions = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter/X' },
];

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'designer_review', label: 'Designer Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'revision_requested', label: 'Revision Requested' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'published', label: 'Published' },
];

interface GroupedRequest {
  baseTitle: string;
  items: ContentRequest[];
  tone: string;
  created_at: string;
}

function getBaseTitle(title: string): string {
  return title.replace(/\s*\((Facebook|LinkedIn|Instagram|Twitter\/X|Twitter)\)\s*$/i, '');
}

/** Return unified status: the "least advanced" status across all siblings */
const STATUS_ORDER = [
  'draft',
  'revision_requested',
  'pending_review',
  'reviewed',
  'designer_review',
  'approved',
  'published',
];

function getUnifiedStatus(items: ContentRequest[]): string {
  let minIndex = STATUS_ORDER.length;
  for (const item of items) {
    const idx = STATUS_ORDER.indexOf(item.status);
    if (idx !== -1 && idx < minIndex) minIndex = idx;
  }
  return minIndex < STATUS_ORDER.length ? STATUS_ORDER[minIndex] : items[0].status;
}

function groupContentRequests(items: ContentRequest[]): GroupedRequest[] {
  const groups = new Map<string, GroupedRequest>();

  for (const item of items) {
    const baseTitle = getBaseTitle(item.title);
    const groupKey = `${baseTitle}|||${item.topic}|||${item.tone}|||${item.created_by}`;

    if (groups.has(groupKey)) {
      groups.get(groupKey)!.items.push(item);
    } else {
      groups.set(groupKey, {
        baseTitle,
        items: [item],
        tone: item.tone,
        created_at: item.created_at,
      });
    }
  }

  return Array.from(groups.values());
}

export function ContentRequestListPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const deleteMutation = useDeleteContentRequest();
  const [confirmTarget, setConfirmTarget] = useState<GroupedRequest | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data, isLoading } = useContentRequests({
    status: statusFilter || undefined,
    platform: platformFilter || undefined,
    page,
    per_page: 20,
  });

  const filteredItems = (data?.items || []).filter((item) => item.platform !== 'twitter');
  const groupedItems = groupContentRequests(filteredItems);

  const closeConfirm = () => {
    if (deleteMutation.isPending) return;
    setConfirmTarget(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleteError(null);
    try {
      await Promise.all(
        confirmTarget.items.map((item) => deleteMutation.mutateAsync(item.id))
      );
      setConfirmTarget(null);
    } catch (err) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to delete poster';
      setDeleteError(message);
    }
  };

  const columns = [
    {
      key: 'title',
      header: 'Title',
      render: (group: GroupedRequest) => (
        <Link
          to={`/posters/${group.items[0].id}`}
          className="text-purple-600 hover:underline font-medium"
        >
          {group.baseTitle}
        </Link>
      ),
    },
    {
      key: 'platform',
      header: 'Platform',
      render: (group: GroupedRequest) => (
        <div className="flex items-center gap-1.5">
          {group.items.map((item) => (
            <span
              key={item.id}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200"
              title={item.platform}
            >
              <PlatformIcon platform={item.platform} size={14} />
              <span className="text-xs capitalize text-gray-600">{item.platform}</span>
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'tone',
      header: 'Tone',
      render: (group: GroupedRequest) => (
        <span className="capitalize">{group.tone}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (group: GroupedRequest) => (
        <StatusBadge status={getUnifiedStatus(group.items)} />
      ),
    },
    {
      key: 'ai',
      header: 'AI Generated',
      render: (group: GroupedRequest) =>
        group.items.some((item) => item.generated_caption) ? (
          <Sparkles size={16} className="text-purple-500" />
        ) : (
          <span className="text-gray-300">-</span>
        ),
    },
    {
      key: 'date',
      header: 'Created',
      render: (group: GroupedRequest) =>
        new Date(group.created_at).toLocaleDateString(),
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: 'Actions',
            render: (group: GroupedRequest) => (
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setConfirmTarget(group);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded transition"
                title="Delete poster (admin)"
                aria-label="Delete poster"
              >
                <Trash2 size={16} />
              </button>
            ),
          },
        ]
      : []),
  ];

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">Posters</h1>
          <p className="text-gray-500 mt-1">
            Track and manage all content requests across the pipeline
          </p>
        </div>

        <div className="flex gap-3">
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            placeholder="All Statuses"
            className="w-48"
          />
          <Select
            value={platformFilter}
            onChange={setPlatformFilter}
            options={platformOptions}
            placeholder="All Platforms"
            className="w-48"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={groupedItems}
              keyExtractor={(group) => group.items.map((i) => i.id).join('-')}
              emptyMessage="No content requests yet. Create your first one!"
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

      {confirmTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-poster-title"
          onClick={closeConfirm}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600">
                  <AlertTriangle size={20} />
                </div>
                <h2 id="delete-poster-title" className="text-lg font-semibold text-gray-900">
                  Delete poster?
                </h2>
              </div>
              <button
                type="button"
                onClick={closeConfirm}
                disabled={deleteMutation.isPending}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-3">
              <p className="text-sm text-gray-600">
                This will permanently delete{' '}
                <span className="font-medium text-gray-900">
                  "{confirmTarget.baseTitle}"
                </span>{' '}
                and all{' '}
                <span className="font-medium text-gray-900">
                  {confirmTarget.items.length}
                </span>{' '}
                platform variant{confirmTarget.items.length === 1 ? '' : 's'}, along with
                their creatives and publish jobs. This cannot be undone.
              </p>
              {deleteError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {deleteError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                type="button"
                onClick={closeConfirm}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {deleteMutation.isPending && (
                  <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                )}
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
