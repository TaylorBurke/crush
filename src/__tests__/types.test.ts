import { describe, it, expect } from 'vitest';
import type { Task, ComputedView, TaskStatus, Importance, Provider, Settings } from '../types';

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

  it('should accept valid Provider values', () => {
    const p1: Provider = 'openai';
    const p2: Provider = 'openrouter';
    expect(p1).toBe('openai');
    expect(p2).toBe('openrouter');
  });

  it('should create Settings with provider and model', () => {
    const s: Settings = {
      provider: 'openrouter',
      apiKey: 'sk-or-test',
      model: 'anthropic/claude-haiku-4-5',
      userName: 'Taylor',
    };
    expect(s.provider).toBe('openrouter');
    expect(s.model).toBe('anthropic/claude-haiku-4-5');
  });
});
