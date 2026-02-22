import type { Task } from '../../../src/types';

interface TaskCardProps {
  task: Task;
  nudge?: string;
  onComplete: (id: string) => void;
  onDefer: (id: string) => void;
  variant?: 'card' | 'row';
}

function formatDeadline(iso: string): string {
  // Parse date-only strings (YYYY-MM-DD) as local to avoid timezone shift
  const [year, month, day] = iso.split('T')[0].split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function TaskCard({ task, nudge, onComplete, onDefer, variant = 'card' }: TaskCardProps) {
  const blockCount = task.relationships.blocks.length;

  if (variant === 'row') {
    return (
      <div className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-stone-100">
        <button
          onClick={() => onComplete(task.id)}
          aria-label="complete"
          className="h-5 w-5 shrink-0 rounded-full border-2 border-stone-300 transition-colors hover:border-amber-400 hover:bg-amber-50"
        />
        <span className="flex-1 text-sm text-stone-700">{task.parsed.title}</span>
        {task.deferrals > 0 && (
          <span className="text-xs text-stone-400">deferred {task.deferrals}x</span>
        )}
        <button
          onClick={() => onDefer(task.id)}
          aria-label="defer"
          className="text-xs text-stone-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-stone-600"
        >
          not today
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {task.importance === 'high' && (
        <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-white">
          !
        </span>
      )}
      <div>
        <h3 className="text-sm font-medium text-stone-800">{task.parsed.title}</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {task.parsed.deadline && (
            <span className="text-xs text-stone-500">
              {formatDeadline(task.parsed.deadline)}
            </span>
          )}
          {blockCount > 0 && (
            <span className="text-xs text-stone-500">blocks: {blockCount}</span>
          )}
        </div>
        {nudge && (
          <p className="mt-2 text-xs italic text-amber-600">{nudge}</p>
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onComplete(task.id)}
          aria-label="complete"
          className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs text-stone-600 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
        >
          done
        </button>
        <button
          onClick={() => onDefer(task.id)}
          aria-label="defer"
          className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs text-stone-600 transition-colors hover:bg-amber-100 hover:text-amber-700"
        >
          not today
        </button>
      </div>
    </div>
  );
}
