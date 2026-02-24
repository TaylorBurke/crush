import { describe, it, expect } from 'vitest';
import { parseMemoryBlocks } from '../lib/memory-parser';

describe('memory-parser', () => {
  it('returns original text when no memory blocks present', () => {
    const { cleaned, memories } = parseMemoryBlocks('just a normal response');
    expect(cleaned).toBe('just a normal response');
    expect(memories).toEqual([]);
  });

  it('extracts a single memory block', () => {
    const text = `here's my response\n\n[MEMORY]\n{"type":"observation","content":"User prefers mornings"}\n[/MEMORY]`;
    const { cleaned, memories } = parseMemoryBlocks(text);
    expect(cleaned).toBe("here's my response");
    expect(memories).toHaveLength(1);
    expect(memories[0].type).toBe('observation');
    expect(memories[0].content).toBe('User prefers mornings');
  });

  it('extracts multiple memory blocks', () => {
    const text = `response\n[MEMORY]\n{"type":"observation","content":"Likes tea"}\n[/MEMORY]\nmore text\n[MEMORY]\n{"type":"rule","content":"Always high priority for design"}\n[/MEMORY]`;
    const { cleaned, memories } = parseMemoryBlocks(text);
    expect(memories).toHaveLength(2);
    expect(memories[0].content).toBe('Likes tea');
    expect(memories[1].type).toBe('rule');
    expect(memories[1].content).toBe('Always high priority for design');
    expect(cleaned).not.toContain('[MEMORY]');
  });

  it('extracts array of memories from a single block', () => {
    const text = `response\n[MEMORY]\n[{"type":"observation","content":"Morning person"},{"type":"rule","content":"Design is high priority"}]\n[/MEMORY]`;
    const { cleaned, memories } = parseMemoryBlocks(text);
    expect(memories).toHaveLength(2);
    expect(memories[0].content).toBe('Morning person');
    expect(memories[1].content).toBe('Design is high priority');
    expect(cleaned).toBe('response');
  });

  it('handles malformed JSON gracefully', () => {
    const text = `response\n[MEMORY]\nnot valid json\n[/MEMORY]`;
    const { cleaned, memories } = parseMemoryBlocks(text);
    expect(cleaned).toBe('response');
    expect(memories).toEqual([]);
  });

  it('defaults type to observation when invalid', () => {
    const text = `[MEMORY]\n{"type":"invalid","content":"Some memory"}\n[/MEMORY]`;
    const { memories } = parseMemoryBlocks(text);
    expect(memories).toHaveLength(1);
    expect(memories[0].type).toBe('observation');
  });

  it('skips entries with empty content', () => {
    const text = `[MEMORY]\n{"type":"observation","content":""}\n[/MEMORY]`;
    const { memories } = parseMemoryBlocks(text);
    expect(memories).toEqual([]);
  });
});
