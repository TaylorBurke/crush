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
});
