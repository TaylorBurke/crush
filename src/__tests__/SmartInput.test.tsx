import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SmartInput } from '../../entrypoints/newtab/components/SmartInput';

describe('SmartInput', () => {
  it('renders the input field with placeholder', () => {
    render(<SmartInput onSubmit={() => {}} />);
    expect(screen.getByPlaceholderText(/what's next/i)).toBeInTheDocument();
  });

  it('calls onSubmit with text when Enter is pressed', async () => {
    const onSubmit = vi.fn();
    render(<SmartInput onSubmit={onSubmit} />);
    const input = screen.getByPlaceholderText(/what's next/i);
    await userEvent.type(input, 'finish API docs by friday{enter}');
    expect(onSubmit).toHaveBeenCalledWith('finish API docs by friday');
  });

  it('clears the input after submission', async () => {
    render(<SmartInput onSubmit={() => {}} />);
    const input = screen.getByPlaceholderText(/what's next/i) as HTMLInputElement;
    await userEvent.type(input, 'test task{enter}');
    expect(input.value).toBe('');
  });

  it('does not submit empty input', async () => {
    const onSubmit = vi.fn();
    render(<SmartInput onSubmit={onSubmit} />);
    const input = screen.getByPlaceholderText(/what's next/i);
    await userEvent.type(input, '{enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows loading state when isLoading is true', () => {
    render(<SmartInput onSubmit={() => {}} isLoading={true} />);
    expect(screen.getByPlaceholderText(/thinking/i)).toBeInTheDocument();
  });

  it('renders feedback message when feedback is provided', () => {
    render(<SmartInput onSubmit={() => {}} feedback={{ message: 'Task completed' }} />);
    expect(screen.getByText('Task completed')).toBeInTheDocument();
  });

  it('does not render feedback when feedback is null', () => {
    render(<SmartInput onSubmit={() => {}} feedback={null} />);
    expect(screen.queryByText('Task completed')).not.toBeInTheDocument();
  });

  it('calls onFeedbackDone after timeout', async () => {
    vi.useFakeTimers();
    const onFeedbackDone = vi.fn();
    render(<SmartInput onSubmit={() => {}} feedback={{ message: 'done' }} onFeedbackDone={onFeedbackDone} />);
    expect(onFeedbackDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(onFeedbackDone).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
