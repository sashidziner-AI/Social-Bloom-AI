import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from '../../components/ui/StatusBadge';

describe('StatusBadge', () => {
  it('renders status text with underscores replaced by spaces', () => {
    render(<StatusBadge status="pending_review" />);
    expect(screen.getByText('pending review')).toBeInTheDocument();
  });

  it('renders simple status text', () => {
    render(<StatusBadge status="draft" />);
    expect(screen.getByText('draft')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<StatusBadge status="approved" className="custom-class" />);
    const badge = screen.getByText('approved');
    expect(badge).toHaveClass('custom-class');
  });

  it('handles unknown status with default styling', () => {
    render(<StatusBadge status="unknown_status" />);
    expect(screen.getByText('unknown status')).toBeInTheDocument();
  });

  const statuses = [
    'draft', 'pending_review', 'reviewed', 'approved', 'rejected',
    'published', 'pending', 'generating', 'generated', 'designer_review',
    'revision_requested', 'confirmed', 'scheduled', 'failed', 'cancelled',
  ];

  statuses.forEach((status) => {
    it(`renders ${status} status`, () => {
      render(<StatusBadge status={status} />);
      expect(screen.getByText(status.replace(/_/g, ' '))).toBeInTheDocument();
    });
  });
});
