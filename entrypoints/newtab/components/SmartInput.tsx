import { useState, useCallback, useEffect, useRef } from 'react';

interface SmartInputProps {
  onSubmit: (text: string) => void;
  isLoading?: boolean;
}

export function SmartInput({ onSubmit, isLoading = false }: SmartInputProps) {
  const [value, setValue] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [checkLeft, setCheckLeft] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && value.trim()) {
        if (measureRef.current) {
          measureRef.current.textContent = value;
          // 20px input padding (px-5) + measured text width + 6px gap
          setCheckLeft(20 + measureRef.current.offsetWidth + 6);
        }
        onSubmit(value.trim());
        setValue('');
        setConfirmed(true);
      }
    },
    [value, onSubmit],
  );

  useEffect(() => {
    if (confirmed) {
      const timer = setTimeout(() => setConfirmed(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [confirmed]);

  return (
    <div className="relative mb-8">
      <span
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute left-0 top-0 whitespace-pre px-0 py-3.5 text-text-primary"
        style={{ font: 'inherit' }}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isLoading ? 'thinking...' : "what's next?"}
        disabled={isLoading}
        className="w-full rounded-xl border border-border bg-surface px-5 py-3.5 text-text-primary placeholder-text-muted shadow-sm outline-none transition-all focus:border-border-focus focus:ring-2 focus:ring-ring disabled:opacity-60"
        autoFocus
      />
      {confirmed && (
        <span
          className="pointer-events-none absolute top-1/2 animate-confirm-check text-lg text-success"
          style={{ left: `${checkLeft}px` }}
        >
          ✓
        </span>
      )}
    </div>
  );
}
