import { useState } from 'react';
import type { Task } from '../../../src/types';
import { TaskCard } from './TaskCard';

interface SomedayBucketProps {
  tasks: Task[];
  onComplete: (id: string) => void;
  onDefer: (id: string) => void;
  highlightedTaskIds?: Set<string>;
  dismissingTaskIds?: Set<string>;
  deferringTaskIds?: Set<string>;
  onHighlightComplete?: (id: string) => void;
}

export function SomedayBucket({ tasks, onComplete, onDefer, highlightedTaskIds, dismissingTaskIds, deferringTaskIds, onHighlightComplete }: SomedayBucketProps) {
  const [expanded, setExpanded] = useState(false);
  if (tasks.length === 0) return null;
  return (
    <section className="mb-8">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-sm font-medium tracking-wide text-text-muted uppercase">
        <span>someday</span>
        <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text-muted">{tasks.length}</span>
        <span className="text-xs">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-1">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onComplete={onComplete} onDefer={onDefer} variant="row" highlighted={highlightedTaskIds?.has(task.id)} dismissing={dismissingTaskIds?.has(task.id)} deferring={deferringTaskIds?.has(task.id)} onHighlightComplete={onHighlightComplete} />
          ))}
        </div>
      )}
    </section>
  );
}
