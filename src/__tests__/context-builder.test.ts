import { describe, it, expect, beforeEach } from 'vitest';
import {
  renderTaskList,
  renderClusters,
  renderMemories,
  renderProfile,
  renderReflection,
  renderViewSummary,
  buildParserContext,
  buildBriefContext,
  buildChatContext,
  buildGreetingContext,
} from '../lib/context-builder';
import type { Task, ComputedView, PersistentCluster, Memory, UserProfile, DailyReflection, ContextSnapshot, ChatMessage } from '../types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'test-1', text: 'test', parsed: { title: 'Test Task', deadline: null, tags: [] },
    importance: 'medium', relationships: { blocks: [], blockedBy: [], clusterId: null },
    status: 'active', deferrals: 0, createdAt: '2026-02-21T10:00:00Z',
    completedAt: null, lastSurfacedAt: null,
    estimatedEffort: null, emotionalContext: null, creationContext: null,
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<ContextSnapshot> = {}): ContextSnapshot {
  return {
    tasks: [makeTask()],
    view: null,
    clusters: [],
    memories: [],
    profile: null,
    reflection: null,
    recentChat: [],
    userName: 'Test User',
    today: '2026-02-24',
    dayOfWeek: 'monday',
    timeOfDay: 'morning',
    ...overrides,
  };
}

describe('context-builder', () => {
  beforeEach(() => { localStorage.clear(); });

  describe('renderTaskList', () => {
    it('returns "(no tasks)" for empty array', () => {
      expect(renderTaskList([], 'full')).toBe('(no tasks)');
    });

    it('renders minimal level with just id, title, status, importance', () => {
      const result = renderTaskList([makeTask()], 'minimal');
      expect(result).toContain('[test-1]');
      expect(result).toContain('Test Task');
      expect(result).toContain('active');
      expect(result).toContain('medium');
      expect(result).not.toContain('created:');
    });

    it('renders standard level with more detail', () => {
      const task = makeTask({ parsed: { title: 'Test', deadline: '2026-03-01', tags: ['work'] }, deferrals: 2 });
      const result = renderTaskList([task], 'standard');
      expect(result).toContain('deadline: 2026-03-01');
      expect(result).toContain('deferrals: 2');
    });

    it('renders full level with effort, emotion, tags, created', () => {
      const task = makeTask({
        estimatedEffort: 'deep', emotionalContext: 'dreading', creationContext: 'morning',
        parsed: { title: 'Big Task', deadline: null, tags: ['work', 'important'] },
      });
      const result = renderTaskList([task], 'full');
      expect(result).toContain('effort: deep');
      expect(result).toContain('emotion: dreading');
      expect(result).toContain('tags: [work, important]');
      expect(result).toContain('created: 2026-02-21');
    });
  });

  describe('renderClusters', () => {
    it('returns empty string for no clusters', () => {
      expect(renderClusters([])).toBe('');
    });

    it('renders cluster names and ids', () => {
      const clusters: PersistentCluster[] = [
        { id: 'c1', name: 'Work', description: '', createdAt: '', archivedAt: null },
      ];
      const result = renderClusters(clusters);
      expect(result).toContain('Work');
      expect(result).toContain('c1');
    });
  });

  describe('renderMemories', () => {
    it('returns empty string for no memories', () => {
      expect(renderMemories([])).toBe('');
    });

    it('renders memories sorted by confidence', () => {
      const memories: Memory[] = [
        { id: 'm1', type: 'observation', content: 'Low memory', source: 'chat', confidence: 0.3, createdAt: '', lastReferencedAt: '' },
        { id: 'm2', type: 'rule', content: 'High memory', source: 'explicit', confidence: 0.9, createdAt: '', lastReferencedAt: '' },
      ];
      const result = renderMemories(memories);
      expect(result.indexOf('High memory')).toBeLessThan(result.indexOf('Low memory'));
    });

    it('respects maxCount', () => {
      const memories: Memory[] = Array.from({ length: 30 }, (_, i) => ({
        id: `m${i}`, type: 'observation' as const, content: `Memory ${i}`, source: 'chat' as const, confidence: 0.5, createdAt: '', lastReferencedAt: '',
      }));
      const result = renderMemories(memories, 5);
      const lines = result.split('\n').filter((l) => l.startsWith('-'));
      expect(lines).toHaveLength(5);
    });
  });

  describe('renderProfile', () => {
    it('returns empty string for null profile', () => {
      expect(renderProfile(null)).toBe('');
    });

    it('renders profile stats', () => {
      const profile: UserProfile = {
        completionsByDay: {}, completionsByTime: { morning: 10, afternoon: 5, evening: 2, night: 0 },
        deferralsByDay: {}, deferralsByTime: { morning: 0, afternoon: 0, evening: 0, night: 0 },
        creationsByTime: { morning: 0, afternoon: 0, evening: 0, night: 0 },
        currentStreak: 3, longestStreak: 7, lastActiveDate: '2026-02-24',
        totalCompleted: 17, totalDeferred: 5, totalCreated: 25,
      };
      const result = renderProfile(profile);
      expect(result).toContain('17 completed');
      expect(result).toContain('Current streak: 3 days');
      expect(result).toContain('Longest streak: 7 days');
      expect(result).toContain('Peak productivity: morning');
    });
  });

  describe('renderReflection', () => {
    it('returns empty string for null reflection', () => {
      expect(renderReflection(null)).toBe('');
    });

    it('renders reflection details', () => {
      const reflection: DailyReflection = {
        date: '2026-02-23', tasksCompleted: 5, tasksDeferred: 2,
        focusTasksHit: 3, focusTasksTotal: 4,
        topCompletedTitles: ['Task A'], topDeferredTitles: ['Task B'],
      };
      const result = renderReflection(reflection);
      expect(result).toContain('5 completed');
      expect(result).toContain('3/4 hit');
      expect(result).toContain('Task A');
      expect(result).toContain('Task B');
    });
  });

  describe('renderViewSummary', () => {
    it('returns empty string for null view', () => {
      expect(renderViewSummary(null, [])).toBe('');
    });

    it('renders focus tasks, nudges, urgency, clusters', () => {
      const task = makeTask({ id: 't1', parsed: { title: 'Focus Task', deadline: null, tags: [] } });
      const view: ComputedView = {
        generatedAt: '', focusToday: ['t1'],
        nudges: [{ taskId: 't1', message: 'hey, this is overdue' }],
        urgencyScores: { t1: { score: 0.9, reasons: ['deadline'] } },
        clusters: [{ id: 'c1', name: 'Work', taskIds: ['t1'], progress: 0.5 }],
      };
      const result = renderViewSummary(view, [task]);
      expect(result).toContain('Focus Task');
      expect(result).toContain('hey, this is overdue');
      expect(result).toContain('0.9/1.0');
      expect(result).toContain('50% done');
    });
  });

  describe('buildParserContext', () => {
    it('includes task list', () => {
      const result = buildParserContext(makeSnapshot());
      expect(result).toContain('Test Task');
    });

    it('includes cluster names when present', () => {
      const result = buildParserContext(makeSnapshot({
        clusters: [{ id: 'c1', name: 'Work', description: '', createdAt: '', archivedAt: null }],
      }));
      expect(result).toContain('Work');
      expect(result).toContain('Map to existing clusters');
    });

    it('includes focus tasks when present', () => {
      const task = makeTask({ id: 't1', parsed: { title: 'Focus Task', deadline: null, tags: [] } });
      const result = buildParserContext(makeSnapshot({
        tasks: [task],
        view: { generatedAt: '', focusToday: ['t1'], nudges: [], urgencyScores: {}, clusters: [] },
      }));
      expect(result).toContain('Focus Task');
      expect(result).toContain('Inherit urgency');
    });

    it('includes high-confidence memories', () => {
      const result = buildParserContext(makeSnapshot({
        memories: [{ id: 'm1', type: 'rule', content: 'User prefers mornings', source: 'chat', confidence: 0.8, createdAt: '', lastReferencedAt: '' }],
      }));
      expect(result).toContain('User prefers mornings');
    });

    it('excludes low-confidence memories', () => {
      const result = buildParserContext(makeSnapshot({
        memories: [{ id: 'm1', type: 'observation', content: 'Low confidence', source: 'chat', confidence: 0.2, createdAt: '', lastReferencedAt: '' }],
      }));
      expect(result).not.toContain('Low confidence');
    });
  });

  describe('buildBriefContext', () => {
    it('includes full task list', () => {
      const result = buildBriefContext(makeSnapshot());
      expect(result).toContain('Test Task');
    });

    it('includes recent chat', () => {
      const chat: ChatMessage[] = [{ role: 'user', content: 'What should I focus on?', timestamp: '' }];
      const result = buildBriefContext(makeSnapshot({ recentChat: chat }));
      expect(result).toContain('What should I focus on?');
    });
  });

  describe('buildChatContext', () => {
    it('excludes completed tasks', () => {
      const tasks = [
        makeTask({ id: 't1', parsed: { title: 'Active', deadline: null, tags: [] } }),
        makeTask({ id: 't2', parsed: { title: 'Done', deadline: null, tags: [] }, status: 'completed' }),
      ];
      const result = buildChatContext(makeSnapshot({ tasks }));
      expect(result).toContain('Active');
      expect(result).not.toContain('Done');
    });
  });

  describe('buildGreetingContext', () => {
    it('includes view summary and profile', () => {
      const task = makeTask({ id: 't1' });
      const view: ComputedView = { generatedAt: '', focusToday: ['t1'], nudges: [], urgencyScores: {}, clusters: [] };
      const profile: UserProfile = {
        completionsByDay: {}, completionsByTime: { morning: 5, afternoon: 0, evening: 0, night: 0 },
        deferralsByDay: {}, deferralsByTime: { morning: 0, afternoon: 0, evening: 0, night: 0 },
        creationsByTime: { morning: 0, afternoon: 0, evening: 0, night: 0 },
        currentStreak: 2, longestStreak: 5, lastActiveDate: '2026-02-24',
        totalCompleted: 5, totalDeferred: 1, totalCreated: 10,
      };
      const result = buildGreetingContext(makeSnapshot({ tasks: [task], view, profile }));
      expect(result).toContain('Test Task');
      expect(result).toContain('Current streak: 2 days');
    });

    it('includes recent chat snippet', () => {
      const chat: ChatMessage[] = [{ role: 'user', content: 'Hey there', timestamp: '' }];
      const result = buildGreetingContext(makeSnapshot({ recentChat: chat }));
      expect(result).toContain('Hey there');
    });
  });
});
