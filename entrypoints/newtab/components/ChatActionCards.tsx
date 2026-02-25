import type { EffortLevel } from '../../../src/types';

export interface CreatedTaskInfo {
  title: string;
  deadline: string | null;
  effort: EffortLevel | null;
}

interface ChatActionCardsProps {
  tasks: CreatedTaskInfo[];
}

function formatDeadline(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function effortIcon(effort: EffortLevel): string {
  switch (effort) {
    case 'quick': return '\u26A1';
    case 'deep': return '\u23F3';
    case 'draining': return '\uD83D\uDD0B';
  }
}

export function ChatActionCards({ tasks }: ChatActionCardsProps) {
  if (tasks.length === 0) return null;
  return (
    <div className="mt-1.5 space-y-1">
      {tasks.map((task, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg border-l-2 border-accent/40 bg-surface/60 px-3 py-1.5">
          <span className="flex-1 text-xs text-text-primary">{task.title}</span>
          {task.effort && (
            <span className="text-xs text-text-muted opacity-60">{effortIcon(task.effort)}</span>
          )}
          {task.deadline && (
            <span className="text-xs text-text-muted">{formatDeadline(task.deadline)}</span>
          )}
        </div>
      ))}
    </div>
  );
}
