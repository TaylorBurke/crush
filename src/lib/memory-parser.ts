interface ParsedMemory {
  type: 'observation' | 'rule';
  content: string;
}

const MEMORY_REGEX = /\[MEMORY\]\s*([\s\S]*?)\s*\[\/MEMORY\]/g;

export function parseMemoryBlocks(text: string): { cleaned: string; memories: ParsedMemory[] } {
  const memories: ParsedMemory[] = [];
  const cleaned = text.replace(MEMORY_REGEX, (match, inner: string) => {
    try {
      const trimmed = inner.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item.content === 'string' && item.content.trim()) {
            memories.push({
              type: item.type === 'rule' ? 'rule' : 'observation',
              content: item.content.trim(),
            });
          }
        }
      } else if (parsed && typeof parsed.content === 'string' && parsed.content.trim()) {
        memories.push({
          type: parsed.type === 'rule' ? 'rule' : 'observation',
          content: parsed.content.trim(),
        });
      }
    } catch {
      // Malformed JSON — skip
    }
    return '';
  }).trim();

  return { cleaned, memories };
}
