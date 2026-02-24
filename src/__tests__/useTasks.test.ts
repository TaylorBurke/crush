import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTasks } from '../hooks/useTasks';

describe('useTasks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty tasks', () => {
    const { result } = renderHook(() => useTasks());
    expect(result.current.tasks).toEqual([]);
  });

  it('adds a task', () => {
    const { result } = renderHook(() => useTasks());
    act(() => {
      result.current.addTask({
        text: 'test task',
        parsed: { title: 'Test Task', deadline: null, tags: [] },
        importance: 'medium',
        relationships: { blocks: [], blockedBy: [], clusterId: null },
      });
    });
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].parsed.title).toBe('Test Task');
    expect(result.current.tasks[0].status).toBe('active');
  });

  it('completes a task', () => {
    const { result } = renderHook(() => useTasks());
    act(() => {
      result.current.addTask({
        text: 'do it',
        parsed: { title: 'Do It', deadline: null, tags: [] },
        importance: 'low',
        relationships: { blocks: [], blockedBy: [], clusterId: null },
      });
    });
    const id = result.current.tasks[0].id;
    act(() => {
      result.current.completeTask(id);
    });
    expect(result.current.tasks[0].status).toBe('completed');
    expect(result.current.tasks[0].completedAt).not.toBeNull();
  });

  it('defers a task and increments deferral count', () => {
    const { result } = renderHook(() => useTasks());
    act(() => {
      result.current.addTask({
        text: 'later',
        parsed: { title: 'Later', deadline: null, tags: [] },
        importance: 'low',
        relationships: { blocks: [], blockedBy: [], clusterId: null },
      });
    });
    const id = result.current.tasks[0].id;
    act(() => {
      result.current.deferTask(id);
    });
    expect(result.current.tasks[0].status).toBe('deferred');
    expect(result.current.tasks[0].deferrals).toBe(1);
  });

  it('moves a task to someday', () => {
    const { result } = renderHook(() => useTasks());
    act(() => {
      result.current.addTask({
        text: 'maybe',
        parsed: { title: 'Maybe', deadline: null, tags: [] },
        importance: 'low',
        relationships: { blocks: [], blockedBy: [], clusterId: null },
      });
    });
    const id = result.current.tasks[0].id;
    act(() => {
      result.current.somedayTask(id);
    });
    expect(result.current.tasks[0].status).toBe('someday');
  });

  it('deletes a task', () => {
    const { result } = renderHook(() => useTasks());
    act(() => {
      result.current.addTask({
        text: 'delete me',
        parsed: { title: 'Delete Me', deadline: null, tags: [] },
        importance: 'low',
        relationships: { blocks: [], blockedBy: [], clusterId: null },
      });
    });
    const id = result.current.tasks[0].id;
    act(() => {
      result.current.deleteTask(id);
    });
    expect(result.current.tasks).toHaveLength(0);
  });

  it('reactivates a deferred task', () => {
    const { result } = renderHook(() => useTasks());
    act(() => {
      result.current.addTask({
        text: 'reactivate',
        parsed: { title: 'Reactivate', deadline: null, tags: [] },
        importance: 'medium',
        relationships: { blocks: [], blockedBy: [], clusterId: null },
      });
    });
    const id = result.current.tasks[0].id;
    act(() => { result.current.deferTask(id); });
    act(() => { result.current.reactivateTask(id); });
    expect(result.current.tasks[0].status).toBe('active');
  });

  it('filters active tasks', () => {
    const { result } = renderHook(() => useTasks());
    act(() => {
      result.current.addTask({
        text: 'active',
        parsed: { title: 'Active', deadline: null, tags: [] },
        importance: 'medium',
        relationships: { blocks: [], blockedBy: [], clusterId: null },
      });
      result.current.addTask({
        text: 'also active',
        parsed: { title: 'Also Active', deadline: null, tags: [] },
        importance: 'low',
        relationships: { blocks: [], blockedBy: [], clusterId: null },
      });
    });
    const id = result.current.tasks[0].id;
    act(() => { result.current.completeTask(id); });
    expect(result.current.activeTasks).toHaveLength(1);
    expect(result.current.activeTasks[0].parsed.title).toBe('Also Active');
  });
});
