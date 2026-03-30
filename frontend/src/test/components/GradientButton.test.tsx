import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GradientButton } from '../../components/ui/GradientButton';

describe('GradientButton', () => {
  it('renders children text', () => {
    render(<GradientButton>Click me</GradientButton>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('shows loading text when isLoading', () => {
    render(<GradientButton isLoading>Submit</GradientButton>);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Submit')).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<GradientButton onClick={handleClick}>Click</GradientButton>);
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<GradientButton disabled>Disabled</GradientButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when isLoading', () => {
    render(<GradientButton isLoading>Loading</GradientButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders with correct type', () => {
    render(<GradientButton type="submit">Submit</GradientButton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('defaults to button type', () => {
    render(<GradientButton>Default</GradientButton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });
});
