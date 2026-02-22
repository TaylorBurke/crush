import { useState, useCallback } from 'react';
import { callOpenAI } from '../lib/ai-client';
import { buildParsePrompt, parseAIResponse } from '../lib/task-parser';
import { buildDailyBriefPrompt, parseBriefResponse } from '../lib/daily-brief';
import { ViewStorage, BriefStorage } from '../lib/storage';
import { today, isNewDay } from '../lib/date';
import type { Task, ComputedView, ChatMessage } from '../types';

export function useAI(apiKey: string) {
  const [parsing, setParsing] = useState(false);
  const [briefing, setBriefing] = useState(false);
  const [chatting, setChatting] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const parseTask = useCallback(async (rawText: string, existingTasks: Pick<Task, 'id' | 'parsed'>[]) => {
    if (!apiKey) {
      return { title: rawText, deadline: null, importance: 'medium' as const, tags: [] as string[], blocks: [] as string[], blockedBy: [] as string[], cluster: null };
    }
    setParsing(true);
    try {
      const messages = buildParsePrompt(rawText, existingTasks);
      const response = await callOpenAI({ apiKey, messages, responseFormat: { type: 'json_object' } });
      return parseAIResponse(response);
    } catch (error) {
      console.error('AI parse failed, using raw text:', error);
      return { title: rawText, deadline: null, importance: 'medium' as const, tags: [] as string[], blocks: [] as string[], blockedBy: [] as string[], cluster: null };
    } finally {
      setParsing(false);
    }
  }, [apiKey]);

  const generateBrief = useCallback(async (tasks: Task[]): Promise<ComputedView | null> => {
    if (!apiKey) return null;
    const lastDate = BriefStorage.getLastDate();
    if (!isNewDay(lastDate)) return ViewStorage.get();
    setBriefing(true);
    try {
      const nonCompleted = tasks.filter((t) => t.status !== 'completed');
      if (nonCompleted.length === 0) return null;
      const messages = buildDailyBriefPrompt(tasks);
      const response = await callOpenAI({ apiKey, messages, responseFormat: { type: 'json_object' } });
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

  const chat = useCallback(async (userMessage: string, tasks: Task[], currentView: ComputedView | null): Promise<string> => {
    setChatting(true);
    const newUserMsg: ChatMessage = { role: 'user', content: userMessage, timestamp: new Date().toISOString() };
    setChatHistory((prev) => [...prev, newUserMsg]);
    try {
      const taskSummary = tasks.filter((t) => t.status !== 'completed').map((t) => `- "${t.parsed.title}" (${t.status}, importance: ${t.importance})`).join('\n');
      const response = await callOpenAI({
        apiKey,
        messages: [
          {
            role: 'system',
            content: `You are a warm, supportive task advisor named Crush. You help the user manage their tasks, prioritize, break down work, and stay motivated.\n\nCurrent tasks:\n${taskSummary}\n\n${currentView ? `Today's focus: ${currentView.focusToday.join(', ')}` : ''}\n\nBe concise, casual, lowercase. Sound like a supportive friend, not a corporate tool.`,
          },
          ...chatHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user' as const, content: userMessage },
        ],
      });
      const assistantMsg: ChatMessage = { role: 'assistant', content: response, timestamp: new Date().toISOString() };
      setChatHistory((prev) => [...prev, assistantMsg]);
      return response;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'something went wrong';
      const errorResponse: ChatMessage = { role: 'assistant', content: `sorry, I hit an error: ${errMsg}`, timestamp: new Date().toISOString() };
      setChatHistory((prev) => [...prev, errorResponse]);
      return errorResponse.content;
    } finally {
      setChatting(false);
    }
  }, [apiKey, chatHistory]);

  const clearChat = useCallback(() => { setChatHistory([]); }, []);

  return { parseTask, generateBrief, chat, clearChat, chatHistory, isParsing: parsing, isBriefing: briefing, isChatting: chatting };
}
