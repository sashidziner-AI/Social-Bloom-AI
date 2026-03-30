import { cn } from '../../lib/utils';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_review: 'bg-yellow-100 text-yellow-800',
  reviewed: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  published: 'bg-purple-100 text-purple-800',
  pending: 'bg-yellow-100 text-yellow-800',
  generating: 'bg-cyan-100 text-cyan-800',
  generated: 'bg-blue-100 text-blue-800',
  designer_review: 'bg-orange-100 text-orange-800',
  designer_replaced: 'bg-indigo-100 text-indigo-800',
  revision_requested: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  scheduled: 'bg-blue-100 text-blue-800',
  publishing: 'bg-cyan-100 text-cyan-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-700',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const color = statusColors[status] || 'bg-gray-100 text-gray-700';
  const label = status.replace(/_/g, ' ');
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
        color,
        className
      )}
    >
      {label}
    </span>
  );
}
