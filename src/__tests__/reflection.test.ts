import { describe, it, expect } from 'vitest';
import { buildDailyReflection } from '../lib/reflection';
import type { Task, ComputedView } from '../types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'test-1', text: 'test', parsed: { title: 'Test', deadline: null, tags: [] },
    importance: 'medium', relationships: { blocks: [], blockedBy: [], clusterId: null },
    status: 'active', deferrals: 0, createdAt: '2026-02-21T10:00:00Z',
    completedAt: null, lastSurfacedAt: null,
    estimatedEffort: null, emotionalContext: null, creationContext: null,
    ...overrides,
  };
}

describe('reflection', () => {
  it('counts tasks completed on the given date', () => {
    const tasks = [
      makeTask({ id: 't1', status: 'completed', completedAt: '2026-02-23T14:00:00Z' }),
      makeTask({ id: 't2', status: 'completed', completedAt: '2026-02-23T18:00:00Z' }),
      makeTask({ id: 't3', status: 'completed', completedAt: '2026-02-22T10:00:00Z' }),
    ];
    const result = buildDailyReflection(tasks, null, '2026-02-23');
    expect(result.tasksCompleted).toBe(2);
    expect(result.date).toBe('2026-02-23');
  });

  it('counts deferred tasks', () => {
    const tasks = [
      makeTask({ id: 't1', status: 'deferred', deferrals: 2 }),
      makeTask({ id: 't2', status: 'deferred', deferrals: 1 }),
      makeTask({ id: 't3', status: 'active' }),
    ];
    const result = buildDailyReflection(tasks, null, '2026-02-23');
    expect(result.tasksDeferred).toBe(2);
  });

  it('calculates focus task hit rate', () => {
    const tasks = [
      makeTask({ id: 't1', status: 'completed', completedAt: '2026-02-23T14:00:00Z', parsed: { title: 'Focus 1', deadline: null, tags: [] } }),
      makeTask({ id: 't2', status: 'active', parsed: { title: 'Focus 2', deadline: null, tags: [] } }),
      makeTask({ id: 't3', status: 'completed', completedAt: '2026-02-23T18:00:00Z', parsed: { title: 'Non-focus', deadline: null, tags: [] } }),
    ];
    const view: ComputedView = {
      generatedAt: '', focusToday: ['t1', 't2', 't3'], nudges: [], urgencyScores: {}, clusters: [],
    };
    const result = buildDailyReflection(tasks, view, '2026-02-23');
    expect(result.focusTasksTotal).toBe(3);
    expect(result.focusTasksHit).toBe(2); // t1 and t3 completed
  });

  it('returns zeros for empty tasks', () => {
    const result = buildDailyReflection([], null, '2026-02-23');
    expect(result.tasksCompleted).toBe(0);
    expect(result.tasksDeferred).toBe(0);
    expect(result.focusTasksHit).toBe(0);
    expect(result.focusTasksTotal).toBe(0);
  });

  it('includes top completed and deferred titles', () => {
    const tasks = [
      makeTask({ id: 't1', status: 'completed', completedAt: '2026-02-23T14:00:00Z', parsed: { title: 'Completed A', deadline: null, tags: [] } }),
      makeTask({ id: 't2', status: 'deferred', deferrals: 1, parsed: { title: 'Deferred B', deadline: null, tags: [] } }),
    ];
    const result = buildDailyReflection(tasks, null, '2026-02-23');
    expect(result.topCompletedTitles).toContain('Completed A');
    expect(result.topDeferredTitles).toContain('Deferred B');
  });
});
