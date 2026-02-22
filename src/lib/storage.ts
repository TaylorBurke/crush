import type { Task, ComputedView } from '../types';

const TASKS_KEY = 'crush-tasks';
const VIEW_KEY = 'crush-computed-view';
const LAST_BRIEF_KEY = 'crush-last-brief-date';

export const TaskStorage = {
  getAll(): Task[] {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Task[];
  },

  getById(id: string): Task | undefined {
    return this.getAll().find((t) => t.id === id);
  },

  save(task: Task): void {
    const tasks = this.getAll();
    const idx = tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) {
      tasks[idx] = task;
    } else {
      tasks.push(task);
    }
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  },

  remove(id: string): void {
    const tasks = this.getAll().filter((t) => t.id !== id);
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  },

  clear(): void {
    localStorage.removeItem(TASKS_KEY);
  },
};

export const ViewStorage = {
  get(): ComputedView | null {
    const raw = localStorage.getItem(VIEW_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ComputedView;
  },

  save(view: ComputedView): void {
    localStorage.setItem(VIEW_KEY, JSON.stringify(view));
  },

  clear(): void {
    localStorage.removeItem(VIEW_KEY);
  },
};

export const BriefStorage = {
  getLastDate(): string | null {
    return localStorage.getItem(LAST_BRIEF_KEY);
  },

  setLastDate(date: string): void {
    localStorage.setItem(LAST_BRIEF_KEY, date);
  },
};
