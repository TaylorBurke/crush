# Cream Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Chrome new-tab extension that manages tasks with AI-powered parsing, prioritization, and relationship detection.

**Architecture:** WXT Chrome extension with React 19 new-tab page. All task data in localStorage, settings/API key in chrome.storage.local. OpenAI GPT-4o-mini for task parsing, daily brief generation, and on-demand chat. ComputedView pattern separates raw task data from AI-generated analysis.

**Tech Stack:** WXT, React 19, TypeScript 5, Tailwind CSS 4, Vitest, OpenAI API (GPT-4o-mini)

---

## Phase 1: Project Foundation

### Task 1: Scaffold WXT + React + TypeScript project

**Files:**
- Create: `wxt.config.ts`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `entrypoints/newtab/index.html`
- Create: `entrypoints/newtab/main.tsx`
- Create: `entrypoints/newtab/App.tsx`
- Create: `entrypoints/newtab/style.css`
- Create: `entrypoints/background.ts`

**Step 1: Initialize the WXT project**

Run inside `C:\Users\USER\dev\cream`:
```bash
npx wxt@latest init . --template react
```
When prompted, select: **npm** as package manager.

If init complains the directory isn't empty (because of docs/), move docs out temporarily, run init, move docs back.

**Step 2: Verify the scaffold works**

```bash
npm install
npm run dev
```
Expected: Chrome opens with the extension loaded. A new tab shows the WXT default page.

**Step 3: Set up the newtab entrypoint**

WXT's React template may scaffold a popup. We need a newtab entrypoint. Create `entrypoints/newtab/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>cream</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

Create `entrypoints/newtab/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Create `entrypoints/newtab/App.tsx`:

```tsx
export default function App() {
  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <h1 className="text-2xl text-stone-800">cream</h1>
    </div>
  );
}
```

Create `entrypoints/newtab/style.css`:
```css
@import "tailwindcss";
```

Create `entrypoints/background.ts`:

```typescript
export default defineBackground(() => {
  console.log('cream background loaded');
});
```

**Step 4: Configure WXT for storage permission**

Update `wxt.config.ts`:

```typescript
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Cream',
    description: 'AI-powered task intelligence for your new tab',
    permissions: ['storage'],
  },
});
```

**Step 5: Remove popup entrypoint if scaffolded**

If WXT created `entrypoints/popup/` or `entrypoints/popup.html`, delete it. Cream is newtab-only.

**Step 6: Verify newtab works**

```bash
npm run dev
```
Expected: Open a new tab in the dev browser. See "cream" heading on a stone-50 background.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold WXT + React + TypeScript project with newtab entrypoint"
```

---

### Task 2: Add Tailwind CSS 4

**Files:**
- Modify: `package.json` (add tailwind deps)
- Create or modify: `entrypoints/newtab/style.css`

**Step 1: Install Tailwind CSS 4**

```bash
npm install tailwindcss @tailwindcss/vite
```

**Step 2: Add the Vite plugin**

Update `wxt.config.ts` to include the Tailwind Vite plugin:

```typescript
import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Cream',
    description: 'AI-powered task intelligence for your new tab',
    permissions: ['storage'],
  },
});
```

**Step 3: Verify Tailwind works**

Update `entrypoints/newtab/App.tsx` to use Tailwind classes:

```tsx
export default function App() {
  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <h1 className="text-2xl font-light text-stone-800 tracking-tight">cream</h1>
      <p className="mt-2 text-stone-500 text-sm">your tasks, your way</p>
    </div>
  );
}
```

```bash
npm run dev
```
Expected: "cream" heading in light font with stone-800 color, subtitle in stone-500.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Tailwind CSS 4 with Vite plugin"
```

---

### Task 3: Set up Vitest for testing

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add test deps + script)
- Create: `src/__tests__/setup.ts`

**Step 1: Install test dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Step 2: Create Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

**Step 3: Create test setup file**

Create `src/__tests__/setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
```

**Step 4: Add test script to package.json**

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 5: Write a smoke test**

Create `src/__tests__/smoke.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('smoke test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2);
  });
});
```

**Step 6: Run the test**

```bash
npm test
```
Expected: 1 test passes.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Vitest test setup with jsdom and React Testing Library"
```

---

## Phase 2: Core Data Layer

### Task 4: Define TypeScript types

**Files:**
- Create: `src/types/index.ts`
- Test: `src/__tests__/types.test.ts`

**Step 1: Write the test**

Create `src/__tests__/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { Task, ComputedView, TaskStatus, Importance } from '../types';

describe('types', () => {
  it('should create a valid Task', () => {
    const task: Task = {
      id: 'test-1',
      text: 'finish API docs by friday',
      parsed: {
        title: 'Finish API docs',
        deadline: '2026-02-27',
        tags: ['work', 'api'],
      },
      importance: 'high',
      relationships: {
        blocks: [],
        blockedBy: [],
        cluster: null,
      },
      status: 'active',
      deferrals: 0,
      createdAt: '2026-02-21T10:00:00Z',
      completedAt: null,
      lastSurfacedAt: null,
    };
    expect(task.id).toBe('test-1');
    expect(task.status).toBe('active');
    expect(task.parsed.title).toBe('Finish API docs');
  });

  it('should create a valid ComputedView', () => {
    const view: ComputedView = {
      generatedAt: '2026-02-21T04:00:00Z',
      focusToday: ['task-1', 'task-2'],
      nudges: [
        { taskId: 'task-3', message: 'you\'ve pushed this off 3 times' },
      ],
      urgencyScores: {
        'task-1': { score: 0.9, reasons: ['deadline tomorrow'] },
      },
      clusters: [
        { id: 'c1', name: 'portfolio redesign', taskIds: ['task-1', 'task-2'], progress: 0.5 },
      ],
    };
    expect(view.focusToday).toHaveLength(2);
    expect(view.clusters[0].progress).toBe(0.5);
  });
});
```

**Step 2: Run the test to verify it fails**

```bash
npm test
```
Expected: FAIL -- cannot find module `../types`.

**Step 3: Write the types**

Create `src/types/index.ts`:

```typescript
export type TaskStatus = 'active' | 'completed' | 'deferred' | 'someday';
export type Importance = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
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
  status: TaskStatus;
  deferrals: number;
  createdAt: string;
  completedAt: string | null;
  lastSurfacedAt: string | null;
}

export interface Nudge {
  taskId: string;
  message: string;
}

export interface UrgencyScore {
  score: number;
  reasons: string[];
}

export interface Cluster {
  id: string;
  name: string;
  taskIds: string[];
  progress: number;
}

export interface ComputedView {
  generatedAt: string;
  focusToday: string[];
  nudges: Nudge[];
  urgencyScores: Record<string, UrgencyScore>;
  clusters: Cluster[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Settings {
  openaiApiKey: string;
  userName: string;
}
```

**Step 4: Run the test**

```bash
npm test
```
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/types/index.ts src/__tests__/types.test.ts
git commit -m "feat: define core TypeScript types (Task, ComputedView, Settings)"
```

---

### Task 5: Date utility with 4 AM rollover

**Files:**
- Create: `src/lib/date.ts`
- Test: `src/__tests__/date.test.ts`

**Step 1: Write the tests**

Create `src/__tests__/date.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { today, getGreeting, isNewDay } from '../lib/date';

describe('date utilities', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('today()', () => {
    it('returns current date when after 4 AM', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-21T10:00:00'));
      expect(today()).toBe('2026-02-21');
    });

    it('returns previous date when before 4 AM', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-22T02:30:00'));
      expect(today()).toBe('2026-02-21');
    });

    it('returns current date at exactly 4 AM', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-22T04:00:00'));
      expect(today()).toBe('2026-02-22');
    });
  });

  describe('getGreeting()', () => {
    it('returns morning greeting before noon', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-21T09:00:00'));
      const greeting = getGreeting();
      expect(greeting).toContain('morning');
    });

    it('returns afternoon greeting in the afternoon', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-21T14:00:00'));
      const greeting = getGreeting();
      expect(greeting).toContain('afternoon');
    });

    it('returns evening greeting at night', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-21T20:00:00'));
      const greeting = getGreeting();
      expect(greeting).toContain('evening');
    });

    it('returns late night greeting after midnight before 4 AM', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-22T01:30:00'));
      const greeting = getGreeting();
      expect(greeting).toContain('night');
    });
  });

  describe('isNewDay()', () => {
    it('returns true when last date differs from today', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-22T10:00:00'));
      expect(isNewDay('2026-02-21')).toBe(true);
    });

    it('returns false when last date is today', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-22T10:00:00'));
      expect(isNewDay('2026-02-22')).toBe(false);
    });

    it('returns true when no last date provided', () => {
      expect(isNewDay(null)).toBe(true);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test
```
Expected: FAIL -- cannot find module `../lib/date`.

**Step 3: Implement date utilities**

Create `src/lib/date.ts`:

```typescript
const ROLLOVER_HOUR = 4;

export function today(): string {
  const now = new Date();
  if (now.getHours() < ROLLOVER_HOUR) {
    now.setDate(now.getDate() - 1);
  }
  return now.toISOString().split('T')[0];
}

export function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < ROLLOVER_HOUR) return "hey, late night?";
  if (hour < 12) return "good morning.";
  if (hour < 17) return "good afternoon.";
  return "good evening.";
}

export function isNewDay(lastDate: string | null): boolean {
  if (!lastDate) return true;
  return today() !== lastDate;
}

export function getDayOfWeek(): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

export function daysAgo(isoDate: string): number {
  const then = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
```

**Step 4: Run tests**

```bash
npm test
```
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/lib/date.ts src/__tests__/date.test.ts
git commit -m "feat: add date utilities with 4 AM rollover logic"
```

---

### Task 6: Storage utility

**Files:**
- Create: `src/lib/storage.ts`
- Test: `src/__tests__/storage.test.ts`

**Step 1: Write the tests**

Create `src/__tests__/storage.test.ts`:

```typescript
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
```

**Step 2: Run tests to verify they fail**

```bash
npm test
```
Expected: FAIL.

**Step 3: Implement storage utility**

Create `src/lib/storage.ts`:

```typescript
import type { Task, ComputedView } from '../types';

const TASKS_KEY = 'cream-tasks';
const VIEW_KEY = 'cream-computed-view';
const LAST_BRIEF_KEY = 'cream-last-brief-date';

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
```

**Step 4: Run tests**

```bash
npm test
```
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/lib/storage.ts src/__tests__/storage.test.ts
git commit -m "feat: add localStorage wrappers for tasks, computed view, and brief date"
```

---

### Task 7: useTasks hook

**Files:**
- Create: `src/hooks/useTasks.ts`
- Test: `src/__tests__/useTasks.test.ts`

**Step 1: Write the tests**

Create `src/__tests__/useTasks.test.ts`:

```typescript
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
        relationships: { blocks: [], blockedBy: [], cluster: null },
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
        relationships: { blocks: [], blockedBy: [], cluster: null },
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
        relationships: { blocks: [], blockedBy: [], cluster: null },
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
        relationships: { blocks: [], blockedBy: [], cluster: null },
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
        relationships: { blocks: [], blockedBy: [], cluster: null },
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
        relationships: { blocks: [], blockedBy: [], cluster: null },
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
        relationships: { blocks: [], blockedBy: [], cluster: null },
      });
      result.current.addTask({
        text: 'also active',
        parsed: { title: 'Also Active', deadline: null, tags: [] },
        importance: 'low',
        relationships: { blocks: [], blockedBy: [], cluster: null },
      });
    });
    const id = result.current.tasks[0].id;
    act(() => { result.current.completeTask(id); });
    expect(result.current.activeTasks).toHaveLength(1);
    expect(result.current.activeTasks[0].parsed.title).toBe('Also Active');
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test
```
Expected: FAIL.

**Step 3: Implement the hook**

Create `src/hooks/useTasks.ts`:

```typescript
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
```

**Step 4: Run tests**

```bash
npm test
```
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/hooks/useTasks.ts src/__tests__/useTasks.test.ts
git commit -m "feat: add useTasks hook with full CRUD and lifecycle operations"
```

---

## Phase 3: UI Shell

### Task 8: Greeting component

**Files:**
- Create: `entrypoints/newtab/components/Greeting.tsx`
- Test: `src/__tests__/Greeting.test.tsx`

**Step 1: Write the test**

Create `src/__tests__/Greeting.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Greeting } from '../../entrypoints/newtab/components/Greeting';

describe('Greeting', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows morning greeting in the morning', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-21T09:00:00'));
    render(<Greeting />);
    expect(screen.getByText(/morning/i)).toBeInTheDocument();
  });

  it('shows the day of the week', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-21T09:00:00')); // Saturday
    render(<Greeting />);
    expect(screen.getByText(/saturday/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test
```
Expected: FAIL.

**Step 3: Implement Greeting**

Create `entrypoints/newtab/components/Greeting.tsx`:

```tsx
import { getGreeting, getDayOfWeek } from '../../../src/lib/date';

export function Greeting() {
  const greeting = getGreeting();
  const day = getDayOfWeek();

  return (
    <div className="mb-8">
      <h1 className="text-2xl font-light text-stone-700 tracking-tight">
        {greeting} here's your {day}.
      </h1>
    </div>
  );
}
```

**Step 4: Run test**

```bash
npm test
```
Expected: Pass.

**Step 5: Commit**

```bash
git add entrypoints/newtab/components/Greeting.tsx src/__tests__/Greeting.test.tsx
git commit -m "feat: add Greeting component with time-aware messaging"
```

---

### Task 9: SmartInput component

**Files:**
- Create: `entrypoints/newtab/components/SmartInput.tsx`
- Test: `src/__tests__/SmartInput.test.tsx`

**Step 1: Write the test**

Create `src/__tests__/SmartInput.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SmartInput } from '../../entrypoints/newtab/components/SmartInput';

describe('SmartInput', () => {
  it('renders the input field with placeholder', () => {
    render(<SmartInput onSubmit={() => {}} />);
    expect(screen.getByPlaceholderText(/what's next/i)).toBeInTheDocument();
  });

  it('calls onSubmit with text when Enter is pressed', async () => {
    const onSubmit = vi.fn();
    render(<SmartInput onSubmit={onSubmit} />);
    const input = screen.getByPlaceholderText(/what's next/i);
    await userEvent.type(input, 'finish API docs by friday{enter}');
    expect(onSubmit).toHaveBeenCalledWith('finish API docs by friday');
  });

  it('clears the input after submission', async () => {
    render(<SmartInput onSubmit={() => {}} />);
    const input = screen.getByPlaceholderText(/what's next/i) as HTMLInputElement;
    await userEvent.type(input, 'test task{enter}');
    expect(input.value).toBe('');
  });

  it('does not submit empty input', async () => {
    const onSubmit = vi.fn();
    render(<SmartInput onSubmit={onSubmit} />);
    const input = screen.getByPlaceholderText(/what's next/i);
    await userEvent.type(input, '{enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows loading state when isLoading is true', () => {
    render(<SmartInput onSubmit={() => {}} isLoading={true} />);
    expect(screen.getByPlaceholderText(/thinking/i)).toBeInTheDocument();
  });
});
```

Note: install `@testing-library/user-event` first:
```bash
npm install -D @testing-library/user-event
```

**Step 2: Run test to verify it fails**

```bash
npm test
```
Expected: FAIL.

**Step 3: Implement SmartInput**

Create `entrypoints/newtab/components/SmartInput.tsx`:

```tsx
import { useState, useCallback } from 'react';

interface SmartInputProps {
  onSubmit: (text: string) => void;
  isLoading?: boolean;
}

export function SmartInput({ onSubmit, isLoading = false }: SmartInputProps) {
  const [value, setValue] = useState('');

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && value.trim()) {
        onSubmit(value.trim());
        setValue('');
      }
    },
    [value, onSubmit],
  );

  return (
    <div className="mb-8">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isLoading ? 'thinking...' : "what's next?"}
        disabled={isLoading}
        className="w-full rounded-xl border border-stone-200 bg-white px-5 py-3.5 text-stone-800 placeholder-stone-400 shadow-sm outline-none transition-all focus:border-amber-300 focus:ring-2 focus:ring-amber-100 disabled:opacity-60"
        autoFocus
      />
    </div>
  );
}
```

**Step 4: Run test**

```bash
npm test
```
Expected: Pass.

**Step 5: Commit**

```bash
git add entrypoints/newtab/components/SmartInput.tsx src/__tests__/SmartInput.test.tsx
git commit -m "feat: add SmartInput component with enter-to-submit and loading state"
```

---

### Task 10: TaskCard component

**Files:**
- Create: `entrypoints/newtab/components/TaskCard.tsx`
- Test: `src/__tests__/TaskCard.test.tsx`

**Step 1: Write the test**

Create `src/__tests__/TaskCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskCard } from '../../entrypoints/newtab/components/TaskCard';
import type { Task } from '../../src/types';

const mockTask: Task = {
  id: 'test-1',
  text: 'finish API docs by friday',
  parsed: { title: 'Finish API docs', deadline: '2026-02-27', tags: ['work'] },
  importance: 'high',
  relationships: { blocks: ['task-2', 'task-3'], blockedBy: [], cluster: null },
  status: 'active',
  deferrals: 0,
  createdAt: '2026-02-21T10:00:00Z',
  completedAt: null,
  lastSurfacedAt: null,
};

describe('TaskCard', () => {
  it('renders the task title', () => {
    render(<TaskCard task={mockTask} onComplete={() => {}} onDefer={() => {}} />);
    expect(screen.getByText('Finish API docs')).toBeInTheDocument();
  });

  it('shows deadline when present', () => {
    render(<TaskCard task={mockTask} onComplete={() => {}} onDefer={() => {}} />);
    expect(screen.getByText(/feb 27/i)).toBeInTheDocument();
  });

  it('shows blocking count', () => {
    render(<TaskCard task={mockTask} onComplete={() => {}} onDefer={() => {}} />);
    expect(screen.getByText(/blocks: 2/i)).toBeInTheDocument();
  });

  it('shows importance indicator for high importance', () => {
    render(<TaskCard task={mockTask} onComplete={() => {}} onDefer={() => {}} />);
    expect(screen.getByText('!')).toBeInTheDocument();
  });

  it('calls onComplete when complete button is clicked', async () => {
    const onComplete = vi.fn();
    render(<TaskCard task={mockTask} onComplete={onComplete} onDefer={() => {}} />);
    await userEvent.click(screen.getByLabelText(/complete/i));
    expect(onComplete).toHaveBeenCalledWith('test-1');
  });

  it('calls onDefer when defer button is clicked', async () => {
    const onDefer = vi.fn();
    render(<TaskCard task={mockTask} onComplete={() => {}} onDefer={onDefer} />);
    await userEvent.click(screen.getByLabelText(/defer/i));
    expect(onDefer).toHaveBeenCalledWith('test-1');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test
```
Expected: FAIL.

**Step 3: Implement TaskCard**

Create `entrypoints/newtab/components/TaskCard.tsx`:

```tsx
import type { Task } from '../../../src/types';

interface TaskCardProps {
  task: Task;
  nudge?: string;
  onComplete: (id: string) => void;
  onDefer: (id: string) => void;
  variant?: 'card' | 'row';
}

function formatDeadline(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function TaskCard({ task, nudge, onComplete, onDefer, variant = 'card' }: TaskCardProps) {
  const blockCount = task.relationships.blocks.length;

  if (variant === 'row') {
    return (
      <div className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-stone-100">
        <button
          onClick={() => onComplete(task.id)}
          aria-label="complete"
          className="h-5 w-5 shrink-0 rounded-full border-2 border-stone-300 transition-colors hover:border-amber-400 hover:bg-amber-50"
        />
        <span className="flex-1 text-sm text-stone-700">{task.parsed.title}</span>
        {task.deferrals > 0 && (
          <span className="text-xs text-stone-400">deferred {task.deferrals}x</span>
        )}
        <button
          onClick={() => onDefer(task.id)}
          aria-label="defer"
          className="text-xs text-stone-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-stone-600"
        >
          not today
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {task.importance === 'high' && (
        <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-white">
          !
        </span>
      )}
      <div>
        <h3 className="text-sm font-medium text-stone-800">{task.parsed.title}</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {task.parsed.deadline && (
            <span className="text-xs text-stone-500">
              {formatDeadline(task.parsed.deadline)}
            </span>
          )}
          {blockCount > 0 && (
            <span className="text-xs text-stone-500">blocks: {blockCount}</span>
          )}
        </div>
        {nudge && (
          <p className="mt-2 text-xs italic text-amber-600">{nudge}</p>
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onComplete(task.id)}
          aria-label="complete"
          className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs text-stone-600 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
        >
          done
        </button>
        <button
          onClick={() => onDefer(task.id)}
          aria-label="defer"
          className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs text-stone-600 transition-colors hover:bg-amber-100 hover:text-amber-700"
        >
          not today
        </button>
      </div>
    </div>
  );
}
```

**Step 4: Run test**

```bash
npm test
```
Expected: Pass.

**Step 5: Commit**

```bash
git add entrypoints/newtab/components/TaskCard.tsx src/__tests__/TaskCard.test.tsx
git commit -m "feat: add TaskCard component with card and row variants"
```

---

### Task 11: Assemble the main App layout

**Files:**
- Create: `entrypoints/newtab/components/FocusCards.tsx`
- Create: `entrypoints/newtab/components/NudgeSection.tsx`
- Create: `entrypoints/newtab/components/ClusterSection.tsx`
- Create: `entrypoints/newtab/components/SomedayBucket.tsx`
- Modify: `entrypoints/newtab/App.tsx`

**Step 1: Create FocusCards**

Create `entrypoints/newtab/components/FocusCards.tsx`:

```tsx
import type { Task, Nudge } from '../../../src/types';
import { TaskCard } from './TaskCard';

interface FocusCardsProps {
  tasks: Task[];
  nudges: Nudge[];
  onComplete: (id: string) => void;
  onDefer: (id: string) => void;
}

export function FocusCards({ tasks, nudges, onComplete, onDefer }: FocusCardsProps) {
  if (tasks.length === 0) return null;

  const nudgeMap = Object.fromEntries(nudges.map((n) => [n.taskId, n.message]));

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-stone-400 uppercase">
        focus on these
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            nudge={nudgeMap[task.id]}
            onComplete={onComplete}
            onDefer={onDefer}
          />
        ))}
      </div>
    </section>
  );
}
```

**Step 2: Create NudgeSection**

Create `entrypoints/newtab/components/NudgeSection.tsx`:

```tsx
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
      <h2 className="mb-3 text-sm font-medium tracking-wide text-stone-400 uppercase">
        you've been putting off
      </h2>
      <div className="space-y-1">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onComplete={onComplete}
            onDefer={onDefer}
            variant="row"
          />
        ))}
      </div>
    </section>
  );
}
```

**Step 3: Create ClusterSection**

Create `entrypoints/newtab/components/ClusterSection.tsx`:

```tsx
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
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 text-left"
      >
        <h2 className="text-sm font-medium tracking-wide text-stone-400 uppercase">
          {cluster.name}
        </h2>
        <div className="h-1.5 flex-1 rounded-full bg-stone-200">
          <div
            className="h-1.5 rounded-full bg-amber-400 transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-stone-400">
          {tasks.filter((t) => t.status === 'completed').length}/{tasks.length}
        </span>
        <span className="text-xs text-stone-400">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-1 pl-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={onComplete}
              onDefer={onDefer}
              variant="row"
            />
          ))}
        </div>
      )}
    </section>
  );
}
```

**Step 4: Create SomedayBucket**

Create `entrypoints/newtab/components/SomedayBucket.tsx`:

```tsx
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
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium tracking-wide text-stone-400 uppercase"
      >
        <span>someday</span>
        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs text-stone-500">
          {tasks.length}
        </span>
        <span className="text-xs">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-1">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={onComplete}
              onDefer={onDefer}
              variant="row"
            />
          ))}
        </div>
      )}
    </section>
  );
}
```

**Step 5: Update App.tsx to compose everything**

Update `entrypoints/newtab/App.tsx`:

```tsx
import { useMemo } from 'react';
import { useTasks } from '../../src/hooks/useTasks';
import { Greeting } from './components/Greeting';
import { SmartInput } from './components/SmartInput';
import { FocusCards } from './components/FocusCards';
import { NudgeSection } from './components/NudgeSection';
import { SomedayBucket } from './components/SomedayBucket';

export default function App() {
  const {
    activeTasks,
    deferredTasks,
    somedayTasks,
    addTask,
    completeTask,
    deferTask,
  } = useTasks();

  // Without AI, just show active tasks as focus items (AI will replace this later)
  const focusTasks = useMemo(() => activeTasks.slice(0, 4), [activeTasks]);
  const remainingActive = useMemo(() => activeTasks.slice(4), [activeTasks]);

  const handleSubmit = (text: string) => {
    // For now, create a simple task without AI parsing (AI integration in Phase 5)
    addTask({
      text,
      parsed: { title: text, deadline: null, tags: [] },
      importance: 'medium',
      relationships: { blocks: [], blockedBy: [], cluster: null },
    });
  };

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-stone-50 px-6 py-12">
      <Greeting />
      <SmartInput onSubmit={handleSubmit} />

      <FocusCards
        tasks={focusTasks}
        nudges={[]}
        onComplete={completeTask}
        onDefer={deferTask}
      />

      <NudgeSection
        tasks={deferredTasks}
        onComplete={completeTask}
        onDefer={deferTask}
      />

      {remainingActive.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium tracking-wide text-stone-400 uppercase">
            also on your plate
          </h2>
          <div className="space-y-1">
            {remainingActive.map((task) => (
              <div key={task.id} className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-stone-100">
                <button
                  onClick={() => completeTask(task.id)}
                  className="h-5 w-5 shrink-0 rounded-full border-2 border-stone-300 transition-colors hover:border-amber-400 hover:bg-amber-50"
                />
                <span className="flex-1 text-sm text-stone-700">{task.parsed.title}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <SomedayBucket
        tasks={somedayTasks}
        onComplete={completeTask}
        onDefer={deferTask}
      />
    </div>
  );
}
```

**Step 6: Verify visually**

```bash
npm run dev
```
Expected: New tab shows greeting, input field, and empty sections. Type a task and press Enter -- it appears as a focus card.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: assemble main App layout with all UI sections"
```

---

## Phase 4: Settings & API Key

### Task 12: Settings hook with chrome.storage.local

**Files:**
- Create: `src/hooks/useSettings.ts`
- Create: `entrypoints/newtab/components/SettingsPanel.tsx`

**Step 1: Implement useSettings**

Create `src/hooks/useSettings.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '../types';

const SETTINGS_KEY = 'cream-settings';

const defaultSettings: Settings = {
  openaiApiKey: '',
  userName: '',
};

// Use chrome.storage.local when in extension context, localStorage as fallback for dev
function getStorage() {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return {
      async get(): Promise<Settings> {
        return new Promise((resolve) => {
          chrome.storage.local.get(SETTINGS_KEY, (result) => {
            resolve(result[SETTINGS_KEY] ?? defaultSettings);
          });
        });
      },
      async set(settings: Settings): Promise<void> {
        return new Promise((resolve) => {
          chrome.storage.local.set({ [SETTINGS_KEY]: settings }, resolve);
        });
      },
    };
  }
  // Fallback for dev/test
  return {
    async get(): Promise<Settings> {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : defaultSettings;
    },
    async set(settings: Settings): Promise<void> {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    },
  };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);
  const storage = getStorage();

  useEffect(() => {
    storage.get().then((s) => {
      setSettings(s);
      setLoaded(true);
    });
  }, []);

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    await storage.set(next);
  }, [settings, storage]);

  const hasApiKey = Boolean(settings.openaiApiKey);

  return { settings, updateSettings, loaded, hasApiKey };
}
```

**Step 2: Create SettingsPanel**

Create `entrypoints/newtab/components/SettingsPanel.tsx`:

```tsx
import { useState } from 'react';
import { useSettings } from '../../../src/hooks/useSettings';

export function SettingsPanel() {
  const { settings, updateSettings, hasApiKey } = useSettings();
  const [open, setOpen] = useState(false);
  const [keyInput, setKeyInput] = useState('');

  const handleSaveKey = () => {
    if (keyInput.trim()) {
      updateSettings({ openaiApiKey: keyInput.trim() });
      setKeyInput('');
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 rounded-full bg-stone-200 p-2.5 text-stone-500 transition-colors hover:bg-stone-300"
        aria-label="settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-medium text-stone-800">settings</h2>

        <div className="mb-4">
          <label className="mb-1 block text-sm text-stone-600">OpenAI API Key</label>
          {hasApiKey ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-emerald-600">key saved</span>
              <button
                onClick={() => updateSettings({ openaiApiKey: '' })}
                className="text-xs text-stone-400 hover:text-stone-600"
              >
                remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="sk-..."
                className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-amber-300"
              />
              <button
                onClick={handleSaveKey}
                className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
              >
                save
              </button>
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm text-stone-600">Your Name</label>
          <input
            type="text"
            value={settings.userName}
            onChange={(e) => updateSettings({ userName: e.target.value })}
            placeholder="what should cream call you?"
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-amber-300"
          />
        </div>

        <button
          onClick={() => setOpen(false)}
          className="w-full rounded-lg bg-stone-100 py-2 text-sm text-stone-600 hover:bg-stone-200"
        >
          close
        </button>
      </div>
    </div>
  );
}
```

**Step 3: Add SettingsPanel to App.tsx**

Add to `entrypoints/newtab/App.tsx` imports:
```tsx
import { SettingsPanel } from './components/SettingsPanel';
```

Add at the end of the return JSX, before the closing `</div>`:
```tsx
<SettingsPanel />
```

**Step 4: Verify visually**

```bash
npm run dev
```
Expected: Settings gear icon in bottom-right. Click to open modal with API key input and name field.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add settings panel with API key storage and user name"
```

---

## Phase 5: AI Integration

### Task 13: OpenAI API client

**Files:**
- Create: `src/lib/ai-client.ts`
- Test: `src/__tests__/ai-client.test.ts`

**Step 1: Write the test**

Create `src/__tests__/ai-client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callOpenAI } from '../lib/ai-client';

describe('callOpenAI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the OpenAI API with correct parameters', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: '{"title":"Test"}' } }],
      }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

    const result = await callOpenAI({
      apiKey: 'sk-test',
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer sk-test',
        }),
      }),
    );
    expect(result).toBe('{"title":"Test"}');
  });

  it('throws on API error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
    } as Response);

    await expect(
      callOpenAI({ apiKey: 'bad-key', messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toThrow(/401/);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test
```
Expected: FAIL.

**Step 3: Implement the AI client**

Create `src/lib/ai-client.ts`:

```typescript
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CallOptions {
  apiKey: string;
  messages: Message[];
  model?: string;
  temperature?: number;
  responseFormat?: { type: 'json_object' };
}

export async function callOpenAI(options: CallOptions): Promise<string> {
  const {
    apiKey,
    messages,
    model = DEFAULT_MODEL,
    temperature = 0.3,
    responseFormat,
  } = options;

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
  };
  if (responseFormat) {
    body.response_format = responseFormat;
  }

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `OpenAI API error ${response.status}: ${error?.error?.message ?? response.statusText}`,
    );
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
```

**Step 4: Run tests**

```bash
npm test
```
Expected: Pass.

**Step 5: Commit**

```bash
git add src/lib/ai-client.ts src/__tests__/ai-client.test.ts
git commit -m "feat: add OpenAI API client wrapper"
```

---

### Task 14: Task parser (AI prompt for parsing natural language input)

**Files:**
- Create: `src/lib/task-parser.ts`
- Test: `src/__tests__/task-parser.test.ts`

**Step 1: Write the test**

Create `src/__tests__/task-parser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildParsePrompt, parseAIResponse } from '../lib/task-parser';
import type { Task } from '../types';

describe('task-parser', () => {
  describe('buildParsePrompt', () => {
    it('includes the raw text in the user message', () => {
      const messages = buildParsePrompt('finish API docs by friday', []);
      const userMsg = messages.find((m) => m.role === 'user');
      expect(userMsg?.content).toContain('finish API docs by friday');
    });

    it('includes existing task titles for relationship matching', () => {
      const existing: Pick<Task, 'id' | 'parsed'>[] = [
        { id: 't1', parsed: { title: 'Design schema', deadline: null, tags: [] } },
      ];
      const messages = buildParsePrompt('finish API docs', existing);
      const userMsg = messages.find((m) => m.role === 'user');
      expect(userMsg?.content).toContain('Design schema');
    });
  });

  describe('parseAIResponse', () => {
    it('parses valid JSON response into task fields', () => {
      const json = JSON.stringify({
        title: 'Finish API docs',
        deadline: '2026-02-27',
        importance: 'high',
        tags: ['work', 'api'],
        blockedBy: ['t1'],
        blocks: [],
        cluster: 'api-project',
      });
      const result = parseAIResponse(json);
      expect(result.title).toBe('Finish API docs');
      expect(result.deadline).toBe('2026-02-27');
      expect(result.importance).toBe('high');
      expect(result.blockedBy).toEqual(['t1']);
    });

    it('returns defaults for missing fields', () => {
      const json = JSON.stringify({ title: 'Quick task' });
      const result = parseAIResponse(json);
      expect(result.deadline).toBeNull();
      expect(result.importance).toBe('medium');
      expect(result.tags).toEqual([]);
      expect(result.blocks).toEqual([]);
      expect(result.blockedBy).toEqual([]);
      expect(result.cluster).toBeNull();
    });

    it('falls back to raw text if JSON parsing fails', () => {
      const result = parseAIResponse('not valid json');
      expect(result.title).toBe('not valid json');
      expect(result.importance).toBe('medium');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test
```
Expected: FAIL.

**Step 3: Implement task parser**

Create `src/lib/task-parser.ts`:

```typescript
import type { Task, Importance } from '../types';

interface ParsedTaskFields {
  title: string;
  deadline: string | null;
  importance: Importance;
  tags: string[];
  blocks: string[];
  blockedBy: string[];
  cluster: string | null;
}

interface Message {
  role: 'system' | 'user';
  content: string;
}

export function buildParsePrompt(
  rawText: string,
  existingTasks: Pick<Task, 'id' | 'parsed'>[],
): Message[] {
  const taskList = existingTasks.length > 0
    ? existingTasks.map((t) => `- [${t.id}] ${t.parsed.title}`).join('\n')
    : '(none)';

  const today = new Date().toISOString().split('T')[0];

  return [
    {
      role: 'system',
      content: `You are a task parser. Given raw text from a user, extract structured task data.
Today's date is ${today}.

Respond with JSON only (no markdown, no explanation):
{
  "title": "Clean, concise task title",
  "deadline": "YYYY-MM-DD or null",
  "importance": "high" | "medium" | "low",
  "tags": ["tag1", "tag2"],
  "blocks": ["task-id-1"],
  "blockedBy": ["task-id-2"],
  "cluster": "thematic-group-name or null"
}

Rules:
- "title": Rewrite as a clear, actionable title. Capitalize first word.
- "deadline": Parse relative dates (e.g., "friday" = next friday, "tomorrow", "next week"). Use null if no deadline mentioned.
- "importance": Infer from language. Words like "critical", "urgent", "important", "boss", "launch", "deadline" suggest high. Default to medium.
- "tags": Infer 1-3 short tags from context.
- "blocks"/"blockedBy": Match against existing tasks by semantic similarity. Only use IDs from the existing task list. Use empty arrays if no relationships detected.
- "cluster": If this task relates thematically to existing tasks, suggest a cluster name. Otherwise null.`,
    },
    {
      role: 'user',
      content: `Raw input: "${rawText}"

Existing tasks:
${taskList}`,
    },
  ];
}

export function parseAIResponse(responseText: string): ParsedTaskFields {
  try {
    const data = JSON.parse(responseText);
    return {
      title: data.title || responseText,
      deadline: data.deadline || null,
      importance: (['high', 'medium', 'low'].includes(data.importance) ? data.importance : 'medium') as Importance,
      tags: Array.isArray(data.tags) ? data.tags : [],
      blocks: Array.isArray(data.blocks) ? data.blocks : [],
      blockedBy: Array.isArray(data.blockedBy) ? data.blockedBy : [],
      cluster: data.cluster || null,
    };
  } catch {
    return {
      title: responseText,
      deadline: null,
      importance: 'medium',
      tags: [],
      blocks: [],
      blockedBy: [],
      cluster: null,
    };
  }
}
```

**Step 4: Run tests**

```bash
npm test
```
Expected: Pass.

**Step 5: Commit**

```bash
git add src/lib/task-parser.ts src/__tests__/task-parser.test.ts
git commit -m "feat: add task parser with AI prompt construction and response parsing"
```

---

### Task 15: Daily brief generator

**Files:**
- Create: `src/lib/daily-brief.ts`
- Test: `src/__tests__/daily-brief.test.ts`

**Step 1: Write the test**

Create `src/__tests__/daily-brief.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildDailyBriefPrompt, parseBriefResponse } from '../lib/daily-brief';
import type { Task } from '../types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'test-1',
    text: 'test',
    parsed: { title: 'Test', deadline: null, tags: [] },
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

describe('daily-brief', () => {
  describe('buildDailyBriefPrompt', () => {
    it('includes all tasks in the prompt', () => {
      const tasks = [
        makeTask({ id: 'a', parsed: { title: 'Task A', deadline: null, tags: [] } }),
        makeTask({ id: 'b', parsed: { title: 'Task B', deadline: null, tags: [] } }),
      ];
      const messages = buildDailyBriefPrompt(tasks);
      const userMsg = messages.find((m) => m.role === 'user');
      expect(userMsg?.content).toContain('Task A');
      expect(userMsg?.content).toContain('Task B');
    });
  });

  describe('parseBriefResponse', () => {
    it('parses valid brief JSON', () => {
      const json = JSON.stringify({
        focusToday: ['a', 'b'],
        nudges: [{ taskId: 'c', message: 'hey, this is old' }],
        urgencyScores: { a: { score: 0.8, reasons: ['deadline soon'] } },
        clusters: [{ id: 'c1', name: 'project x', taskIds: ['a'], progress: 0.5 }],
      });
      const result = parseBriefResponse(json);
      expect(result.focusToday).toEqual(['a', 'b']);
      expect(result.nudges).toHaveLength(1);
    });

    it('returns empty defaults on parse failure', () => {
      const result = parseBriefResponse('bad json');
      expect(result.focusToday).toEqual([]);
      expect(result.nudges).toEqual([]);
      expect(result.clusters).toEqual([]);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test
```
Expected: FAIL.

**Step 3: Implement daily brief**

Create `src/lib/daily-brief.ts`:

```typescript
import type { Task, ComputedView } from '../types';

interface Message {
  role: 'system' | 'user';
  content: string;
}

export function buildDailyBriefPrompt(tasks: Task[]): Message[] {
  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const taskSummary = tasks.map((t) => {
    const parts = [
      `[${t.id}] "${t.parsed.title}"`,
      `status: ${t.status}`,
      `importance: ${t.importance}`,
      t.parsed.deadline ? `deadline: ${t.parsed.deadline}` : null,
      t.deferrals > 0 ? `deferrals: ${t.deferrals}` : null,
      t.relationships.blocks.length > 0 ? `blocks: [${t.relationships.blocks.join(', ')}]` : null,
      t.relationships.blockedBy.length > 0 ? `blockedBy: [${t.relationships.blockedBy.join(', ')}]` : null,
      t.relationships.cluster ? `cluster: ${t.relationships.cluster}` : null,
      `created: ${t.createdAt.split('T')[0]}`,
    ].filter(Boolean);
    return parts.join(' | ');
  }).join('\n');

  return [
    {
      role: 'system',
      content: `You are a warm, supportive task advisor. Analyze the user's task list and generate a daily brief.

Today is ${dayOfWeek}, ${today}.

Respond with JSON only:
{
  "focusToday": ["id1", "id2"],
  "nudges": [{"taskId": "id", "message": "warm, personal nudge message"}],
  "urgencyScores": {"id": {"score": 0.0-1.0, "reasons": ["reason"]}},
  "clusters": [{"id": "cluster-id", "name": "cluster name", "taskIds": ["id"], "progress": 0.0-1.0}]
}

Rules for focusToday (pick 2-4 tasks):
- Prioritize by: deadline proximity, importance, blocking impact (tasks that unblock others)
- Mix in one quick win if available (a small, easy task to build momentum)
- Don't show only high-effort tasks -- balance difficulty
- Only pick from active or deferred tasks

Rules for nudges:
- Target deferred tasks (especially high deferral count) and stale active tasks (created >7 days ago, not surfaced recently)
- Tone: warm, casual, lowercase, like a supportive friend. Examples: "hey, this has been sitting here for 2 weeks. still want it?", "you've pushed this off 4 times. want to break it into smaller pieces?"
- Max 3 nudges

Rules for urgencyScores (compute for all non-completed tasks):
- Score 0.0-1.0 based on: deadline proximity, importance propagation through blocking chains, deferral count, staleness
- If a task blocks an important task, it inherits urgency
- Provide 1-2 short reasons

Rules for clusters:
- Group tasks by the cluster field. Calculate progress as (completed in cluster / total in cluster)
- If tasks lack explicit clusters but are thematically related, suggest clusters`,
    },
    {
      role: 'user',
      content: `Here are all my tasks:\n\n${taskSummary}`,
    },
  ];
}

export function parseBriefResponse(responseText: string): ComputedView {
  try {
    const data = JSON.parse(responseText);
    return {
      generatedAt: new Date().toISOString(),
      focusToday: Array.isArray(data.focusToday) ? data.focusToday : [],
      nudges: Array.isArray(data.nudges) ? data.nudges : [],
      urgencyScores: data.urgencyScores && typeof data.urgencyScores === 'object' ? data.urgencyScores : {},
      clusters: Array.isArray(data.clusters) ? data.clusters : [],
    };
  } catch {
    return {
      generatedAt: new Date().toISOString(),
      focusToday: [],
      nudges: [],
      urgencyScores: {},
      clusters: [],
    };
  }
}
```

**Step 4: Run tests**

```bash
npm test
```
Expected: Pass.

**Step 5: Commit**

```bash
git add src/lib/daily-brief.ts src/__tests__/daily-brief.test.ts
git commit -m "feat: add daily brief generator with AI prompt and response parsing"
```

---

### Task 16: useAI hook -- wire AI into the app

**Files:**
- Create: `src/hooks/useAI.ts`
- Modify: `entrypoints/newtab/App.tsx`

**Step 1: Implement useAI hook**

Create `src/hooks/useAI.ts`:

```typescript
import { useState, useCallback } from 'react';
import { callOpenAI } from '../lib/ai-client';
import { buildParsePrompt, parseAIResponse } from '../lib/task-parser';
import { buildDailyBriefPrompt, parseBriefResponse } from '../lib/daily-brief';
import { ViewStorage, BriefStorage } from '../lib/storage';
import { today, isNewDay } from '../lib/date';
import type { Task, ComputedView, ChatMessage } from '../types';

export function useAI(apiKey: string) {
  const [parsing, setParsing] = useState(false);
  const [briefing, setBriefing] = useState(false);
  const [chatting, setChatting] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const parseTask = useCallback(async (
    rawText: string,
    existingTasks: Pick<Task, 'id' | 'parsed'>[],
  ) => {
    if (!apiKey) {
      // No API key: return raw text as title
      return {
        title: rawText,
        deadline: null,
        importance: 'medium' as const,
        tags: [] as string[],
        blocks: [] as string[],
        blockedBy: [] as string[],
        cluster: null,
      };
    }

    setParsing(true);
    try {
      const messages = buildParsePrompt(rawText, existingTasks);
      const response = await callOpenAI({
        apiKey,
        messages,
        responseFormat: { type: 'json_object' },
      });
      return parseAIResponse(response);
    } catch (error) {
      console.error('AI parse failed, using raw text:', error);
      return {
        title: rawText,
        deadline: null,
        importance: 'medium' as const,
        tags: [] as string[],
        blocks: [] as string[],
        blockedBy: [] as string[],
        cluster: null,
      };
    } finally {
      setParsing(false);
    }
  }, [apiKey]);

  const generateBrief = useCallback(async (tasks: Task[]): Promise<ComputedView | null> => {
    if (!apiKey) return null;

    const lastDate = BriefStorage.getLastDate();
    if (!isNewDay(lastDate)) {
      // Already generated today, return cached
      return ViewStorage.get();
    }

    setBriefing(true);
    try {
      const nonCompleted = tasks.filter((t) => t.status !== 'completed');
      if (nonCompleted.length === 0) return null;

      const messages = buildDailyBriefPrompt(tasks);
      const response = await callOpenAI({
        apiKey,
        messages,
        responseFormat: { type: 'json_object' },
      });
      const view = parseBriefResponse(response);
      ViewStorage.save(view);
      BriefStorage.setLastDate(today());
      return view;
    } catch (error) {
      console.error('Daily brief generation failed:', error);
      return ViewStorage.get(); // Fall back to cached
    } finally {
      setBriefing(false);
    }
  }, [apiKey]);

  const chat = useCallback(async (
    userMessage: string,
    tasks: Task[],
    currentView: ComputedView | null,
  ): Promise<string> => {
    setChatting(true);
    const newUserMsg: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setChatHistory((prev) => [...prev, newUserMsg]);

    try {
      const taskSummary = tasks
        .filter((t) => t.status !== 'completed')
        .map((t) => `- "${t.parsed.title}" (${t.status}, importance: ${t.importance})`)
        .join('\n');

      const response = await callOpenAI({
        apiKey,
        messages: [
          {
            role: 'system',
            content: `You are a warm, supportive task advisor named Cream. You help the user manage their tasks, prioritize, break down work, and stay motivated.

Current tasks:
${taskSummary}

${currentView ? `Today's focus: ${currentView.focusToday.join(', ')}` : ''}

Be concise, casual, lowercase. Sound like a supportive friend, not a corporate tool.`,
          },
          ...chatHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user' as const, content: userMessage },
        ],
      });

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };
      setChatHistory((prev) => [...prev, assistantMsg]);
      return response;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'something went wrong';
      const errorResponse: ChatMessage = {
        role: 'assistant',
        content: `sorry, I hit an error: ${errMsg}`,
        timestamp: new Date().toISOString(),
      };
      setChatHistory((prev) => [...prev, errorResponse]);
      return errorResponse.content;
    } finally {
      setChatting(false);
    }
  }, [apiKey, chatHistory]);

  const clearChat = useCallback(() => {
    setChatHistory([]);
  }, []);

  return {
    parseTask,
    generateBrief,
    chat,
    clearChat,
    chatHistory,
    isParsing: parsing,
    isBriefing: briefing,
    isChatting: chatting,
  };
}
```

**Step 2: Create AI Chat Panel**

Create `entrypoints/newtab/components/AIChatPanel.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../../../src/types';

interface AIChatPanelProps {
  open: boolean;
  onClose: () => void;
  onSend: (message: string) => Promise<string>;
  messages: ChatMessage[];
  isLoading: boolean;
}

export function AIChatPanel({ open, onClose, onSend, messages, isLoading }: AIChatPanelProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!open) return null;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    await onSend(text);
  };

  return (
    <div className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-stone-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
        <h2 className="text-sm font-medium text-stone-700">ask cream</h2>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600">&times;</button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-sm text-stone-400 italic">
            ask me anything about your tasks. try "what should i focus on?" or "break down [task]"
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-sm ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
          >
            <div
              className={`inline-block rounded-xl px-4 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-amber-100 text-stone-800'
                  : 'bg-stone-100 text-stone-700'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="text-sm text-stone-400">thinking...</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-stone-200 px-5 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="ask anything..."
            className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-amber-300"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-amber-500"
          >
            send
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Wire AI into App.tsx**

Update `entrypoints/newtab/App.tsx` to integrate all AI features:

```tsx
import { useState, useEffect, useMemo } from 'react';
import { useTasks } from '../../src/hooks/useTasks';
import { useSettings } from '../../src/hooks/useSettings';
import { useAI } from '../../src/hooks/useAI';
import { ViewStorage } from '../../src/lib/storage';
import { Greeting } from './components/Greeting';
import { SmartInput } from './components/SmartInput';
import { FocusCards } from './components/FocusCards';
import { NudgeSection } from './components/NudgeSection';
import { ClusterSection } from './components/ClusterSection';
import { SomedayBucket } from './components/SomedayBucket';
import { AIChatPanel } from './components/AIChatPanel';
import { SettingsPanel } from './components/SettingsPanel';
import type { ComputedView } from '../../src/types';

export default function App() {
  const {
    tasks,
    activeTasks,
    deferredTasks,
    somedayTasks,
    addTask,
    completeTask,
    deferTask,
  } = useTasks();

  const { settings, hasApiKey } = useSettings();
  const ai = useAI(settings.openaiApiKey);
  const [computedView, setComputedView] = useState<ComputedView | null>(() => ViewStorage.get());
  const [chatOpen, setChatOpen] = useState(false);

  // Generate daily brief on first load
  useEffect(() => {
    if (hasApiKey && tasks.length > 0) {
      ai.generateBrief(tasks).then((view) => {
        if (view) setComputedView(view);
      });
    }
  }, [hasApiKey]); // Only run on mount / API key change

  // Determine focus tasks from computed view or fallback
  const focusTasks = useMemo(() => {
    if (computedView?.focusToday.length) {
      return computedView.focusToday
        .map((id) => tasks.find((t) => t.id === id))
        .filter(Boolean) as typeof tasks;
    }
    return activeTasks.slice(0, 4);
  }, [computedView, tasks, activeTasks]);

  const nudges = computedView?.nudges ?? [];
  const clusters = computedView?.clusters ?? [];

  const handleSubmit = async (text: string) => {
    const parsed = await ai.parseTask(text, tasks);
    addTask({
      text,
      parsed: {
        title: parsed.title,
        deadline: parsed.deadline,
        tags: parsed.tags,
      },
      importance: parsed.importance,
      relationships: {
        blocks: parsed.blocks,
        blockedBy: parsed.blockedBy,
        cluster: parsed.cluster,
      },
    });
  };

  const handleChat = async (message: string) => {
    return ai.chat(message, tasks, computedView);
  };

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-stone-50 px-6 py-12">
      <div className="flex items-start justify-between">
        <Greeting />
        {hasApiKey && (
          <button
            onClick={() => setChatOpen(true)}
            className="rounded-lg bg-amber-100 px-4 py-2 text-sm text-amber-700 transition-colors hover:bg-amber-200"
          >
            ask cream
          </button>
        )}
      </div>

      <SmartInput onSubmit={handleSubmit} isLoading={ai.isParsing} />

      {!hasApiKey && tasks.length === 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm text-amber-800">
            add your OpenAI API key in settings to unlock AI-powered task parsing, daily briefs, and smart prioritization.
          </p>
          <p className="mt-2 text-xs text-amber-600">
            click the gear icon in the bottom-right corner.
          </p>
        </div>
      )}

      <FocusCards
        tasks={focusTasks}
        nudges={nudges}
        onComplete={completeTask}
        onDefer={deferTask}
      />

      <NudgeSection
        tasks={deferredTasks}
        onComplete={completeTask}
        onDefer={deferTask}
      />

      {clusters.map((cluster) => {
        const clusterTasks = cluster.taskIds
          .map((id) => tasks.find((t) => t.id === id))
          .filter(Boolean) as typeof tasks;
        return (
          <ClusterSection
            key={cluster.id}
            cluster={cluster}
            tasks={clusterTasks}
            onComplete={completeTask}
            onDefer={deferTask}
          />
        );
      })}

      <SomedayBucket
        tasks={somedayTasks}
        onComplete={completeTask}
        onDefer={deferTask}
      />

      <AIChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        onSend={handleChat}
        messages={ai.chatHistory}
        isLoading={ai.isChatting}
      />

      <SettingsPanel />
    </div>
  );
}
```

**Step 4: Verify visually**

```bash
npm run dev
```
Expected: Full app with greeting, smart input, sections. Adding an API key in settings enables AI parsing (input shows "thinking..." while AI processes). "ask cream" button opens chat panel.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: wire AI integration into app (task parsing, daily brief, chat panel)"
```

---

## Phase 6: Background Stub & Polish

### Task 17: Background service worker stub

**Files:**
- Modify: `entrypoints/background.ts`

**Step 1: Update the background script**

Update `entrypoints/background.ts`:

```typescript
export default defineBackground(() => {
  console.log('cream background service worker loaded');

  // Future: Background sync with Chrome alarms API
  // When ready, add 'alarms' permission to manifest and uncomment:
  //
  // chrome.alarms.create('daily-brief', { periodInMinutes: 60 });
  // chrome.alarms.onAlarm.addListener(async (alarm) => {
  //   if (alarm.name === 'daily-brief') {
  //     // Read tasks from localStorage (via message passing to newtab)
  //     // Call AI to generate ComputedView
  //     // Save to storage
  //   }
  // });
});
```

**Step 2: Commit**

```bash
git add entrypoints/background.ts
git commit -m "feat: stub background service worker with future sync documentation"
```

---

### Task 18: Extension icons and manifest polish

**Files:**
- Create: `public/icon-16.png`
- Create: `public/icon-48.png`
- Create: `public/icon-128.png`
- Modify: `wxt.config.ts`

**Step 1: Create placeholder icons**

For now, create simple placeholder SVG-based icons. Generate them using a canvas script or create simple colored squares:

```bash
# We'll use a simple approach -- create the icons directory and add a note
mkdir -p public
```

Create a simple script to generate placeholder icons, or use any 16x16, 48x48, and 128x128 PNG files. For development, the extension will work without custom icons (Chrome shows a default).

**Step 2: Polish the manifest**

Update `wxt.config.ts`:

```typescript
import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Cream',
    description: 'AI-powered task intelligence for your new tab',
    version: '0.1.0',
    permissions: ['storage'],
    icons: {
      16: 'icon-16.png',
      48: 'icon-48.png',
      128: 'icon-128.png',
    },
  },
});
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: polish manifest with version, description, and icon references"
```

---

### Task 19: End-to-end manual test

This is a manual verification task. No code changes.

**Step 1: Build the extension**

```bash
npm run build
```
Expected: Clean build with no errors. Output in `.output/` directory.

**Step 2: Load in Chrome**

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click "Load unpacked"
4. Select the `.output/chrome-mv3` directory
5. Open a new tab

**Step 3: Test the core flow**

1. See the greeting with correct time-of-day message
2. Type "finish API docs by friday" and press Enter
3. Task appears as a focus card (without AI: raw text as title; with AI key: parsed title + deadline)
4. Click "not today" to defer -- task moves to nudge section
5. Click settings gear, enter API key, save
6. Type another task -- should see "thinking..." then parsed result
7. Click "ask cream" -- chat panel opens, send "what should I focus on?"

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during end-to-end testing"
```

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1. Foundation | 1-3 | WXT project running with React, TypeScript, Tailwind, Vitest |
| 2. Data Layer | 4-7 | Types, date utils, storage, useTasks hook -- all tested |
| 3. UI Shell | 8-11 | Greeting, smart input, task cards, full layout assembled |
| 4. Settings | 12 | API key management with chrome.storage.local |
| 5. AI | 13-16 | OpenAI client, task parser, daily brief, chat panel -- fully wired |
| 6. Polish | 17-19 | Background stub, manifest, end-to-end verification |

**Total: 19 tasks.** Each task is independently committable and testable.
