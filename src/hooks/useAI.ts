import { useState, useCallback } from 'react';
import { callLLM } from '../lib/ai-client';
import { buildParsePrompt, parseAIResponse } from '../lib/task-parser';
import { buildDailyBriefPrompt, parseBriefResponse } from '../lib/daily-brief';
import { ViewStorage, BriefStorage } from '../lib/storage';
import { today, isNewDay } from '../lib/date';
import type { Task, ComputedView, ChatMessage, Provider } from '../types';

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

  const chat = useCallback(async (userMessage: string, tasks: Task[], currentView: ComputedView | null): Promise<{ response: string; recomputeContext: string | null }> => {
    setChatting(true);
    const newUserMsg: ChatMessage = { role: 'user', content: userMessage, timestamp: new Date().toISOString() };
    setChatHistory((prev) => [...prev, newUserMsg]);
    try {
      const taskSummary = tasks.filter((t) => t.status !== 'completed').map((t) => `- "${t.parsed.title}" (${t.status}, importance: ${t.importance})`).join('\n');
      const rawResponse = await callLLM({
        apiKey,
        provider,
        model,
        messages: [
          {
            role: 'system',
            content: `You are a warm, supportive task advisor named Crush. You help the user manage their tasks, prioritize, break down work, and stay motivated.\n\nCurrent tasks:\n${taskSummary}\n\n${currentView ? `Today's focus: ${currentView.focusToday.join(', ')}` : ''}\n\nBe concise, casual, lowercase. Sound like a supportive friend, not a corporate tool.\n\nIMPORTANT: If the conversation leads you to believe the user's task priorities, focus, or organization should change (e.g. they want to reprioritize, shift focus, reorganize their day, or mention something that affects task urgency), append the following marker at the very end of your response on its own line:\n[RECOMPUTE: brief summary of what changed]\n\nExamples of when to use this:\n- "i want to focus on design stuff today" → [RECOMPUTE: user wants to focus on design-related tasks today]\n- "actually X is way more urgent than Y" → [RECOMPUTE: user indicated X is more urgent than Y]\n- "can you reorganize my day?" → [RECOMPUTE: user requested day reorganization]\n\nDo NOT use this marker for general questions, motivation, or task breakdowns that don't change priorities.`,
          },
          ...chatHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user' as const, content: userMessage },
        ],
      });

      const recomputeMatch = rawResponse.match(/\[RECOMPUTE:\s*(.+?)\]\s*$/);
      const recomputeContext = recomputeMatch ? recomputeMatch[1] : null;
      const response = recomputeMatch ? rawResponse.slice(0, recomputeMatch.index).trimEnd() : rawResponse;

      const assistantMsg: ChatMessage = { role: 'assistant', content: response, timestamp: new Date().toISOString() };
      setChatHistory((prev) => [...prev, assistantMsg]);
      return { response, recomputeContext };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'something went wrong';
      const errorResponse: ChatMessage = { role: 'assistant', content: `sorry, I hit an error: ${errMsg}`, timestamp: new Date().toISOString() };
      setChatHistory((prev) => [...prev, errorResponse]);
      return { response: errorResponse.content, recomputeContext: null };
    } finally {
      setChatting(false);
    }
  }, [apiKey, chatHistory]);

  const clearChat = useCallback(() => { setChatHistory([]); }, []);

  return { parseTask, generateBrief, chat, clearChat, chatHistory, isParsing: parsing, isBriefing: briefing, isChatting: chatting };
}
