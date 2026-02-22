import type { Task } from '../../../src/types';
import { TaskCard } from './TaskCard';

interface NudgeSectionProps {
  tasks: Task[];
  onComplete: (id: string) => void;
  onDefer: (id: string) => void;
}

export function NudgeSection({ tasks, onComplete, onDefer }: NudgeSectionProps) {
  if (tasks.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-medium tracking-wide text-text-muted uppercase">you've been putting off</h2>
      <div className="space-y-1">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onComplete={onComplete} onDefer={onDefer} variant="row" />
        ))}
      </div>
    </section>
  );
}
