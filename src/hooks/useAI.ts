import { useState, useCallback } from 'react';
import { callLLM } from '../lib/ai-client';
import { buildParsePrompt, parseAIResponse } from '../lib/task-parser';
import { buildDailyBriefPrompt, parseBriefResponse } from '../lib/daily-brief';
import { ViewStorage, BriefStorage, ChatStorage } from '../lib/storage';
import { today, isNewDay } from '../lib/date';
import { parseActionsBlock } from '../lib/chat-actions';
import { buildChatSystemPrompt } from '../lib/chat-prompt';
import { buildGreetingPrompt } from '../lib/greeting-prompt';
import { buildBriefContext, buildChatContext, buildGreetingContext } from '../lib/context-builder';
import type { Task, ComputedView, ChatMessage, ChatResult, Provider, ContextSnapshot } from '../types';

export function useAI(apiKey: string, provider: Provider, model: string) {
  const [parsing, setParsing] = useState(false);
  const [briefing, setBriefing] = useState(false);
  const [chatting, setChatting] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => ChatStorage.getToday());

  const parseTask = useCallback(async (rawText: string, contextBlock: string) => {
    if (!apiKey) {
      return { title: rawText, deadline: null, importance: 'medium' as const, tags: [] as string[], blocks: [] as string[], blockedBy: [] as string[], cluster: null, estimatedEffort: null, emotionalContext: null, action: 'create' as const, targetTaskId: null };
    }
    setParsing(true);
    try {
      const messages = buildParsePrompt(rawText, contextBlock);
      const response = await callLLM({ apiKey, provider, model, messages, responseFormat: { type: 'json_object' } });
      return parseAIResponse(response);
    } catch (error) {
      console.error('AI parse failed, using raw text:', error);
      return { title: rawText, deadline: null, importance: 'medium' as const, tags: [] as string[], blocks: [] as string[], blockedBy: [] as string[], cluster: null, estimatedEffort: null, emotionalContext: null, action: 'create' as const, targetTaskId: null };
    } finally {
      setParsing(false);
    }
  }, [apiKey]);

  const generateBrief = useCallback(async (snapshot: ContextSnapshot, force = false, chatContext?: string): Promise<ComputedView | null> => {
    if (!apiKey) return null;
    if (!force) {
      const lastDate = BriefStorage.getLastDate();
      if (!isNewDay(lastDate)) return ViewStorage.get();
    }
    setBriefing(true);
    try {
      const nonCompleted = snapshot.tasks.filter((t) => t.status !== 'completed');
      if (nonCompleted.length === 0) return null;
      const contextBlock = buildBriefContext(snapshot);
      const messages = buildDailyBriefPrompt(snapshot.tasks, chatContext ? `${chatContext}\n\n${contextBlock}` : contextBlock);
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

  const chat = useCallback(async (userMessage: string, snapshot: ContextSnapshot): Promise<ChatResult> => {
    setChatting(true);
    const newUserMsg: ChatMessage = { role: 'user', content: userMessage, timestamp: new Date().toISOString() };
    setChatHistory((prev) => [...prev, newUserMsg]);
    ChatStorage.saveMessage(newUserMsg);
    try {
      const contextBlock = buildChatContext(snapshot);
      const systemPrompt = buildChatSystemPrompt(contextBlock, model, provider);

      const rawResponse = await callLLM({
        apiKey,
        provider,
        model,
        messages: [
          { role: 'system', content: systemPrompt },
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

  const generateGreeting = useCallback(async (snapshot: ContextSnapshot): Promise<string | null> => {
    if (!apiKey) return null;
    try {
      const contextBlock = buildGreetingContext(snapshot);
      const messages = buildGreetingPrompt(contextBlock);

      const greeting = await callLLM({ apiKey, provider, model, messages });

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
