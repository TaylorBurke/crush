import { useRef } from 'react';
import type { Task, Nudge } from '../../../src/types';
import { TaskCard } from './TaskCard';
import { useLayoutTransition } from '../../../src/hooks/useLayoutTransition';

interface FocusCardsProps {
  tasks: Task[];
  nudges: Nudge[];
  onComplete: (id: string) => void;
  onDefer: (id: string) => void;
  highlightedTaskIds?: Set<string>;
  dismissingTaskIds?: Set<string>;
  deferringTaskIds?: Set<string>;
  onHighlightComplete?: (id: string) => void;
}

export function FocusCards({ tasks, nudges, onComplete, onDefer, highlightedTaskIds, dismissingTaskIds, deferringTaskIds, onHighlightComplete }: FocusCardsProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  useLayoutTransition(gridRef);

  if (tasks.length === 0) return null;
  const nudgeMap = Object.fromEntries(nudges.map((n) => [n.taskId, n.message]));
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-text-muted uppercase">focus on these</h2>
      <div ref={gridRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <div key={task.id} data-key={task.id}>
            <TaskCard task={task} nudge={nudgeMap[task.id]} onComplete={onComplete} onDefer={onDefer} highlighted={highlightedTaskIds?.has(task.id)} dismissing={dismissingTaskIds?.has(task.id)} deferring={deferringTaskIds?.has(task.id)} onHighlightComplete={onHighlightComplete} />
          </div>
        ))}
      </div>
    </section>
  );
}
