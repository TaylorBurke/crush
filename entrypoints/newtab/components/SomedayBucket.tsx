import { useState } from 'react';
import type { Task } from '../../../src/types';
import { TaskCard } from './TaskCard';

interface SomedayBucketProps {
  tasks: Task[];
  onComplete: (id: string) => void;
  onDefer: (id: string) => void;
}

export function SomedayBucket({ tasks, onComplete, onDefer }: SomedayBucketProps) {
  const [expanded, setExpanded] = useState(false);
  if (tasks.length === 0) return null;
  return (
    <section className="mb-8">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-sm font-medium tracking-wide text-stone-400 uppercase">
        <span>someday</span>
        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs text-stone-500">{tasks.length}</span>
        <span className="text-xs">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-1">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onComplete={onComplete} onDefer={onDefer} variant="row" />
          ))}
        </div>
      )}
    </section>
  );
}
