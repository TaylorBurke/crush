import { describe, it, expect } from 'vitest';
import { buildChatSystemPrompt } from '../lib/chat-prompt';

describe('chat-prompt', () => {
  it('includes the context block', () => {
    const result = buildChatSystemPrompt('Tasks:\n- Task A', 'gpt-4o', 'openai');
    expect(result).toContain('Task A');
  });

  it('includes model info', () => {
    const result = buildChatSystemPrompt('', 'gpt-4o', 'openai');
    expect(result).toContain('gpt-4o');
    expect(result).toContain('openai');
  });

  it('includes memory saving instructions', () => {
    const result = buildChatSystemPrompt('', 'gpt-4o', 'openai');
    expect(result).toContain('save_memory');
    expect(result).toContain('MEMORY SAVING');
  });

  it('includes action instructions', () => {
    const result = buildChatSystemPrompt('', 'gpt-4o', 'openai');
    expect(result).toContain('[ACTIONS]');
    expect(result).toContain('[RECOMPUTE');
    expect(result).toContain('estimatedEffort');
    expect(result).toContain('emotionalContext');
  });

  it('includes today date', () => {
    const result = buildChatSystemPrompt('', 'gpt-4o', 'openai');
    const year = new Date().getFullYear();
    expect(result).toContain(String(year));
  });
});
