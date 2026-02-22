import { useState, useCallback, useMemo } from 'react';
import { TaskStorage } from '../lib/storage';
import type { Task, Importance } from '../types';

interface NewTaskInput {
  text: string;
  parsed: {
    title: string;
    deadline: string | null;
    tags: string[];
  };
  importance: Importance;
  relationships: {
    blocks: string[];
    blockedBy: string[];
    cluster: string | null;
  };
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => TaskStorage.getAll());

  const refresh = useCallback(() => {
    setTasks(TaskStorage.getAll());
  }, []);

  const addTask = useCallback((input: NewTaskInput) => {
    const task: Task = {
      id: crypto.randomUUID(),
      text: input.text,
      parsed: input.parsed,
      importance: input.importance,
      relationships: input.relationships,
      status: 'active',
      deferrals: 0,
      createdAt: new Date().toISOString(),
      completedAt: null,
      lastSurfacedAt: null,
    };
    TaskStorage.save(task);
    refresh();
    return task;
  }, [refresh]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    const existing = TaskStorage.getById(id);
    if (!existing) return;
    TaskStorage.save({ ...existing, ...updates });
    refresh();
  }, [refresh]);

  const completeTask = useCallback((id: string) => {
    updateTask(id, { status: 'completed', completedAt: new Date().toISOString() });
  }, [updateTask]);

  const deferTask = useCallback((id: string) => {
    const existing = TaskStorage.getById(id);
    if (!existing) return;
    updateTask(id, { status: 'deferred', deferrals: existing.deferrals + 1 });
  }, [updateTask]);

  const somedayTask = useCallback((id: string) => {
    updateTask(id, { status: 'someday' });
  }, [updateTask]);

  const reactivateTask = useCallback((id: string) => {
    updateTask(id, { status: 'active' });
  }, [updateTask]);

  const deleteTask = useCallback((id: string) => {
    TaskStorage.remove(id);
    refresh();
  }, [refresh]);

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status === 'active'),
    [tasks],
  );

  const deferredTasks = useMemo(
    () => tasks.filter((t) => t.status === 'deferred'),
    [tasks],
  );

  const somedayTasks = useMemo(
    () => tasks.filter((t) => t.status === 'someday'),
    [tasks],
  );

  const completedTasks = useMemo(
    () => tasks.filter((t) => t.status === 'completed'),
    [tasks],
  );

  return {
    tasks,
    activeTasks,
    deferredTasks,
    somedayTasks,
    completedTasks,
    addTask,
    updateTask,
    completeTask,
    deferTask,
    somedayTask,
    reactivateTask,
    deleteTask,
    refresh,
  };
}
