import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { DataTable } from '../../components/ui/DataTable';
import { PlatformIcon } from '../../components/ui/PlatformIcons';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Pagination } from '../../components/ui/Pagination';
import { Select } from '../../components/ui/Select';
import { useContentRequests } from '../../hooks/useContentRequests';
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

export function ContentRequestListPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');

  const { data, isLoading } = useContentRequests({
    status: statusFilter || undefined,
    platform: platformFilter || undefined,
    page,
    per_page: 20,
  });

  const columns = [
    {
      key: 'title',
      header: 'Title',
      render: (item: ContentRequest) => (
        <Link
          to={`/posters/${item.id}`}
          className="text-purple-600 hover:underline font-medium"
        >
          {item.title}
        </Link>
      ),
    },
    {
      key: 'platform',
      header: 'Platform',
      render: (item: ContentRequest) => (
        <span className="flex items-center gap-1.5 capitalize">
          <PlatformIcon platform={item.platform} size={16} />
          {item.platform}
        </span>
      ),
    },
    {
      key: 'tone',
      header: 'Tone',
      render: (item: ContentRequest) => (
        <span className="capitalize">{item.tone}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: ContentRequest) => <StatusBadge status={item.status} />,
    },
    {
      key: 'ai',
      header: 'AI Generated',
      render: (item: ContentRequest) =>
        item.generated_caption ? (
          <Sparkles size={16} className="text-purple-500" />
        ) : (
          <span className="text-gray-300">-</span>
        ),
    },
    {
      key: 'date',
      header: 'Created',
      render: (item: ContentRequest) =>
        new Date(item.created_at).toLocaleDateString(),
    },
  ];

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Posters</h1>
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
              data={data?.items || []}
              keyExtractor={(item) => item.id}
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
    </PageWrapper>
  );
}
