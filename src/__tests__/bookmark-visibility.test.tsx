import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState, useCallback, useRef } from 'react';
import { BookmarkBar } from '../../entrypoints/newtab/components/BookmarkBar';
import type { Bookmark, Settings } from '../types';

const testBookmarks: Bookmark[] = [
  { id: 'bm-1', url: 'https://example.com', label: 'Example', icon: 'E' },
  { id: 'bm-2', url: 'https://test.com', label: 'Test', icon: 'T' },
];

/**
 * Minimal harness that replicates App.tsx's bookmark bar + chat rendering logic
 * without all the AI/task dependencies, so we can test the visibility behavior in isolation.
 */
function BookmarkHarness({ initialShowBookmarks = true, initialBookmarks = testBookmarks }: {
  initialShowBookmarks?: boolean;
  initialBookmarks?: Bookmark[];
}) {
  const settingsRef = useRef<Settings | null>(null);
  const [settings, setSettings] = useState<Settings>({
    provider: 'openai',
    apiKey: '',
    model: '',
    userName: '',
    showBookmarks: initialShowBookmarks,
    bookmarks: initialBookmarks,
    theme: 'gold',
  });
  const [chatOpen, setChatOpen] = useState(false);

  // Track all settings mutations for test assertions
  settingsRef.current = settings;

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  return (
    <div>
      {/* Mirrors App.tsx bookmark bar rendering */}
      {settings.showBookmarks && !chatOpen && settings.bookmarks.length > 0 && (
        <BookmarkBar bookmarks={settings.bookmarks} />
      )}

      {/* Mirrors App.tsx caret button */}
      {!chatOpen && settings.bookmarks.length > 0 && (
        <button
          data-testid="caret-button"
          onClick={() => updateSettings({ showBookmarks: !settings.showBookmarks })}
        >
          toggle bookmarks
        </button>
      )}

      {/* Chat toggle */}
      <button data-testid="open-chat" onClick={() => setChatOpen(true)}>open chat</button>
      <button data-testid="close-chat" onClick={() => setChatOpen(false)}>close chat</button>

      {/* Settings toggle */}
      <label>
        <input
          data-testid="show-bookmarks-checkbox"
          type="checkbox"
          checked={settings.showBookmarks}
          onChange={(e) => updateSettings({ showBookmarks: e.target.checked })}
        />
        show bar
      </label>

      {/* Debug outputs for test assertions */}
      <span data-testid="show-bookmarks-value">{String(settings.showBookmarks)}</span>
      <span data-testid="chat-open-value">{String(chatOpen)}</span>
    </div>
  );
}

describe('Bookmark bar visibility', () => {
  it('shows bookmark bar when showBookmarks is true and chat is closed', () => {
    render(<BookmarkHarness initialShowBookmarks={true} />);
    expect(screen.getByTitle('Example')).toBeInTheDocument();
    expect(screen.getByTitle('Test')).toBeInTheDocument();
  });

  it('hides bookmark bar when showBookmarks is false', () => {
    render(<BookmarkHarness initialShowBookmarks={false} />);
    expect(screen.queryByTitle('Example')).not.toBeInTheDocument();
  });

  it('hides bookmark bar when chat is open', () => {
    render(<BookmarkHarness initialShowBookmarks={true} />);
    expect(screen.getByTitle('Example')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('open-chat'));
    expect(screen.queryByTitle('Example')).not.toBeInTheDocument();
  });

  it('does NOT change showBookmarks setting when chat opens', () => {
    render(<BookmarkHarness initialShowBookmarks={true} />);
    expect(screen.getByTestId('show-bookmarks-value')).toHaveTextContent('true');

    fireEvent.click(screen.getByTestId('open-chat'));

    // Setting must remain true even though bar is hidden
    expect(screen.getByTestId('show-bookmarks-value')).toHaveTextContent('true');
  });

  it('does NOT change showBookmarks setting when chat closes', () => {
    render(<BookmarkHarness initialShowBookmarks={true} />);
    fireEvent.click(screen.getByTestId('open-chat'));
    fireEvent.click(screen.getByTestId('close-chat'));

    expect(screen.getByTestId('show-bookmarks-value')).toHaveTextContent('true');
  });

  it('restores bookmark bar when chat closes (setting was true)', () => {
    render(<BookmarkHarness initialShowBookmarks={true} />);

    fireEvent.click(screen.getByTestId('open-chat'));
    expect(screen.queryByTitle('Example')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('close-chat'));
    expect(screen.getByTitle('Example')).toBeInTheDocument();
  });

  it('does not show bookmark bar when chat closes if setting was false', () => {
    render(<BookmarkHarness initialShowBookmarks={false} />);

    fireEvent.click(screen.getByTestId('open-chat'));
    fireEvent.click(screen.getByTestId('close-chat'));

    expect(screen.queryByTitle('Example')).not.toBeInTheDocument();
    expect(screen.getByTestId('show-bookmarks-value')).toHaveTextContent('false');
  });

  it('checkbox reflects showBookmarks state correctly', () => {
    render(<BookmarkHarness initialShowBookmarks={true} />);
    const checkbox = screen.getByTestId('show-bookmarks-checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    // Open and close chat - checkbox should stay checked
    fireEvent.click(screen.getByTestId('open-chat'));
    expect(checkbox.checked).toBe(true);

    fireEvent.click(screen.getByTestId('close-chat'));
    expect(checkbox.checked).toBe(true);
  });

  it('toggling checkbox immediately shows/hides bookmark bar', () => {
    render(<BookmarkHarness initialShowBookmarks={false} />);
    expect(screen.queryByTitle('Example')).not.toBeInTheDocument();

    // Check the box - bar should appear immediately
    fireEvent.click(screen.getByTestId('show-bookmarks-checkbox'));
    expect(screen.getByTestId('show-bookmarks-value')).toHaveTextContent('true');
    expect(screen.getByTitle('Example')).toBeInTheDocument();

    // Uncheck - bar should disappear immediately
    fireEvent.click(screen.getByTestId('show-bookmarks-checkbox'));
    expect(screen.getByTestId('show-bookmarks-value')).toHaveTextContent('false');
    expect(screen.queryByTitle('Example')).not.toBeInTheDocument();
  });

  it('toggling checkbox works while chat is open (takes effect on chat close)', () => {
    render(<BookmarkHarness initialShowBookmarks={false} />);
    fireEvent.click(screen.getByTestId('open-chat'));

    // Toggle showBookmarks while chat is open
    fireEvent.click(screen.getByTestId('show-bookmarks-checkbox'));
    expect(screen.getByTestId('show-bookmarks-value')).toHaveTextContent('true');

    // Bar still hidden because chat is open
    expect(screen.queryByTitle('Example')).not.toBeInTheDocument();

    // Close chat - bar should now appear
    fireEvent.click(screen.getByTestId('close-chat'));
    expect(screen.getByTitle('Example')).toBeInTheDocument();
  });

  it('does not show bookmark bar when there are no bookmarks', () => {
    render(<BookmarkHarness initialShowBookmarks={true} initialBookmarks={[]} />);
    expect(screen.queryByTitle('Example')).not.toBeInTheDocument();
  });

  it('caret button only toggles setting, does not affect chat', () => {
    render(<BookmarkHarness initialShowBookmarks={true} />);
    expect(screen.getByTitle('Example')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('caret-button'));
    expect(screen.getByTestId('show-bookmarks-value')).toHaveTextContent('false');
    expect(screen.queryByTitle('Example')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('caret-button'));
    expect(screen.getByTestId('show-bookmarks-value')).toHaveTextContent('true');
    expect(screen.getByTitle('Example')).toBeInTheDocument();
  });

  it('rapid chat open/close cycles preserve showBookmarks setting', () => {
    render(<BookmarkHarness initialShowBookmarks={true} />);

    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByTestId('open-chat'));
      fireEvent.click(screen.getByTestId('close-chat'));
    }

    expect(screen.getByTestId('show-bookmarks-value')).toHaveTextContent('true');
    expect(screen.getByTitle('Example')).toBeInTheDocument();
  });
});
