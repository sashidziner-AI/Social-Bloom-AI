import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GlassCard } from '../../components/ui/GlassCard';

describe('GlassCard', () => {
  it('renders children', () => {
    render(<GlassCard>Card content</GlassCard>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<GlassCard className="test-class">Content</GlassCard>);
    const card = container.querySelector('.test-class');
    expect(card).toBeInTheDocument();
  });
});
