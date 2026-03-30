import { cn } from '../../lib/utils';

interface TextAreaProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  error?: string;
  className?: string;
  required?: boolean;
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  error,
  className,
  required,
}: TextAreaProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className={cn(
          'w-full px-4 py-3 rounded-xl border-2 transition-colors outline-none resize-none',
          error
            ? 'border-red-500 focus:border-red-500'
            : 'border-gray-200 focus:border-purple-500',
          className
        )}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
