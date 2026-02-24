import { describe, it, expect } from 'vitest';
import { buildParsePrompt, parseAIResponse } from '../lib/task-parser';

describe('task-parser', () => {
  describe('buildParsePrompt', () => {
    it('includes the raw text in the user message', () => {
      const messages = buildParsePrompt('finish API docs by friday', '');
      const userMsg = messages.find((m) => m.role === 'user');
      expect(userMsg?.content).toContain('finish API docs by friday');
    });

    it('includes context block in system message', () => {
      const contextBlock = 'Existing tasks:\n- [t1] Design schema (active)';
      const messages = buildParsePrompt('finish API docs', contextBlock);
      const sysMsg = messages.find((m) => m.role === 'system');
      expect(sysMsg?.content).toContain('Design schema');
    });

    it('includes today date in system message', () => {
      const messages = buildParsePrompt('test', '');
      const sysMsg = messages.find((m) => m.role === 'system');
      const today = new Date().toISOString().split('T')[0];
      expect(sysMsg?.content).toContain(today);
    });

    it('includes empty context block gracefully', () => {
      const messages = buildParsePrompt('test', '');
      const sysMsg = messages.find((m) => m.role === 'system');
      expect(sysMsg?.content).toBeTruthy();
    });

    it('includes task IDs from context block', () => {
      const contextBlock = 'Existing tasks:\n- [abc-123] Some task (active)';
      const messages = buildParsePrompt('test', contextBlock);
      const sysMsg = messages.find((m) => m.role === 'system');
      expect(sysMsg?.content).toContain('[abc-123]');
    });

    it('includes task status from context block', () => {
      const contextBlock = 'Existing tasks:\n- [t1] Some task (deferred)';
      const messages = buildParsePrompt('test', contextBlock);
      const sysMsg = messages.find((m) => m.role === 'system');
      expect(sysMsg?.content).toContain('(deferred)');
    });

    it('includes action instructions in system message', () => {
      const messages = buildParsePrompt('test', '');
      const sysMsg = messages.find((m) => m.role === 'system');
      expect(sysMsg?.content).toContain('"action"');
      expect(sysMsg?.content).toContain('"targetTaskId"');
      expect(sysMsg?.content).toContain('"complete"');
      expect(sysMsg?.content).toContain('"defer"');
    });

    it('includes estimatedEffort and emotionalContext instructions', () => {
      const messages = buildParsePrompt('test', '');
      const sysMsg = messages.find((m) => m.role === 'system');
      expect(sysMsg?.content).toContain('"estimatedEffort"');
      expect(sysMsg?.content).toContain('"emotionalContext"');
    });
  });

  describe('parseAIResponse', () => {
    it('parses valid JSON response into task fields', () => {
      const json = JSON.stringify({ action: 'create', targetTaskId: null, title: 'Finish API docs', deadline: '2026-02-27', importance: 'high', tags: ['work', 'api'], blockedBy: ['t1'], blocks: [], cluster: 'api-project', estimatedEffort: 'deep', emotionalContext: 'neutral' });
      const result = parseAIResponse(json);
      expect(result.title).toBe('Finish API docs');
      expect(result.deadline).toBe('2026-02-27');
      expect(result.importance).toBe('high');
      expect(result.blockedBy).toEqual(['t1']);
      expect(result.cluster).toBe('api-project');
      expect(result.estimatedEffort).toBe('deep');
      expect(result.emotionalContext).toBe('neutral');
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
      expect(result.estimatedEffort).toBeNull();
      expect(result.emotionalContext).toBeNull();
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

    it('defaults invalid estimatedEffort to null', () => {
      const json = JSON.stringify({ title: 'Test', estimatedEffort: 'huge' });
      const result = parseAIResponse(json);
      expect(result.estimatedEffort).toBeNull();
    });

    it('defaults invalid emotionalContext to null', () => {
      const json = JSON.stringify({ title: 'Test', emotionalContext: 'angry' });
      const result = parseAIResponse(json);
      expect(result.emotionalContext).toBeNull();
    });
  });
});
