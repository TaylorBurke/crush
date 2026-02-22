import { useState } from 'react';
import { useSettings } from '../../../src/hooks/useSettings';

export function SettingsPanel() {
  const { settings, updateSettings, hasApiKey } = useSettings();
  const [open, setOpen] = useState(false);
  const [keyInput, setKeyInput] = useState('');

  const handleSaveKey = () => {
    if (keyInput.trim()) {
      updateSettings({ openaiApiKey: keyInput.trim() });
      setKeyInput('');
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 rounded-full bg-surface-hover p-2.5 text-text-muted transition-colors hover:bg-surface hover:text-text-secondary"
        aria-label="settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-[var(--color-bg-gradient-from)] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-medium text-text-primary">settings</h2>
        <div className="mb-4">
          <label className="mb-1 block text-sm text-text-secondary">OpenAI API Key</label>
          {hasApiKey ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-success">key saved</span>
              <button onClick={() => updateSettings({ openaiApiKey: '' })} className="text-xs text-text-muted hover:text-text-secondary">remove</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="sk-..." className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-border-focus" />
              <button onClick={handleSaveKey} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">save</button>
            </div>
          )}
        </div>
        <div className="mb-6">
          <label className="mb-1 block text-sm text-text-secondary">Your Name</label>
          <input type="text" value={settings.userName} onChange={(e) => updateSettings({ userName: e.target.value })} placeholder="what should crush call you?" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-border-focus" />
        </div>
        <button onClick={() => setOpen(false)} className="w-full rounded-lg bg-surface-hover py-2 text-sm text-text-secondary hover:bg-surface">close</button>
      </div>
    </div>
  );
}
