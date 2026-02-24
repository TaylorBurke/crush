import type { Task, ComputedView, DailyReflection } from '../types';

export function buildDailyReflection(tasks: Task[], previousView: ComputedView | null, date: string): DailyReflection {
  // Count completed/deferred tasks for the given date
  const completedToday = tasks.filter((t) =>
    t.status === 'completed' && t.completedAt && t.completedAt.startsWith(date),
  );

  const deferredToday = tasks.filter((t) =>
    t.status === 'deferred' && t.deferrals > 0,
  );

  // Calculate focus task hit rate
  let focusTasksHit = 0;
  let focusTasksTotal = 0;
  if (previousView?.focusToday.length) {
    focusTasksTotal = previousView.focusToday.length;
    focusTasksHit = previousView.focusToday.filter((id) =>
      completedToday.some((t) => t.id === id),
    ).length;
  }

  return {
    date,
    tasksCompleted: completedToday.length,
    tasksDeferred: deferredToday.length,
    focusTasksHit,
    focusTasksTotal,
    topCompletedTitles: completedToday.slice(0, 5).map((t) => t.parsed.title),
    topDeferredTitles: deferredToday.slice(0, 5).map((t) => t.parsed.title),
  };
}
