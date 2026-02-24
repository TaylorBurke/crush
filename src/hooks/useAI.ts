import { useState, useCallback } from 'react';
import { callLLM, PROVIDER_CONFIG } from '../lib/ai-client';
import { buildParsePrompt, parseAIResponse } from '../lib/task-parser';
import { buildDailyBriefPrompt, parseBriefResponse } from '../lib/daily-brief';
import { ViewStorage, BriefStorage } from '../lib/storage';
import { today, isNewDay } from '../lib/date';
import { parseActionsBlock } from '../lib/chat-actions';
import type { Task, ComputedView, ChatMessage, ChatResult, Provider } from '../types';

export function useAI(apiKey: string, provider: Provider, model: string) {
  const [parsing, setParsing] = useState(false);
  const [briefing, setBriefing] = useState(false);
  const [chatting, setChatting] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

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

  const generateBrief = useCallback(async (tasks: Task[], force = false, chatContext?: string): Promise<ComputedView | null> => {
    if (!apiKey) return null;
    if (!force) {
      const lastDate = BriefStorage.getLastDate();
      if (!isNewDay(lastDate)) return ViewStorage.get();
    }
    setBriefing(true);
    try {
      const nonCompleted = tasks.filter((t) => t.status !== 'completed');
      if (nonCompleted.length === 0) return null;
      const messages = buildDailyBriefPrompt(tasks, chatContext);
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
    try {
      const taskSummary = tasks.filter((t) => t.status !== 'completed').map((t) => `- [${t.id}] "${t.parsed.title}" (${t.status}, importance: ${t.importance}${t.parsed.deadline ? `, deadline: ${t.parsed.deadline}` : ''})`).join('\n');
      const rawResponse = await callLLM({
        apiKey,
        provider,
        model,
        messages: [
          {
            role: 'system',
            content: `You are a warm, supportive task advisor named Crush. You help the user manage their tasks, prioritize, break down work, and stay motivated.\n\nToday's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.\n\nYou are powered by the model "${model || PROVIDER_CONFIG[provider].defaultModel}" via ${provider}. If the user asks what model you are, tell them.\n\nCurrent tasks:\n${taskSummary || '(none)'}\n\n${currentView ? `Today's focus: ${currentView.focusToday.join(', ')}` : ''}\n\nBe concise, casual, lowercase. Sound like a supportive friend, not a corporate tool.\n\n## TASK ACTIONS\n\nYou can take real actions on tasks by appending an [ACTIONS] block at the end of your response. The block contains a JSON array of operations.\n\nWhen to use [ACTIONS]:\n- User explicitly asks to create/add tasks (e.g. "add a task to buy groceries", "create three tasks for the project")\n- User asks to mark something as done/complete (e.g. "mark the pitch deck as done", "i finished the report")\n- User asks to defer/postpone a task (e.g. "push the taxes to next week", "defer the meeting prep")\n- User asks to change a task's priority/importance (e.g. "make the pitch deck high priority", "lower the importance of X")\n\nWhen NOT to use [ACTIONS]:\n- General questions about tasks ("what should I focus on?")\n- Motivation or encouragement\n- Breaking down tasks into steps (unless user says "add those as tasks")\n- Discussing strategy or priorities without explicit action request\n\nAction format — append this at the very end of your response:\n[ACTIONS]\n[\n  {"action":"create","title":"Task title","deadline":"YYYY-MM-DD or null","importance":"high|medium|low","tags":["tag1"]},\n  {"action":"complete","targetTaskId":"existing-task-id"},\n  {"action":"defer","targetTaskId":"existing-task-id"},\n  {"action":"update_importance","targetTaskId":"existing-task-id","importance":"high|medium|low"}\n]\n[/ACTIONS]\n\nImportance rules for new tasks:\n- HIGH: strong obligation, pressure, consequences, external accountability, time pressure, deadlines\n- MEDIUM: clear intent without urgency, standard professional tasks, self-driven deadlines\n- LOW: aspirational, optional, nice-to-haves, exploration, no pressure\n\nIMPORTANT: Use the task IDs from the list above for targetTaskId. Only target active or deferred tasks.\n\n## RECOMPUTE MARKER\n\nIf the conversation leads you to believe the user's task priorities, focus, or organization should change (e.g. they want to reprioritize, shift focus, reorganize their day, or mention something that affects task urgency), append the following marker at the very end of your response (after any [ACTIONS] block if present) on its own line:\n[RECOMPUTE: brief summary of what changed]\n\nExamples of when to use this:\n- "i want to focus on design stuff today" → [RECOMPUTE: user wants to focus on design-related tasks today]\n- "actually X is way more urgent than Y" → [RECOMPUTE: user indicated X is more urgent than Y]\n- "can you reorganize my day?" → [RECOMPUTE: user requested day reorganization]\n\nDo NOT use this marker for general questions, motivation, or task breakdowns that don't change priorities.`,
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
      return { response, recomputeContext, actions };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'something went wrong';
      const errorResponse: ChatMessage = { role: 'assistant', content: `sorry, I hit an error: ${errMsg}`, timestamp: new Date().toISOString() };
      setChatHistory((prev) => [...prev, errorResponse]);
      return { response: errorResponse.content, recomputeContext: null, actions: [] };
    } finally {
      setChatting(false);
    }
  }, [apiKey, chatHistory]);

  const clearChat = useCallback(() => { setChatHistory([]); }, []);

  return { parseTask, generateBrief, chat, clearChat, chatHistory, isParsing: parsing, isBriefing: briefing, isChatting: chatting };
}
