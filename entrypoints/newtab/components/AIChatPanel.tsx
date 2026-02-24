import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../../../src/types';

interface AIChatPanelProps {
  open: boolean;
  onClose: () => void;
  onSend: (message: string) => Promise<{ response: string; actionSummary: string | null }>;
  messages: ChatMessage[];
  isLoading: boolean;
}

export function AIChatPanel({ open, onClose, onSend, messages, isLoading }: AIChatPanelProps) {
  const [input, setInput] = useState('');
  const [actionSummaries, setActionSummaries] = useState<Record<number, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    const { actionSummary } = await onSend(text);
    if (actionSummary) {
      // Associate the summary with the assistant message that will be added
      // The assistant message will be at the current messages length + 1 (after user msg)
      setActionSummaries((prev) => ({ ...prev, [messages.length + 1]: actionSummary }));
    }
  };

  return (
    <div className={`flex-shrink-0 overflow-hidden border-border bg-[var(--color-bg-gradient-to)] transition-all duration-300 ease-in-out ${open ? 'w-[28rem] border-l' : 'w-0 border-l-0'}`}>
      <div className="flex h-full min-w-[28rem] flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-medium text-text-primary">ask crush</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <p className="text-sm text-text-muted italic">ask me anything about your tasks. try "what should i focus on?" or "add a task to buy groceries"</p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className="text-sm text-left">
              {msg.role === 'user' ? (
                <p className="text-text-muted">{msg.content}</p>
              ) : (
                <div>
                  <div className="rounded-xl bg-surface px-4 py-2.5 text-text-primary">
                    {msg.content}
                  </div>
                  {(msg.actionSummary || actionSummaries[i]) && (
                    <p className="mt-1 text-xs text-accent">{msg.actionSummary || actionSummaries[i]}</p>
                  )}
                </div>
              )}
            </div>
          ))}
          {isLoading && <div className="text-sm text-text-muted">thinking...</div>}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-border px-5 py-3">
          <div className="flex gap-2">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="ask anything..." className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-border-focus" disabled={isLoading} />
            <button onClick={handleSend} disabled={isLoading || !input.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-accent-hover">send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
