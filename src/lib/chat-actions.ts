import type { ChatAction, Importance } from '../types';

const ACTIONS_REGEX = /\[ACTIONS\]\s*([\s\S]*?)\s*\[\/ACTIONS\]/;
const VALID_ACTIONS = ['create', 'complete', 'defer', 'update_importance', 'update_dependencies'] as const;
const VALID_IMPORTANCE = ['high', 'medium', 'low'] as const;

export function parseActionsBlock(rawResponse: string): { cleaned: string; actions: ChatAction[] } {
  const match = rawResponse.match(ACTIONS_REGEX);
  if (!match) return { cleaned: rawResponse, actions: [] };

  const cleaned = rawResponse.slice(0, match.index).trimEnd();
  let actions: ChatAction[] = [];

  try {
    const jsonStr = match[1].replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return { cleaned, actions: [] };

    actions = parsed
      .filter((item: unknown): item is Record<string, unknown> => {
        if (typeof item !== 'object' || item === null) return false;
        const obj = item as Record<string, unknown>;
        return VALID_ACTIONS.includes(obj.action as typeof VALID_ACTIONS[number]);
      })
      .map((item) => {
        const action = item.action as typeof VALID_ACTIONS[number];

        if (action === 'create') {
          const title = typeof item.title === 'string' ? item.title : '';
          if (!title) return null;
          const importance: Importance = VALID_IMPORTANCE.includes(item.importance as Importance) ? item.importance as Importance : 'medium';
          const deadline = typeof item.deadline === 'string' ? item.deadline : null;
          const tags = Array.isArray(item.tags) ? item.tags.filter((t: unknown) => typeof t === 'string') : [];
          return { action, title, deadline, importance, tags } as ChatAction;
        }

        if (action === 'complete' || action === 'defer') {
          const targetTaskId = typeof item.targetTaskId === 'string' ? item.targetTaskId : '';
          if (!targetTaskId) return null;
          return { action, targetTaskId } as ChatAction;
        }

        if (action === 'update_importance') {
          const targetTaskId = typeof item.targetTaskId === 'string' ? item.targetTaskId : '';
          const importance: Importance = VALID_IMPORTANCE.includes(item.importance as Importance) ? item.importance as Importance : 'medium';
          if (!targetTaskId) return null;
          return { action, targetTaskId, importance } as ChatAction;
        }

        if (action === 'update_dependencies') {
          const targetTaskId = typeof item.targetTaskId === 'string' ? item.targetTaskId : '';
          if (!targetTaskId) return null;
          const blocks = Array.isArray(item.blocks) ? item.blocks.filter((id: unknown) => typeof id === 'string') : [];
          const blockedBy = Array.isArray(item.blockedBy) ? item.blockedBy.filter((id: unknown) => typeof id === 'string') : [];
          return { action, targetTaskId, blocks, blockedBy } as ChatAction;
        }

        return null;
      })
      .filter((a): a is ChatAction => a !== null);
  } catch {
    // malformed JSON — return cleaned response with no actions
  }

  return { cleaned, actions };
}
