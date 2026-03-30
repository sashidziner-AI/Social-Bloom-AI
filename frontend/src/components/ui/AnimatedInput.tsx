import { motion } from 'framer-motion';
import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface AnimatedInputProps {
  label?: string;
  error?: string;
  className?: string;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  name?: string;
  id?: string;
  disabled?: boolean;
}

export const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}
      <motion.input
        ref={ref}
        whileFocus={{ scale: 1.01 }}
        className={cn(
          'w-full px-4 py-3 rounded-xl border-2 transition-colors outline-none',
          error
            ? 'border-red-500 focus:border-red-500'
            : 'border-gray-200 focus:border-purple-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  )
);

AnimatedInput.displayName = 'AnimatedInput';
