import { useState, useCallback, useEffect, useRef } from 'react';

interface SmartInputProps {
  onSubmit: (text: string) => void;
  isLoading?: boolean;
  feedback?: { message: string } | null;
  onFeedbackDone?: () => void;
}

export function SmartInput({ onSubmit, isLoading = false, feedback = null, onFeedbackDone }: SmartInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && value.trim()) {
        onSubmit(value.trim());
        setValue('');
      }
    },
    [value, onSubmit],
  );

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => onFeedbackDone?.(), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback, onFeedbackDone]);

  return (
    <div className="relative mb-8">
      {feedback && (
        <div className="animate-feedback-fade text-sm text-text-secondary mb-1">
          {feedback.message}
        </div>
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isLoading ? 'thinking...' : "what's next?"}
        disabled={isLoading}
        className="w-full rounded-xl border border-border bg-input-bg px-5 py-3.5 text-text-primary placeholder-text-muted shadow-md outline-none transition-all focus:border-border-focus focus:ring-2 focus:ring-ring disabled:opacity-60"
        autoFocus
      />
    </div>
  );
}
