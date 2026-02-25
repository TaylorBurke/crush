import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatActionCards } from '../../entrypoints/newtab/components/ChatActionCards';

describe('ChatActionCards', () => {
  it('renders nothing when tasks array is empty', () => {
    const { container } = render(<ChatActionCards tasks={[]} />);
    expect(container.firstElementChild).toBeNull();
  });

  it('renders task titles', () => {
    const tasks = [
      { title: 'Buy groceries', deadline: null, effort: null },
      { title: 'Call dentist', deadline: '2026-03-01', effort: null },
    ];
    render(<ChatActionCards tasks={tasks} />);
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('Call dentist')).toBeInTheDocument();
  });

  it('shows formatted deadline when present', () => {
    const tasks = [{ title: 'Submit report', deadline: '2026-03-05', effort: null }];
    render(<ChatActionCards tasks={tasks} />);
    expect(screen.getByText(/mar 5/i)).toBeInTheDocument();
  });

  it('shows effort icon when present', () => {
    const tasks = [{ title: 'Quick fix', deadline: null, effort: 'quick' as const }];
    render(<ChatActionCards tasks={tasks} />);
    expect(screen.getByText('\u26A1')).toBeInTheDocument();
  });
});
