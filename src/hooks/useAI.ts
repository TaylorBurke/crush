import { useState, useCallback } from 'react';
import { callLLM, PROVIDER_CONFIG } from '../lib/ai-client';
import { buildParsePrompt, parseAIResponse } from '../lib/task-parser';
import { buildDailyBriefPrompt, parseBriefResponse } from '../lib/daily-brief';
import { ViewStorage, BriefStorage, ChatStorage } from '../lib/storage';
import { today, isNewDay } from '../lib/date';
import { parseActionsBlock } from '../lib/chat-actions';
import type { Task, ComputedView, ChatMessage, ChatResult, Provider } from '../types';

export function useAI(apiKey: string, provider: Provider, model: string) {
  const [parsing, setParsing] = useState(false);
  const [briefing, setBriefing] = useState(false);
  const [chatting, setChatting] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => ChatStorage.getToday());

  const parseTask = useCallback(async (rawText: string, existingTasks: Pick<Task, 'id' | 'parsed' | 'status'>[]) => {
    if (!apiKey) {
      return { title: rawText, deadline: null, importance: 'medium' as const, tags: [] as string[], blocks: [] as string[], blockedBy: [] as string[], cluster: null, action: 'create' as const, targetTaskId: null };
    }
    setParsing(true);
    try {
      const messages = buildParsePrompt(rawText, existingTasks);
      const response = await callLLM({ apiKey, provider, model, messages, responseFormat: { type: 'json_object' } });
      return parseAIResponse(response);
    } catch (error) {
      console.error('AI parse failed, using raw text:', error);
      return { title: rawText, deadline: null, importance: 'medium' as const, tags: [] as string[], blocks: [] as string[], blockedBy: [] as string[], cluster: null, action: 'create' as const, targetTaskId: null };
    } finally {
      setParsing(false);
    }
  }, [apiKey]);

  const generateBrief = useCallback(async (tasks: Task[], force = false, chatContext?: string, recentChat?: ChatMessage[]): Promise<ComputedView | null> => {
    if (!apiKey) return null;
    if (!force) {
      const lastDate = BriefStorage.getLastDate();
      if (!isNewDay(lastDate)) return ViewStorage.get();
    }
    setBriefing(true);
    try {
      const nonCompleted = tasks.filter((t) => t.status !== 'completed');
      if (nonCompleted.length === 0) return null;
      const messages = buildDailyBriefPrompt(tasks, chatContext, recentChat);
      const response = await callLLM({ apiKey, provider, model, messages, responseFormat: { type: 'json_object' } });
      const view = parseBriefResponse(response);
      ViewStorage.save(view);
      BriefStorage.setLastDate(today());
      return view;
    } catch (error) {
      console.error('Daily brief generation failed:', error);
      return ViewStorage.get();
    } finally {
      setBriefing(false);
    }
  }, [apiKey]);

  const chat = useCallback(async (userMessage: string, tasks: Task[], currentView: ComputedView | null): Promise<ChatResult> => {
    setChatting(true);
    const newUserMsg: ChatMessage = { role: 'user', content: userMessage, timestamp: new Date().toISOString() };
    setChatHistory((prev) => [...prev, newUserMsg]);
    ChatStorage.saveMessage(newUserMsg);
    try {
      const nonCompleted = tasks.filter((t) => t.status !== 'completed');
      const taskSummary = nonCompleted.map((t) => {
        const parts = [`${t.status}`, `importance: ${t.importance}`];
        if (t.parsed.deadline) parts.push(`deadline: ${t.parsed.deadline}`);
        if (t.parsed.tags.length) parts.push(`tags: ${t.parsed.tags.join(', ')}`);
        if (t.deferrals > 0) parts.push(`deferred ${t.deferrals}x`);
        if (t.relationships.blocks.length) parts.push(`blocks: ${t.relationships.blocks.join(', ')}`);
        if (t.relationships.blockedBy.length) parts.push(`blockedBy: ${t.relationships.blockedBy.join(', ')}`);
        if (t.relationships.cluster) parts.push(`cluster: ${t.relationships.cluster}`);
        parts.push(`created: ${t.createdAt.split('T')[0]}`);
        return `- [${t.id}] "${t.parsed.title}" (${parts.join(', ')})`;
      }).join('\n');

      let viewContext = '';
      if (currentView) {
        const focusNames = currentView.focusToday.map((id) => {
          const t = tasks.find((tk) => tk.id === id);
          return t ? `"${t.parsed.title}" [${id}]` : id;
        });
        viewContext += `\n\nToday's focus: ${focusNames.join(', ')}`;

        if (currentView.nudges.length > 0) {
          viewContext += `\n\nNudges (deferred tasks surfaced today):\n${currentView.nudges.map((n) => `- ${n.message} [${n.taskId}]`).join('\n')}`;
        }

        const scores = Object.entries(currentView.urgencyScores);
        if (scores.length > 0) {
          const topScores = scores.sort(([, a], [, b]) => b.score - a.score).slice(0, 6);
          viewContext += `\n\nUrgency scores (higher = more urgent):\n${topScores.map(([id, s]) => {
            const t = tasks.find((tk) => tk.id === id);
            return `- ${t ? `"${t.parsed.title}"` : id}: ${s.score}/100 (${s.reasons.join(', ')})`;
          }).join('\n')}`;
        }

        if (currentView.clusters.length > 0) {
          viewContext += `\n\nTask clusters:\n${currentView.clusters.map((c) => `- "${c.name}" (${c.taskIds.length} tasks, ${Math.round(c.progress * 100)}% done)`).join('\n')}`;
        }
      }
      const rawResponse = await callLLM({
        apiKey,
        provider,
        model,
        messages: [
          {
            role: 'system',
            content: `You are a warm, supportive task advisor named Crush. You help the user manage their tasks, prioritize, break down work, and stay motivated.\n\nToday's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.\n\nYou are powered by the model "${model || PROVIDER_CONFIG[provider].defaultModel}" via ${provider}. If the user asks what model you are, tell them.\n\nCurrent tasks:\n${taskSummary || '(none)'}${viewContext}\n\nUse the full task context above — tags, deadlines, urgency scores, clusters, dependencies, and deferral history — to inform your advice and actions. For example, if a task has been deferred multiple times, gently flag that. If a task is blocking others, prioritize it. If urgency scores are high, reflect that in your tone.\n\nBe concise, casual, lowercase. Sound like a supportive friend, not a corporate tool.\n\n## TASK ACTIONS\n\nYou can take real actions on tasks by appending an [ACTIONS] block at the end of your response. The block contains a JSON array of operations.\n\nWhen to use [ACTIONS]:\n- User explicitly asks to create/add tasks (e.g. "add a task to buy groceries", "create three tasks for the project")\n- User asks to mark something as done/complete (e.g. "mark the pitch deck as done", "i finished the report")\n- User asks to defer/postpone a task (e.g. "push the taxes to next week", "defer the meeting prep")\n- User asks to change a task's priority/importance (e.g. "make the pitch deck high priority", "lower the importance of X")\n- User asks to set or change task dependencies (e.g. "the API task blocks the frontend task", "mark X as blocked by Y")\n\nWhen NOT to use [ACTIONS]:\n- General questions about tasks ("what should I focus on?")\n- Motivation or encouragement\n- Breaking down tasks into steps (unless user says "add those as tasks")\n- Discussing strategy or priorities without explicit action request\n\nAction format — append this at the very end of your response:\n[ACTIONS]\n[\n  {"action":"create","title":"Task title","deadline":"YYYY-MM-DD or null","importance":"high|medium|low","tags":["tag1"]},\n  {"action":"complete","targetTaskId":"existing-task-id"},\n  {"action":"defer","targetTaskId":"existing-task-id"},\n  {"action":"update_importance","targetTaskId":"existing-task-id","importance":"high|medium|low"},\n  {"action":"update_dependencies","targetTaskId":"existing-task-id","blocks":["task-id"],"blockedBy":["task-id"]}\n]\n[/ACTIONS]\n\nImportance rules for new tasks:\n- HIGH: strong obligation, pressure, consequences, external accountability, time pressure, deadlines\n- MEDIUM: clear intent without urgency, standard professional tasks, self-driven deadlines\n- LOW: aspirational, optional, nice-to-haves, exploration, no pressure\n\nIMPORTANT: Use the task IDs from the list above for targetTaskId. Only target active or deferred tasks.\n\n## RECOMPUTE MARKER\n\nIf the conversation leads you to believe the user's task priorities, focus, or organization should change (e.g. they want to reprioritize, shift focus, reorganize their day, or mention something that affects task urgency), append the following marker at the very end of your response (after any [ACTIONS] block if present) on its own line:\n[RECOMPUTE: brief summary of what changed]\n\nExamples of when to use this:\n- "i want to focus on design stuff today" → [RECOMPUTE: user wants to focus on design-related tasks today]\n- "actually X is way more urgent than Y" → [RECOMPUTE: user indicated X is more urgent than Y]\n- "can you reorganize my day?" → [RECOMPUTE: user requested day reorganization]\n\nDo NOT use this marker for general questions, motivation, or task breakdowns that don't change priorities.`,
          },
          ...chatHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user' as const, content: userMessage },
        ],
      });

      // Parse [ACTIONS] block first (it appears before [RECOMPUTE] in the raw response)
      const { cleaned: afterActions, actions } = parseActionsBlock(rawResponse);

      // Then parse [RECOMPUTE] marker from the remaining text
      const recomputeMatch = afterActions.match(/\[RECOMPUTE:\s*(.+?)\]\s*$/);
      const recomputeContext = recomputeMatch ? recomputeMatch[1] : null;
      const response = recomputeMatch ? afterActions.slice(0, recomputeMatch.index).trimEnd() : afterActions;

      const assistantMsg: ChatMessage = { role: 'assistant', content: response, timestamp: new Date().toISOString() };
      setChatHistory((prev) => [...prev, assistantMsg]);
      ChatStorage.saveMessage(assistantMsg);
      return { response, recomputeContext, actions };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'something went wrong';
      const errorResponse: ChatMessage = { role: 'assistant', content: `sorry, I hit an error: ${errMsg}`, timestamp: new Date().toISOString() };
      setChatHistory((prev) => [...prev, errorResponse]);
      ChatStorage.saveMessage(errorResponse);
      return { response: errorResponse.content, recomputeContext: null, actions: [] };
    } finally {
      setChatting(false);
    }
  }, [apiKey, chatHistory]);

  const generateGreeting = useCallback(async (tasks: Task[], view: ComputedView, recentChat?: ChatMessage[]): Promise<string | null> => {
    if (!apiKey) return null;
    try {
      const focusNames = view.focusToday.map((id) => {
        const t = tasks.find((tk) => tk.id === id);
        return t ? t.parsed.title : null;
      }).filter(Boolean);

      const nudgeMessages = view.nudges.map((n) => n.message);

      const topUrgent = Object.entries(view.urgencyScores)
        .sort(([, a], [, b]) => b.score - a.score)
        .slice(0, 3)
        .map(([id, s]) => {
          const t = tasks.find((tk) => tk.id === id);
          return t ? `${t.parsed.title} (${Math.round(s.score * 100)}/100)` : null;
        })
        .filter(Boolean);

      const clusterSummary = view.clusters.map((c) => `${c.name}: ${Math.round(c.progress * 100)}% done`);

      const greeting = await callLLM({
        apiKey,
        provider,
        model,
        messages: [
          {
            role: 'system',
            content: `You are Crush, a warm and supportive task advisor. Write a brief daily check-in message for the user based on today's computed brief.\n\nToday is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.\n\nStyle: concise, casual, lowercase. Sound like a supportive friend. 2-4 short sentences max. Mention the top focus tasks by name. If there are nudges or high-urgency items, weave them in naturally. End with something inviting like "let me know if you want to shuffle things around" or "what do you think?"\n\nDo NOT use [ACTIONS] or [RECOMPUTE] markers in this message.`,
          },
          {
            role: 'user',
            content: `Today's brief:\n- Focus tasks: ${focusNames.join(', ') || 'none set'}\n- Nudges: ${nudgeMessages.join('; ') || 'none'}\n- Top urgency: ${topUrgent.join(', ') || 'nothing pressing'}\n- Clusters: ${clusterSummary.join(', ') || 'none'}\n- Total active tasks: ${tasks.filter((t) => t.status === 'active').length}${recentChat && recentChat.length > 0 ? `\n\nRecent conversations:\n${recentChat.slice(-10).map((m) => `${m.role}: ${m.content}`).join('\n')}` : ''}`,
          },
        ],
      });

      const assistantMsg: ChatMessage = { role: 'assistant', content: greeting, timestamp: new Date().toISOString() };
      setChatHistory((prev) => [...prev, assistantMsg]);
      ChatStorage.saveMessage(assistantMsg);
      return greeting;
    } catch (error) {
      console.error('Greeting generation failed:', error);
      return null;
    }
  }, [apiKey]);

  const clearChat = useCallback(() => { setChatHistory([]); }, []);

  return { parseTask, generateBrief, generateGreeting, chat, clearChat, chatHistory, isParsing: parsing, isBriefing: briefing, isChatting: chatting };
}
