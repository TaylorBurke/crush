import { describe, it, expect, beforeEach } from 'vitest';
import { TaskStorage } from '../lib/storage';
import type { Task } from '../types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'test-1',
    text: 'test task',
    parsed: { title: 'Test Task', deadline: null, tags: [] },
    importance: 'medium',
    relationships: { blocks: [], blockedBy: [], cluster: null },
    status: 'active',
    deferrals: 0,
    createdAt: '2026-02-21T10:00:00Z',
    completedAt: null,
    lastSurfacedAt: null,
    ...overrides,
  };
}

describe('TaskStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when no tasks stored', () => {
    expect(TaskStorage.getAll()).toEqual([]);
  });

  it('saves and retrieves a task', () => {
    const task = makeTask();
    TaskStorage.save(task);
    const tasks = TaskStorage.getAll();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe('test-1');
  });

  it('updates an existing task', () => {
    const task = makeTask();
    TaskStorage.save(task);
    TaskStorage.save({ ...task, status: 'completed' });
    const tasks = TaskStorage.getAll();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].status).toBe('completed');
  });

  it('deletes a task', () => {
    TaskStorage.save(makeTask({ id: 'a' }));
    TaskStorage.save(makeTask({ id: 'b' }));
    TaskStorage.remove('a');
    const tasks = TaskStorage.getAll();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe('b');
  });

  it('gets a task by id', () => {
    TaskStorage.save(makeTask({ id: 'find-me' }));
    const found = TaskStorage.getById('find-me');
    expect(found?.id).toBe('find-me');
  });

  it('returns undefined for missing task', () => {
    expect(TaskStorage.getById('nope')).toBeUndefined();
  });
});
