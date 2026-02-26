import type { Task, ComputedView } from '../types';

interface Message { role: 'system' | 'user'; content: string; }

export function buildDailyBriefPrompt(tasks: Task[], contextBlock?: string, chatContext?: string): Message[] {
  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const taskSummary = tasks.map((t) => {
    const parts = [
      `[${t.id}] "${t.parsed.title}"`,
      `status: ${t.status}`,
      `importance: ${t.importance}`,
      t.parsed.deadline ? `deadline: ${t.parsed.deadline}` : null,
      t.deferrals > 0 ? `deferrals: ${t.deferrals}` : null,
      t.relationships.blocks.length > 0 ? `blocks: [${t.relationships.blocks.join(', ')}]` : null,
      t.relationships.blockedBy.length > 0 ? `blockedBy: [${t.relationships.blockedBy.join(', ')}]` : null,
      t.relationships.clusterId ? `clusterId: ${t.relationships.clusterId}` : null,
      t.estimatedEffort ? `effort: ${t.estimatedEffort}` : null,
      t.emotionalContext ? `emotion: ${t.emotionalContext}` : null,
      `created: ${t.createdAt.split('T')[0]}`,
    ].filter(Boolean);
    return parts.join(' | ');
  }).join('\n');

  return [
    {
      role: 'system',
      content: `You are a warm, supportive task advisor. Analyze the user's task list and generate a daily brief.

Today is ${dayOfWeek}, ${today}.

Respond with JSON only:
{
  "focusToday": ["id1", "id2"],
  "nudges": [{"taskId": "id", "message": "warm, personal nudge message"}],
  "urgencyScores": {"id": {"score": 0.0-1.0, "reasons": ["reason"]}},
  "clusters": [{"id": "cluster-id", "name": "cluster name", "taskIds": ["id"], "progress": 0.0-1.0}]
}

Rules for focusToday (pick 2-6 tasks, preferring 2-4):
- Pick 2-4 tasks normally. Expand to 5-6 ONLY when additional tasks have high urgency (tight deadlines, high importance, or user-indicated urgency language like "urgent", "critical", "ASAP", "extremely important", "right now")
- Prioritize by: deadline proximity, importance, blocking impact
- Treat strong urgency language in task titles/text as a direct signal — if the user says something is critical or urgent, it should almost certainly be in focus
- Mix in one quick win if available
- Only pick from active or deferred tasks

Rules for nudges:
- Target deferred tasks and stale active tasks (>7 days old)
- Tone: warm, casual, lowercase, like a supportive friend
- Max 3 nudges

Rules for urgencyScores (for all non-completed tasks):
- Score 0.0-1.0 based on deadline proximity, importance propagation, deferral count, staleness
- If a task blocks an important task, it inherits urgency

Rules for clusters:
- Group by cluster field. Progress = completed / total in cluster${chatContext ? `\n\nIMPORTANT user context from conversation:\n${chatContext}` : ''}`,
    },
    { role: 'user', content: `Here are all my tasks:\n\n${taskSummary}${contextBlock ? `\n\n--- Additional context ---\n${contextBlock}` : ''}` },
  ];
}

export function parseBriefResponse(responseText: string): ComputedView {
  try {
    // Strip markdown code block wrapper if present (some models ignore response_format)
    const cleaned = responseText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const data = JSON.parse(cleaned);
    return {
      generatedAt: new Date().toISOString(),
      focusToday: Array.isArray(data.focusToday) ? data.focusToday : [],
      nudges: Array.isArray(data.nudges) ? data.nudges : [],
      urgencyScores: data.urgencyScores && typeof data.urgencyScores === 'object' ? data.urgencyScores : {},
      clusters: Array.isArray(data.clusters) ? data.clusters : [],
    };
  } catch {
    return { generatedAt: new Date().toISOString(), focusToday: [], nudges: [], urgencyScores: {}, clusters: [] };
  }
}
