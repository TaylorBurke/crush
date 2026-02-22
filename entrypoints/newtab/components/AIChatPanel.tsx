import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../../../src/types';

interface AIChatPanelProps {
  open: boolean;
  onClose: () => void;
  onSend: (message: string) => Promise<string>;
  messages: ChatMessage[];
  isLoading: boolean;
}

export function AIChatPanel({ open, onClose, onSend, messages, isLoading }: AIChatPanelProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!open) return null;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    await onSend(text);
  };

  return (
    <div className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-stone-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
        <h2 className="text-sm font-medium text-stone-700">ask crush</h2>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600">&times;</button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-sm text-stone-400 italic">ask me anything about your tasks. try &quot;what should i focus on?&quot; or &quot;break down [task]&quot;</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`text-sm ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block rounded-xl px-4 py-2.5 ${msg.role === 'user' ? 'bg-amber-100 text-stone-800' : 'bg-stone-100 text-stone-700'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && <div className="text-sm text-stone-400">thinking...</div>}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-stone-200 px-5 py-3">
        <div className="flex gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="ask anything..." className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-amber-300" disabled={isLoading} />
          <button onClick={handleSend} disabled={isLoading || !input.trim()} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-amber-500">send</button>
        </div>
      </div>
    </div>
  );
}
