import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Greeting } from '../../entrypoints/newtab/components/Greeting';

describe('Greeting', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows morning greeting in the morning', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-21T09:00:00'));
    render(<Greeting />);
    expect(screen.getByText(/morning/i)).toBeInTheDocument();
  });

  it('shows the day of the week', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-21T09:00:00')); // Saturday
    render(<Greeting />);
    expect(screen.getByText(/saturday/i)).toBeInTheDocument();
  });
});
