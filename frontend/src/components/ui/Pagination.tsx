import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={16} />
      </motion.button>

      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
        const start = Math.max(1, Math.min(page - 2, totalPages - 4));
        const pageNum = start + i;
        if (pageNum > totalPages) return null;
        return (
          <motion.button
            key={pageNum}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onPageChange(pageNum)}
            className={cn(
              'w-9 h-9 rounded-lg text-sm font-medium transition-colors',
              pageNum === page
                ? 'bg-purple-500 text-white'
                : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
            )}
          >
            {pageNum}
          </motion.button>
        );
      })}

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronRight size={16} />
      </motion.button>
    </div>
  );
}
