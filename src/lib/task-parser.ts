import type { Task, Importance, TaskAction } from '../types';

interface ParsedTaskFields {
  title: string;
  deadline: string | null;
  importance: Importance;
  tags: string[];
  blocks: string[];
  blockedBy: string[];
  cluster: string | null;
  action: TaskAction;
  targetTaskId: string | null;
}

interface Message { role: 'system' | 'user'; content: string; }

export function buildParsePrompt(rawText: string, existingTasks: Pick<Task, 'id' | 'parsed' | 'status'>[]): Message[] {
  const taskList = existingTasks.length > 0
    ? existingTasks.map((t) => `- [${t.id}] ${t.parsed.title} (${t.status})`).join('\n')
    : '(none)';
  const today = new Date().toISOString().split('T')[0];

  return [
    {
      role: 'system',
      content: `You are a task parser. Given raw text from a user, extract structured task data.
Today's date is ${today}.

Respond with JSON only (no markdown, no explanation):
{
  "action": "create" | "complete" | "defer",
  "targetTaskId": "existing-task-id or null",
  "title": "Clean, concise task title",
  "deadline": "YYYY-MM-DD or null",
  "importance": "high" | "medium" | "low",
  "tags": ["tag1", "tag2"],
  "blocks": ["task-id-1"],
  "blockedBy": ["task-id-2"],
  "cluster": "thematic-group-name or null"
}

Rules:
- "action": Determine the user's intent:
  "complete": user says they finished/done something matching an existing task (e.g. "I finished the pitch deck", "done with taxes", "completed the report").
  "defer": user is pushing something off (e.g. "not today", "defer the pitch deck", "push to tomorrow").
  "create": new task (default when no existing task matches).
  Only match against active or deferred tasks, not already-completed ones.
  When in doubt, default to "create".
- "targetTaskId": When action is "complete" or "defer", set this to the ID of the matching existing task. Set to null for "create".
- "title": Rewrite as a clear, actionable title. Capitalize first word.
- "deadline": Parse relative dates (e.g., "friday" = next friday, "tomorrow", "next week"). Use null if no deadline mentioned.
- "importance": Infer from the emotional weight and intent of the user's language, not just keywords.
  HIGH signals: strong obligation or pressure ("I need to", "I have to", "must", "can't forget", "critical", "urgent", "ASAP", "boss wants", "deadline", "launch", "blocking"), consequences if not done, external accountability, time pressure.
  MEDIUM signals: clear intent without urgency ("I should", "going to", "need to get around to", "plan to", "working on"), standard professional tasks, self-driven deadlines.
  LOW signals: aspirational or optional ("I would like to", "it'd be nice to", "maybe I should", "someday", "when I get a chance", "might", "could"), exploration, nice-to-haves, no pressure.
  Pay close attention to hedging language, modal verbs, and tone. "I really need to" is stronger than "I need to" which is stronger than "I should probably". Default to medium only when there are no linguistic cues either way.
- "tags": Infer 1-3 short tags from context.
- "blocks"/"blockedBy": Match against existing tasks by semantic similarity. Only use IDs from the existing task list. Use empty arrays if no relationships detected.
- "cluster": If this task relates thematically to existing tasks, suggest a cluster name. Otherwise null.`,
    },
    { role: 'user', content: `Raw input: "${rawText}"\n\nExisting tasks:\n${taskList}` },
  ];
}

export function parseAIResponse(responseText: string): ParsedTaskFields {
  try {
    const data = JSON.parse(responseText);
    const action: TaskAction = (['create', 'complete', 'defer'].includes(data.action) ? data.action : 'create') as TaskAction;
    const targetTaskId: string | null = data.targetTaskId || null;

    // If action is complete/defer but targetTaskId is missing, fall back to create
    const finalAction = (action === 'complete' || action === 'defer') && !targetTaskId ? 'create' : action;

    return {
      title: data.title || responseText,
      deadline: data.deadline || null,
      importance: (['high', 'medium', 'low'].includes(data.importance) ? data.importance : 'medium') as Importance,
      tags: Array.isArray(data.tags) ? data.tags : [],
      blocks: Array.isArray(data.blocks) ? data.blocks : [],
      blockedBy: Array.isArray(data.blockedBy) ? data.blockedBy : [],
      cluster: data.cluster || null,
      action: finalAction,
      targetTaskId: finalAction === 'create' ? null : targetTaskId,
    };
  } catch {
    return { title: responseText, deadline: null, importance: 'medium', tags: [], blocks: [], blockedBy: [], cluster: null, action: 'create', targetTaskId: null };
  }
}
