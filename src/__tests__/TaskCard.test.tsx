import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskCard } from '../../entrypoints/newtab/components/TaskCard';
import type { Task } from '../../src/types';

const mockTask: Task = {
  id: 'test-1',
  text: 'finish API docs by friday',
  parsed: { title: 'Finish API docs', deadline: '2026-02-27', tags: ['work'] },
  importance: 'high',
  relationships: { blocks: ['task-2', 'task-3'], blockedBy: [], cluster: null },
  status: 'active',
  deferrals: 0,
  createdAt: '2026-02-21T10:00:00Z',
  completedAt: null,
  lastSurfacedAt: null,
};

describe('TaskCard', () => {
  it('renders the task title', () => {
    render(<TaskCard task={mockTask} onComplete={() => {}} onDefer={() => {}} />);
    expect(screen.getByText('Finish API docs')).toBeInTheDocument();
  });

  it('shows deadline when present', () => {
    render(<TaskCard task={mockTask} onComplete={() => {}} onDefer={() => {}} />);
    expect(screen.getByText(/feb 27/i)).toBeInTheDocument();
  });

  it('shows blocking count', () => {
    render(<TaskCard task={mockTask} onComplete={() => {}} onDefer={() => {}} />);
    expect(screen.getByText(/blocks: 2/i)).toBeInTheDocument();
  });

  it('shows importance indicator for high importance', () => {
    render(<TaskCard task={mockTask} onComplete={() => {}} onDefer={() => {}} />);
    expect(screen.getByText('!')).toBeInTheDocument();
  });

  it('calls onComplete when complete button is clicked', async () => {
    const onComplete = vi.fn();
    render(<TaskCard task={mockTask} onComplete={onComplete} onDefer={() => {}} />);
    await userEvent.click(screen.getByLabelText(/complete/i));
    expect(onComplete).toHaveBeenCalledWith('test-1');
  });

  it('calls onDefer when defer button is clicked', async () => {
    const onDefer = vi.fn();
    render(<TaskCard task={mockTask} onComplete={() => {}} onDefer={onDefer} />);
    await userEvent.click(screen.getByLabelText(/defer/i));
    expect(onDefer).toHaveBeenCalledWith('test-1');
  });
});
