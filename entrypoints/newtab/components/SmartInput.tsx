import { useState, useCallback } from 'react';

interface SmartInputProps {
  onSubmit: (text: string) => void;
  isLoading?: boolean;
}

export function SmartInput({ onSubmit, isLoading = false }: SmartInputProps) {
  const [value, setValue] = useState('');

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && value.trim()) {
        onSubmit(value.trim());
        setValue('');
      }
    },
    [value, onSubmit],
  );

  return (
    <div className="mb-8">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isLoading ? 'thinking...' : "what's next?"}
        disabled={isLoading}
        className="w-full rounded-xl border border-border bg-surface px-5 py-3.5 text-text-primary placeholder-text-muted shadow-sm outline-none transition-all focus:border-border-focus focus:ring-2 focus:ring-ring disabled:opacity-60"
        autoFocus
      />
    </div>
  );
}
