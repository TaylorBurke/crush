import type { Task, EffortLevel, EmotionalContext } from '../../../src/types';

interface TaskCardProps {
  task: Task;
  nudge?: string;
  onComplete: (id: string) => void;
  onDefer: (id: string) => void;
  variant?: 'card' | 'row';
  highlighted?: boolean;
  dismissing?: boolean;
  deferring?: boolean;
  onHighlightComplete?: (id: string) => void;
}

function formatDeadline(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isPastDue(deadline: string | null): boolean {
  if (!deadline) return false;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return deadline < todayStr;
}

function effortIcon(effort: EffortLevel): string {
  switch (effort) {
    case 'quick': return '\u26A1'; // lightning
    case 'deep': return '\u23F3'; // hourglass
    case 'draining': return '\uD83D\uDD0B'; // battery
  }
}

function effortLabel(effort: EffortLevel): string {
  switch (effort) {
    case 'quick': return 'quick';
    case 'deep': return 'deep work';
    case 'draining': return 'draining';
  }
}

function emotionTintClass(emotion: EmotionalContext): string {
  switch (emotion) {
    case 'excited': return 'border-l-green-400/50';
    case 'dreading': return 'border-l-orange-400/50';
    case 'neutral': return '';
  }
}

export function TaskCard({ task, nudge, onComplete, onDefer, variant = 'card', highlighted, dismissing, deferring, onHighlightComplete }: TaskCardProps) {
  const animationClass = dismissing ? 'animate-fall-away' : deferring ? 'animate-slide-out' : '';

  const handleAnimationEnd = (e: React.AnimationEvent) => {
    if (e.animationName === 'highlight-glow' && onHighlightComplete) {
      onHighlightComplete(task.id);
    }
  };
  const blockCount = task.relationships.blocks.length;
  const pastDue = isPastDue(task.parsed.deadline);
  const emotionClass = task.emotionalContext ? emotionTintClass(task.emotionalContext) : '';

  if (variant === 'row') {
    return (
      <div className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-hover ${emotionClass ? `border-l-2 ${emotionClass}` : ''} ${highlighted ? 'animate-highlight' : ''} ${animationClass}`} onAnimationEnd={handleAnimationEnd}>
        <button
          onClick={() => onComplete(task.id)}
          aria-label="complete"
          className="h-5 w-5 shrink-0 rounded-full border-2 border-check-border transition-colors hover:border-check-hover-border hover:bg-check-hover-bg"
        />
        <span className="flex-1 text-sm text-text-primary">{task.parsed.title}</span>
        {task.estimatedEffort && (
          <span className="text-xs text-text-muted opacity-60" title={effortLabel(task.estimatedEffort)}>
            {effortIcon(task.estimatedEffort)}
          </span>
        )}
        {task.deferrals > 0 && (
          <span className="text-xs text-text-muted">deferred {task.deferrals}x</span>
        )}
        <button
          onClick={() => onDefer(task.id)}
          aria-label="defer"
          className="text-xs text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-text-secondary"
        >
          not today
        </button>
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md ${emotionClass ? `border-l-2 ${emotionClass}` : ''} ${highlighted ? 'animate-highlight' : ''} ${animationClass}`} onAnimationEnd={handleAnimationEnd}>
      {pastDue && (
        <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
          !
        </span>
      )}
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-text-primary">{task.parsed.title}</h3>
          {task.estimatedEffort && (
            <span className="text-xs text-text-muted opacity-60" title={effortLabel(task.estimatedEffort)}>
              {effortIcon(task.estimatedEffort)}
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {task.parsed.deadline && (
            <span className="text-xs text-text-muted">{formatDeadline(task.parsed.deadline)}</span>
          )}
          {blockCount > 0 && (
            <span className="text-xs text-text-muted">blocks: {blockCount}</span>
          )}
        </div>
        {nudge && (
          <p className="mt-2 text-xs italic text-nudge">{nudge}</p>
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onComplete(task.id)}
          aria-label="complete"
          className="rounded-lg bg-surface-hover px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-accent-soft hover:text-accent-text"
        >
          done
        </button>
        <button
          onClick={() => onDefer(task.id)}
          aria-label="defer"
          className="rounded-lg bg-surface-hover px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-accent-soft hover:text-accent-text"
        >
          not today
        </button>
      </div>
    </div>
  );
}
