import { useState } from 'react';
import type { Task, Cluster } from '../../../src/types';
import { TaskCard } from './TaskCard';

interface ClusterSectionProps {
  cluster: Cluster;
  tasks: Task[];
  onComplete: (id: string) => void;
  onDefer: (id: string) => void;
}

export function ClusterSection({ cluster, tasks, onComplete, onDefer }: ClusterSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const percentage = Math.round(cluster.progress * 100);
  return (
    <section className="mb-6">
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-3 text-left">
        <h2 className="text-sm font-medium tracking-wide text-text-muted uppercase">{cluster.name}</h2>
        <div className="h-1.5 flex-1 rounded-full bg-progress-bg">
          <div className="h-1.5 rounded-full bg-progress-fill transition-all" style={{ width: `${percentage}%` }} />
        </div>
        <span className="text-xs text-text-muted">{tasks.filter((t) => t.status === 'completed').length}/{tasks.length}</span>
        <span className="text-xs text-text-muted">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-1 pl-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onComplete={onComplete} onDefer={onDefer} variant="row" />
          ))}
        </div>
      )}
    </section>
  );
}
