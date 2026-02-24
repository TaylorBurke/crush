import { describe, it, expect } from 'vitest';
import { buildDailyBriefPrompt, parseBriefResponse } from '../lib/daily-brief';
import type { Task, ChatMessage } from '../types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'test-1', text: 'test', parsed: { title: 'Test', deadline: null, tags: [] },
    importance: 'medium', relationships: { blocks: [], blockedBy: [], cluster: null },
    status: 'active', deferrals: 0, createdAt: '2026-02-21T10:00:00Z',
    completedAt: null, lastSurfacedAt: null, ...overrides,
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

    it('includes task IDs in the prompt', () => {
      const tasks = [makeTask({ id: 'xyz-123' })];
      const messages = buildDailyBriefPrompt(tasks);
      const userMsg = messages.find((m) => m.role === 'user');
      expect(userMsg?.content).toContain('[xyz-123]');
    });

    it('includes deadline info when present', () => {
      const tasks = [makeTask({ parsed: { title: 'Deadline task', deadline: '2026-03-01', tags: [] } })];
      const messages = buildDailyBriefPrompt(tasks);
      const userMsg = messages.find((m) => m.role === 'user');
      expect(userMsg?.content).toContain('deadline: 2026-03-01');
    });

    it('includes deferral count when non-zero', () => {
      const tasks = [makeTask({ deferrals: 3 })];
      const messages = buildDailyBriefPrompt(tasks);
      const userMsg = messages.find((m) => m.role === 'user');
      expect(userMsg?.content).toContain('deferrals: 3');
    });

    it('includes blocking relationships', () => {
      const tasks = [makeTask({ relationships: { blocks: ['t2'], blockedBy: ['t0'], cluster: 'proj' } })];
      const messages = buildDailyBriefPrompt(tasks);
      const userMsg = messages.find((m) => m.role === 'user');
      expect(userMsg?.content).toContain('blocks: [t2]');
      expect(userMsg?.content).toContain('blockedBy: [t0]');
      expect(userMsg?.content).toContain('cluster: proj');
    });

    it('includes today date and day of week in system message', () => {
      const tasks = [makeTask()];
      const messages = buildDailyBriefPrompt(tasks);
      const sysMsg = messages.find((m) => m.role === 'system');
      const today = new Date().toISOString().split('T')[0];
      expect(sysMsg?.content).toContain(today);
    });

    it('includes recent chat context when provided', () => {
      const tasks = [makeTask()];
      const recentChat: ChatMessage[] = [
        { role: 'user', content: 'I want to focus on design this week', timestamp: '2026-02-22T14:00:00Z' },
        { role: 'assistant', content: 'Got it, shifting focus to design tasks.', timestamp: '2026-02-22T14:00:05Z' },
      ];
      const messages = buildDailyBriefPrompt(tasks, undefined, recentChat);
      const sysMsg = messages.find((m) => m.role === 'system');
      expect(sysMsg?.content).toContain('Recent conversations');
      expect(sysMsg?.content).toContain('I want to focus on design this week');
    });

    it('omits recent chat section when recentChat is empty', () => {
      const tasks = [makeTask()];
      const messages = buildDailyBriefPrompt(tasks, undefined, []);
      const sysMsg = messages.find((m) => m.role === 'system');
      expect(sysMsg?.content).not.toContain('Recent conversations');
    });

    it('truncates recent chat to last 20 messages', () => {
      const tasks = [makeTask()];
      const recentChat: ChatMessage[] = Array.from({ length: 30 }, (_, i) => ({
        role: 'user' as const,
        content: `message ${i}`,
        timestamp: '2026-02-23T10:00:00Z',
      }));
      const messages = buildDailyBriefPrompt(tasks, undefined, recentChat);
      const sysMsg = messages.find((m) => m.role === 'system');
      expect(sysMsg?.content).toContain('message 10');
      expect(sysMsg?.content).toContain('message 29');
      expect(sysMsg?.content).not.toContain('message 9');
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
      expect(result.nudges[0].message).toBe('hey, this is old');
      expect(result.urgencyScores['a'].score).toBe(0.8);
      expect(result.clusters[0].name).toBe('project x');
      expect(result.generatedAt).toBeTruthy();
    });

    it('returns empty defaults on parse failure', () => {
      const result = parseBriefResponse('bad json');
      expect(result.focusToday).toEqual([]);
      expect(result.nudges).toEqual([]);
      expect(result.urgencyScores).toEqual({});
      expect(result.clusters).toEqual([]);
      expect(result.generatedAt).toBeTruthy();
    });

    it('handles missing fields gracefully', () => {
      const json = JSON.stringify({ focusToday: ['a'] });
      const result = parseBriefResponse(json);
      expect(result.focusToday).toEqual(['a']);
      expect(result.nudges).toEqual([]);
      expect(result.urgencyScores).toEqual({});
      expect(result.clusters).toEqual([]);
    });

    it('handles non-array focusToday', () => {
      const json = JSON.stringify({ focusToday: 'not-an-array' });
      const result = parseBriefResponse(json);
      expect(result.focusToday).toEqual([]);
    });

    it('handles non-object urgencyScores', () => {
      const json = JSON.stringify({ urgencyScores: 'not-an-object' });
      const result = parseBriefResponse(json);
      expect(result.urgencyScores).toEqual({});
    });
  });
});
