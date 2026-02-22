import { describe, it, expect } from 'vitest';
import { buildParsePrompt, parseAIResponse } from '../lib/task-parser';

describe('task-parser', () => {
  describe('buildParsePrompt', () => {
    it('includes the raw text in the user message', () => {
      const messages = buildParsePrompt('finish API docs by friday', []);
      const userMsg = messages.find((m) => m.role === 'user');
      expect(userMsg?.content).toContain('finish API docs by friday');
    });

    it('includes existing task titles for relationship matching', () => {
      const existing = [{ id: 't1', parsed: { title: 'Design schema', deadline: null, tags: [] as string[] }, status: 'active' as const }];
      const messages = buildParsePrompt('finish API docs', existing);
      const userMsg = messages.find((m) => m.role === 'user');
      expect(userMsg?.content).toContain('Design schema');
    });

    it('includes today date in system message', () => {
      const messages = buildParsePrompt('test', []);
      const sysMsg = messages.find((m) => m.role === 'system');
      const today = new Date().toISOString().split('T')[0];
      expect(sysMsg?.content).toContain(today);
    });

    it('shows (none) when no existing tasks', () => {
      const messages = buildParsePrompt('test', []);
      const userMsg = messages.find((m) => m.role === 'user');
      expect(userMsg?.content).toContain('(none)');
    });

    it('includes task IDs in the existing task list', () => {
      const existing = [{ id: 'abc-123', parsed: { title: 'Some task', deadline: null, tags: [] as string[] }, status: 'active' as const }];
      const messages = buildParsePrompt('test', existing);
      const userMsg = messages.find((m) => m.role === 'user');
      expect(userMsg?.content).toContain('[abc-123]');
    });

    it('includes task status in the existing task list', () => {
      const existing = [{ id: 't1', parsed: { title: 'Some task', deadline: null, tags: [] as string[] }, status: 'deferred' as const }];
      const messages = buildParsePrompt('test', existing);
      const userMsg = messages.find((m) => m.role === 'user');
      expect(userMsg?.content).toContain('(deferred)');
    });

    it('includes action instructions in system message', () => {
      const messages = buildParsePrompt('test', []);
      const sysMsg = messages.find((m) => m.role === 'system');
      expect(sysMsg?.content).toContain('"action"');
      expect(sysMsg?.content).toContain('"targetTaskId"');
      expect(sysMsg?.content).toContain('"complete"');
      expect(sysMsg?.content).toContain('"defer"');
    });
  });

  describe('parseAIResponse', () => {
    it('parses valid JSON response into task fields', () => {
      const json = JSON.stringify({ action: 'create', targetTaskId: null, title: 'Finish API docs', deadline: '2026-02-27', importance: 'high', tags: ['work', 'api'], blockedBy: ['t1'], blocks: [], cluster: 'api-project' });
      const result = parseAIResponse(json);
      expect(result.title).toBe('Finish API docs');
      expect(result.deadline).toBe('2026-02-27');
      expect(result.importance).toBe('high');
      expect(result.blockedBy).toEqual(['t1']);
      expect(result.cluster).toBe('api-project');
      expect(result.action).toBe('create');
      expect(result.targetTaskId).toBeNull();
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
      expect(result.action).toBe('create');
      expect(result.targetTaskId).toBeNull();
    });

    it('falls back to raw text if JSON parsing fails', () => {
      const result = parseAIResponse('not valid json');
      expect(result.title).toBe('not valid json');
      expect(result.importance).toBe('medium');
      expect(result.action).toBe('create');
      expect(result.targetTaskId).toBeNull();
    });

    it('defaults invalid importance to medium', () => {
      const json = JSON.stringify({ title: 'Test', importance: 'critical' });
      const result = parseAIResponse(json);
      expect(result.importance).toBe('medium');
    });

    it('handles non-array tags gracefully', () => {
      const json = JSON.stringify({ title: 'Test', tags: 'not-an-array' });
      const result = parseAIResponse(json);
      expect(result.tags).toEqual([]);
    });

    it('parses complete action with targetTaskId', () => {
      const json = JSON.stringify({ action: 'complete', targetTaskId: 'task-1', title: 'Finish pitch deck' });
      const result = parseAIResponse(json);
      expect(result.action).toBe('complete');
      expect(result.targetTaskId).toBe('task-1');
    });

    it('parses defer action with targetTaskId', () => {
      const json = JSON.stringify({ action: 'defer', targetTaskId: 'task-2', title: 'Defer taxes' });
      const result = parseAIResponse(json);
      expect(result.action).toBe('defer');
      expect(result.targetTaskId).toBe('task-2');
    });

    it('falls back to create when action is complete but targetTaskId is missing', () => {
      const json = JSON.stringify({ action: 'complete', targetTaskId: null, title: 'Some task' });
      const result = parseAIResponse(json);
      expect(result.action).toBe('create');
      expect(result.targetTaskId).toBeNull();
    });

    it('falls back to create when action is defer but targetTaskId is missing', () => {
      const json = JSON.stringify({ action: 'defer', title: 'Some task' });
      const result = parseAIResponse(json);
      expect(result.action).toBe('create');
      expect(result.targetTaskId).toBeNull();
    });

    it('defaults invalid action to create', () => {
      const json = JSON.stringify({ action: 'delete', title: 'Test' });
      const result = parseAIResponse(json);
      expect(result.action).toBe('create');
    });
  });
});
