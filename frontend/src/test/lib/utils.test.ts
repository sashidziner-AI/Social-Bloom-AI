import { describe, it, expect } from 'vitest';
import { cn } from '../../lib/utils';

describe('cn utility', () => {
  it('merges class names', () => {
    const result = cn('p-4', 'text-red-500');
    expect(result).toContain('p-4');
    expect(result).toContain('text-red-500');
  });

  it('handles conditional classes', () => {
    const result = cn('base', false && 'hidden', 'extra');
    expect(result).toContain('base');
    expect(result).toContain('extra');
    expect(result).not.toContain('hidden');
  });

  it('merges tailwind conflicting classes', () => {
    const result = cn('p-4', 'p-6');
    expect(result).toBe('p-6');
  });

  it('handles undefined and null', () => {
    const result = cn('base', undefined, null, 'end');
    expect(result).toContain('base');
    expect(result).toContain('end');
  });
});
