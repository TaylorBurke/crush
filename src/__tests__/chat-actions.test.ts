import { describe, it, expect } from 'vitest';
import { parseActionsBlock } from '../lib/chat-actions';

describe('chat-actions', () => {
  describe('parseActionsBlock', () => {
    it('returns original response when no actions block present', () => {
      const raw = 'sure, here are some tips for your tasks!';
      const { cleaned, actions } = parseActionsBlock(raw);
      expect(cleaned).toBe(raw);
      expect(actions).toEqual([]);
    });

    it('extracts create action from response', () => {
      const raw = `got it, adding that now!\n\n[ACTIONS]\n[{"action":"create","title":"Buy groceries","importance":"medium","tags":["errands"]}]\n[/ACTIONS]`;
      const { cleaned, actions } = parseActionsBlock(raw);
      expect(cleaned).toBe('got it, adding that now!');
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual({ action: 'create', title: 'Buy groceries', importance: 'medium', deadline: null, tags: ['errands'], estimatedEffort: null, emotionalContext: null, clusterId: null });
    });

    it('extracts complete action', () => {
      const raw = `nice work!\n\n[ACTIONS]\n[{"action":"complete","targetTaskId":"abc-123"}]\n[/ACTIONS]`;
      const { cleaned, actions } = parseActionsBlock(raw);
      expect(cleaned).toBe('nice work!');
      expect(actions).toEqual([{ action: 'complete', targetTaskId: 'abc-123' }]);
    });

    it('extracts defer action', () => {
      const raw = `no worries, pushed it back.\n\n[ACTIONS]\n[{"action":"defer","targetTaskId":"def-456"}]\n[/ACTIONS]`;
      const { cleaned, actions } = parseActionsBlock(raw);
      expect(cleaned).toBe('no worries, pushed it back.');
      expect(actions).toEqual([{ action: 'defer', targetTaskId: 'def-456' }]);
    });

    it('extracts update_importance action', () => {
      const raw = `done, bumped it up.\n\n[ACTIONS]\n[{"action":"update_importance","targetTaskId":"xyz-789","importance":"high"}]\n[/ACTIONS]`;
      const { cleaned, actions } = parseActionsBlock(raw);
      expect(cleaned).toBe('done, bumped it up.');
      expect(actions).toEqual([{ action: 'update_importance', targetTaskId: 'xyz-789', importance: 'high' }]);
    });

    it('handles multiple actions in one block', () => {
      const raw = `sure thing! added those for you.\n\n[ACTIONS]\n[\n  {"action":"create","title":"Finish pitch deck","deadline":"2026-02-28","importance":"high","tags":["work"]},\n  {"action":"create","title":"Review mockups","importance":"medium"},\n  {"action":"complete","targetTaskId":"abc-123"}\n]\n[/ACTIONS]`;
      const { cleaned, actions } = parseActionsBlock(raw);
      expect(cleaned).toBe('sure thing! added those for you.');
      expect(actions).toHaveLength(3);
      expect(actions[0].action).toBe('create');
      expect(actions[1].action).toBe('create');
      expect(actions[2].action).toBe('complete');
    });

    it('returns empty actions for malformed JSON', () => {
      const raw = `ok!\n\n[ACTIONS]\nnot valid json\n[/ACTIONS]`;
      const { cleaned, actions } = parseActionsBlock(raw);
      expect(cleaned).toBe('ok!');
      expect(actions).toEqual([]);
    });

    it('filters out invalid action types', () => {
      const raw = `done.\n\n[ACTIONS]\n[{"action":"delete","targetTaskId":"abc"},{"action":"create","title":"Valid task","importance":"medium"}]\n[/ACTIONS]`;
      const { cleaned, actions } = parseActionsBlock(raw);
      expect(cleaned).toBe('done.');
      expect(actions).toHaveLength(1);
      expect(actions[0].action).toBe('create');
    });

    it('filters out create actions with missing title', () => {
      const raw = `ok!\n\n[ACTIONS]\n[{"action":"create","importance":"high"}]\n[/ACTIONS]`;
      const { cleaned, actions } = parseActionsBlock(raw);
      expect(cleaned).toBe('ok!');
      expect(actions).toEqual([]);
    });

    it('filters out complete/defer actions with missing targetTaskId', () => {
      const raw = `ok!\n\n[ACTIONS]\n[{"action":"complete"},{"action":"defer"}]\n[/ACTIONS]`;
      const { cleaned, actions } = parseActionsBlock(raw);
      expect(cleaned).toBe('ok!');
      expect(actions).toEqual([]);
    });

    it('defaults importance to medium for invalid values', () => {
      const raw = `added!\n\n[ACTIONS]\n[{"action":"create","title":"Test task","importance":"critical"}]\n[/ACTIONS]`;
      const { cleaned, actions } = parseActionsBlock(raw);
      expect(cleaned).toBe('added!');
      expect(actions).toHaveLength(1);
      if (actions[0].action === 'create') {
        expect(actions[0].importance).toBe('medium');
      }
    });

    it('handles create action with deadline', () => {
      const raw = `on it!\n\n[ACTIONS]\n[{"action":"create","title":"Submit report","deadline":"2026-03-01","importance":"high"}]\n[/ACTIONS]`;
      const { actions } = parseActionsBlock(raw);
      expect(actions).toHaveLength(1);
      if (actions[0].action === 'create') {
        expect(actions[0].deadline).toBe('2026-03-01');
      }
    });

    it('handles create action without optional fields', () => {
      const raw = `done!\n\n[ACTIONS]\n[{"action":"create","title":"Quick task","importance":"low"}]\n[/ACTIONS]`;
      const { actions } = parseActionsBlock(raw);
      expect(actions).toHaveLength(1);
      if (actions[0].action === 'create') {
        expect(actions[0].deadline).toBeNull();
        expect(actions[0].tags).toEqual([]);
      }
    });

    it('returns empty actions when parsed JSON is not an array', () => {
      const raw = `ok!\n\n[ACTIONS]\n{"action":"create","title":"Not an array","importance":"medium"}\n[/ACTIONS]`;
      const { cleaned, actions } = parseActionsBlock(raw);
      expect(cleaned).toBe('ok!');
      expect(actions).toEqual([]);
    });

    it('handles non-string tags gracefully', () => {
      const raw = `ok!\n\n[ACTIONS]\n[{"action":"create","title":"Test","importance":"medium","tags":[1, true, "valid"]}]\n[/ACTIONS]`;
      const { actions } = parseActionsBlock(raw);
      expect(actions).toHaveLength(1);
      if (actions[0].action === 'create') {
        expect(actions[0].tags).toEqual(['valid']);
      }
    });

    it('extracts update_dependencies action', () => {
      const raw = `linked those up!\n\n[ACTIONS]\n[{"action":"update_dependencies","targetTaskId":"task-1","blocks":["task-2"],"blockedBy":["task-3"]}]\n[/ACTIONS]`;
      const { cleaned, actions } = parseActionsBlock(raw);
      expect(cleaned).toBe('linked those up!');
      expect(actions).toEqual([{ action: 'update_dependencies', targetTaskId: 'task-1', blocks: ['task-2'], blockedBy: ['task-3'] }]);
    });

    it('defaults update_dependencies arrays to empty when missing', () => {
      const raw = `done!\n\n[ACTIONS]\n[{"action":"update_dependencies","targetTaskId":"task-1"}]\n[/ACTIONS]`;
      const { actions } = parseActionsBlock(raw);
      expect(actions).toHaveLength(1);
      if (actions[0].action === 'update_dependencies') {
        expect(actions[0].blocks).toEqual([]);
        expect(actions[0].blockedBy).toEqual([]);
      }
    });

    it('filters out update_dependencies with missing targetTaskId', () => {
      const raw = `ok!\n\n[ACTIONS]\n[{"action":"update_dependencies","blocks":["task-2"]}]\n[/ACTIONS]`;
      const { actions } = parseActionsBlock(raw);
      expect(actions).toEqual([]);
    });

    it('filters non-string IDs from update_dependencies arrays', () => {
      const raw = `done!\n\n[ACTIONS]\n[{"action":"update_dependencies","targetTaskId":"task-1","blocks":[123,"task-2",null],"blockedBy":["task-3",true]}]\n[/ACTIONS]`;
      const { actions } = parseActionsBlock(raw);
      expect(actions).toHaveLength(1);
      if (actions[0].action === 'update_dependencies') {
        expect(actions[0].blocks).toEqual(['task-2']);
        expect(actions[0].blockedBy).toEqual(['task-3']);
      }
    });
  });
});
