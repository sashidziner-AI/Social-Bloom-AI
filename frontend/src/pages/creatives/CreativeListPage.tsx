import { useState } from 'react';
import { motion } from 'framer-motion';
import { Image, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Select } from '../../components/ui/Select';
import { Pagination } from '../../components/ui/Pagination';
import { useCreatives } from '../../hooks/useCreatives';
import type { Creative } from '../../types';

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'generating', label: 'Generating' },
  { value: 'generated', label: 'Generated' },
  { value: 'designer_review', label: 'Designer Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const typeOptions = [
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'carousel', label: 'Carousel' },
];

function CreativeCard({ creative }: { creative: Creative }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <Link to={`/creatives/${creative.id}`}>
        <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-shadow">
          <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
            {creative.final_url || creative.ai_generated_url ? (
              <img
                src={creative.final_url || creative.ai_generated_url || ''}
                alt={`Creative ${creative.id}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <Image size={40} className="text-gray-300" />
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <Eye
                size={24}
                className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 capitalize">
                {creative.creative_type}
              </span>
              <StatusBadge status={creative.status} />
            </div>
            {creative.prompt && (
              <p className="text-xs text-gray-600 line-clamp-2">{creative.prompt}</p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function CreativeListPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data, isLoading } = useCreatives({
    status: statusFilter || undefined,
    creative_type: typeFilter || undefined,
    page,
  });

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Creatives</h1>
          <p className="text-gray-500 mt-1">AI-generated and designer visuals</p>
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
            value={typeFilter}
            onChange={setTypeFilter}
            options={typeOptions}
            placeholder="All Types"
            className="w-40"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          </div>
        ) : data?.items.length === 0 ? (
          <GlassCard className="text-center py-12">
            <Image size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No creatives yet.</p>
          </GlassCard>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {data?.items.map((creative) => (
                <CreativeCard key={creative.id} creative={creative} />
              ))}
            </div>
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
