import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTasks } from '../../src/hooks/useTasks';
import { useSettings } from '../../src/hooks/useSettings';
import { useAI } from '../../src/hooks/useAI';
import { ViewStorage, TaskStorage, ChatStorage, BriefStorage, MemoryStorage, ClusterStorage, ReflectionStorage, runMigrations } from '../../src/lib/storage';
import { isNewDay } from '../../src/lib/date';
import { buildContextSnapshot, buildParserContext } from '../../src/lib/context-builder';
import { buildDailyReflection } from '../../src/lib/reflection';
import { parseMemoryBlocks } from '../../src/lib/memory-parser';
import { Greeting } from './components/Greeting';
import { SmartInput } from './components/SmartInput';
import { FocusCards } from './components/FocusCards';
import { NudgeSection } from './components/NudgeSection';
import { ClusterSection } from './components/ClusterSection';
import { SomedayBucket } from './components/SomedayBucket';
import { AIChatPanel } from './components/AIChatPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { BookmarkBar } from './components/BookmarkBar';
import { applyTheme } from '../../src/lib/themes';
import type { ComputedView, EffortLevel } from '../../src/types';

export default function App() {
  const { tasks, activeTasks, deferredTasks, somedayTasks, addTask, completeTask, deferTask, updateTask } = useTasks();
  const { settings, updateSettings, hasApiKey } = useSettings();
  const ai = useAI(settings.apiKey, settings.provider, settings.model);
  const { addSystemMessage } = ai;
  const [computedView, setComputedView] = useState<ComputedView | null>(() => ViewStorage.get());
  const [chatOpen, setChatOpen] = useState(false);
  const [highlightedTaskIds, setHighlightedTaskIds] = useState<Set<string>>(new Set());
  const [dismissingTaskIds, setDismissingTaskIds] = useState<Set<string>>(new Set());
  const [deferringTaskIds, setDeferringTaskIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{ message: string } | null>(null);
  const greetedRef = useRef(false);
  const migratedRef = useRef(false);

  const clearHighlight = useCallback((id: string) => {
    setHighlightedTaskIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const animatedComplete = useCallback((id: string) => {
    const task = tasks.find((t) => t.id === id);
    setDismissingTaskIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      completeTask(id);
      setDismissingTaskIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      if (task) addSystemMessage(`Task "${task.parsed.title}" was marked complete.`);
    }, 400);
  }, [completeTask, tasks, addSystemMessage]);

  const animatedDefer = useCallback((id: string) => {
    const task = tasks.find((t) => t.id === id);
    setDeferringTaskIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      deferTask(id);
      setDeferringTaskIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      if (task) addSystemMessage(`Task "${task.parsed.title}" was deferred.`);
    }, 350);
  }, [deferTask, tasks, addSystemMessage]);

  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(settings.theme, isDark);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => applyTheme(settings.theme, e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings.theme]);

  // Run migrations once on mount
  useEffect(() => {
    if (!migratedRef.current) {
      migratedRef.current = true;
      runMigrations();
    }
  }, []);

  useEffect(() => {
    if (hasApiKey && tasks.length > 0) {
      TaskStorage.purgeCompleted();
      ChatStorage.purgeOld();
      const freshDay = isNewDay(BriefStorage.getLastDate());
      if (freshDay) {
        // Day boundary maintenance
        ChatStorage.clearToday();
        ai.clearChat();
        MemoryStorage.decayConfidence();
        ClusterStorage.purgeArchived();

        // Build yesterday's reflection
        const previousView = ViewStorage.get();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const reflection = buildDailyReflection(tasks, previousView, yesterdayStr);
        ReflectionStorage.save(reflection);
      }

      const snapshot = buildContextSnapshot(tasks, computedView, ChatStorage.getRecent(2), settings.userName);
      ai.generateBrief(snapshot, false).then(async (view) => {
        if (!view) return;
        setComputedView(view);
        setChatOpen(true);
        // Generate daily greeting on first fresh brief of the day
        if (!greetedRef.current && freshDay) {
          greetedRef.current = true;
          const greetingSnapshot = buildContextSnapshot(tasks, view, ChatStorage.getRecent(2), settings.userName);
          await ai.generateGreeting(greetingSnapshot);
        }
      });
    }
  }, [hasApiKey]);

  const focusTasks = useMemo(() => {
    if (computedView?.focusToday.length) {
      return computedView.focusToday.map((id) => tasks.find((t) => t.id === id)).filter((t) => t && t.status === 'active') as typeof tasks;
    }
    return activeTasks.slice(0, 4);
  }, [computedView, tasks, activeTasks]);

  const nudges = computedView?.nudges ?? [];
  const clusters = computedView?.clusters ?? [];

  const handleSubmit = async (text: string) => {
    const snapshot = buildContextSnapshot(tasks, computedView, ChatStorage.getRecent(1), settings.userName);
    const contextBlock = buildParserContext(snapshot);
    const parsed = await ai.parseTask(text, contextBlock);

    if (parsed.action === 'complete') {
      const target = tasks.find((t) => t.id === parsed.targetTaskId);
      if (!target) {
        setFeedback({ message: "couldn't find that task" });
        return;
      }
      completeTask(target.id);
      setFeedback({ message: `${target.parsed.title} completed` });
      if (hasApiKey) {
        const updatedTasks = tasks.map((t) => t.id === target.id ? { ...t, status: 'completed' as const, completedAt: new Date().toISOString() } : t);
        const updatedSnapshot = buildContextSnapshot(updatedTasks, computedView, ChatStorage.getRecent(1), settings.userName);
        ai.generateBrief(updatedSnapshot, true).then((view) => { if (view) setComputedView(view); });
      }
      return;
    }

    if (parsed.action === 'defer') {
      const target = tasks.find((t) => t.id === parsed.targetTaskId);
      if (!target) {
        setFeedback({ message: "couldn't find that task" });
        return;
      }
      deferTask(target.id);
      setFeedback({ message: `defer ${target.parsed.title}: noted` });
      if (hasApiKey) {
        const updatedTasks = tasks.map((t) => t.id === target.id ? { ...t, status: 'deferred' as const, deferrals: t.deferrals + 1 } : t);
        const updatedSnapshot = buildContextSnapshot(updatedTasks, computedView, ChatStorage.getRecent(1), settings.userName);
        ai.generateBrief(updatedSnapshot, true).then((view) => { if (view) setComputedView(view); });
      }
      return;
    }

    // Default: create
    // Resolve cluster name to PersistentCluster ID
    let clusterId: string | null = null;
    if (parsed.cluster) {
      const cluster = ClusterStorage.ensureCluster(parsed.cluster);
      clusterId = cluster.id;
    }

    const newTask = addTask({
      text,
      parsed: { title: parsed.title, deadline: parsed.deadline, tags: parsed.tags },
      importance: parsed.importance,
      relationships: { blocks: parsed.blocks, blockedBy: parsed.blockedBy, clusterId },
      estimatedEffort: parsed.estimatedEffort,
      emotionalContext: parsed.emotionalContext,
    });
    setFeedback({ message: `${parsed.title} has been received` });
    if (newTask) {
      setHighlightedTaskIds(new Set([newTask.id]));
    }
    if (hasApiKey && newTask) {
      const updatedTasks = [...tasks, newTask];
      const updatedSnapshot = buildContextSnapshot(updatedTasks, computedView, ChatStorage.getRecent(1), settings.userName);
      ai.generateBrief(updatedSnapshot, true).then((view) => { if (view) setComputedView(view); });
    }
  };

  const handleChat = async (message: string): Promise<{ response: string; actionSummary: string | null; createdTasks: Array<{ title: string; deadline: string | null; effort: EffortLevel | null }> }> => {
    const snapshot = buildContextSnapshot(tasks, computedView, ChatStorage.getRecent(2), settings.userName);
    const { response, recomputeContext, actions } = await ai.chat(message, snapshot);

    // Parse [MEMORY] blocks from the response
    const { memories } = parseMemoryBlocks(response);
    for (const mem of memories) {
      MemoryStorage.save({ type: mem.type, content: mem.content, source: 'chat', confidence: 0.7 });
    }

    // Execute actions
    let currentTasks = tasks;
    const counts = { created: 0, completed: 0, deferred: 0, updated: 0, memoriesSaved: memories.length };
    const createdTasks: Array<{ title: string; deadline: string | null; effort: EffortLevel | null }> = [];
    const createdIds: string[] = [];

    for (const action of actions) {
      if (action.action === 'create') {
        // Resolve cluster ID
        let actionClusterId: string | null = null;
        if (action.clusterId) {
          actionClusterId = action.clusterId;
        }

        const newTask = addTask({
          text: action.title,
          parsed: { title: action.title, deadline: action.deadline ?? null, tags: action.tags ?? [] },
          importance: action.importance,
          relationships: { blocks: [], blockedBy: [], clusterId: actionClusterId },
          estimatedEffort: action.estimatedEffort ?? null,
          emotionalContext: action.emotionalContext ?? null,
        });
        if (newTask) {
          currentTasks = [...currentTasks, newTask];
          counts.created++;
          createdTasks.push({
            title: action.title,
            deadline: action.deadline ?? null,
            effort: action.estimatedEffort ?? null,
          });
          createdIds.push(newTask.id);
        }
      } else if (action.action === 'save_memory') {
        MemoryStorage.save({ type: action.type, content: action.content, source: 'chat', confidence: 0.7 });
        counts.memoriesSaved++;
      } else if (action.action === 'complete') {
        const target = currentTasks.find((t) => t.id === action.targetTaskId);
        if (target) {
          completeTask(target.id);
          currentTasks = currentTasks.map((t) => t.id === target.id ? { ...t, status: 'completed' as const, completedAt: new Date().toISOString() } : t);
          counts.completed++;

          // Auto-archive clusters when all tasks complete
          if (target.relationships.clusterId) {
            const clusterTasks = currentTasks.filter((t) => t.relationships.clusterId === target.relationships.clusterId);
            const allDone = clusterTasks.every((t) => t.status === 'completed');
            if (allDone) ClusterStorage.archive(target.relationships.clusterId);
          }
        }
      } else if (action.action === 'defer') {
        const target = currentTasks.find((t) => t.id === action.targetTaskId);
        if (target) {
          deferTask(target.id);
          currentTasks = currentTasks.map((t) => t.id === target.id ? { ...t, status: 'deferred' as const, deferrals: t.deferrals + 1 } : t);
          counts.deferred++;
        }
      } else if (action.action === 'update_importance') {
        const target = currentTasks.find((t) => t.id === action.targetTaskId);
        if (target) {
          updateTask(target.id, { importance: action.importance });
          currentTasks = currentTasks.map((t) => t.id === target.id ? { ...t, importance: action.importance } : t);
          counts.updated++;
        }
      } else if (action.action === 'update_dependencies') {
        const target = currentTasks.find((t) => t.id === action.targetTaskId);
        if (target) {
          const newBlocks = [...new Set([...target.relationships.blocks, ...action.blocks])];
          const newBlockedBy = [...new Set([...target.relationships.blockedBy, ...action.blockedBy])];
          updateTask(target.id, { relationships: { ...target.relationships, blocks: newBlocks, blockedBy: newBlockedBy } });
          currentTasks = currentTasks.map((t) => t.id === target.id ? { ...t, relationships: { ...t.relationships, blocks: newBlocks, blockedBy: newBlockedBy } } : t);
          counts.updated++;
        }
      }
    }

    if (createdIds.length > 0) {
      setHighlightedTaskIds(new Set(createdIds));
    }

    // Build action summary string
    let actionSummary: string | null = null;
    const summaryParts: string[] = [];
    if (counts.created) summaryParts.push(`${counts.created} task${counts.created > 1 ? 's' : ''} added`);
    if (counts.completed) summaryParts.push(`${counts.completed} completed`);
    if (counts.deferred) summaryParts.push(`${counts.deferred} deferred`);
    if (counts.updated) summaryParts.push(`${counts.updated} updated`);
    if (counts.memoriesSaved) summaryParts.push(`${counts.memoriesSaved} memory saved`);
    if (summaryParts.length > 0) actionSummary = summaryParts.join(', ');

    // Recompute brief if actions were taken or recompute was requested
    const shouldRecompute = actions.length > 0 || recomputeContext || memories.length > 0;
    if (shouldRecompute && hasApiKey) {
      const briefContext = [recomputeContext, actionSummary].filter(Boolean).join('; ') || undefined;
      const updatedSnapshot = buildContextSnapshot(currentTasks, computedView, ChatStorage.getRecent(2), settings.userName);
      ai.generateBrief(updatedSnapshot, true, briefContext).then((view) => { if (view) setComputedView(view); });
    }

    return { response, actionSummary, createdTasks };
  };

  return (
    <div className="flex h-screen bg-[radial-gradient(ellipse_at_center,var(--color-bg-gradient-from),var(--color-bg-gradient-to))]">
      <div className="flex-1 overflow-y-auto transition-all duration-300 ease-in-out">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <Greeting />

          <SmartInput
            onSubmit={handleSubmit}
            isLoading={ai.isParsing}
            feedback={feedback}
            onFeedbackDone={() => setFeedback(null)}
          />

          {!hasApiKey && tasks.length === 0 && (
            <div className="rounded-2xl border border-border bg-accent-soft p-6 text-center">
              <p className="text-sm text-accent-text">add your API key in settings to unlock AI-powered task parsing, daily briefs, and smart prioritization.</p>
              <p className="mt-2 text-xs text-text-muted">click the gear icon in the bottom-right corner.</p>
            </div>
          )}

          <FocusCards tasks={focusTasks} nudges={nudges} onComplete={animatedComplete} onDefer={animatedDefer} highlightedTaskIds={highlightedTaskIds} dismissingTaskIds={dismissingTaskIds} deferringTaskIds={deferringTaskIds} onHighlightComplete={clearHighlight} />
          <NudgeSection tasks={deferredTasks} onComplete={animatedComplete} onDefer={animatedDefer} highlightedTaskIds={highlightedTaskIds} dismissingTaskIds={dismissingTaskIds} deferringTaskIds={deferringTaskIds} onHighlightComplete={clearHighlight} />

          {clusters.map((cluster) => {
            const clusterTasks = cluster.taskIds.map((id) => tasks.find((t) => t.id === id)).filter((t) => t && t.status === 'active') as typeof tasks;
            if (clusterTasks.length === 0) return null;
            return <ClusterSection key={cluster.id} cluster={cluster} tasks={clusterTasks} onComplete={animatedComplete} onDefer={animatedDefer} highlightedTaskIds={highlightedTaskIds} dismissingTaskIds={dismissingTaskIds} deferringTaskIds={deferringTaskIds} onHighlightComplete={clearHighlight} />;
          })}

          <SomedayBucket tasks={somedayTasks} onComplete={animatedComplete} onDefer={animatedDefer} highlightedTaskIds={highlightedTaskIds} dismissingTaskIds={dismissingTaskIds} deferringTaskIds={deferringTaskIds} onHighlightComplete={clearHighlight} />
        </div>
      </div>

      {settings.showBookmarks && !chatOpen && settings.bookmarks.length > 0 && (
        <BookmarkBar bookmarks={settings.bookmarks} />
      )}

      {!chatOpen && settings.bookmarks.length > 0 && (
        <button
          onClick={() => updateSettings({ showBookmarks: !settings.showBookmarks })}
          className={`fixed bottom-[5.125rem] left-4 z-30 flex w-12 items-center justify-center rounded-full p-1 text-text-muted transition-all ${settings.showBookmarks ? 'opacity-40 hover:opacity-100' : 'opacity-0 hover:opacity-100 focus:opacity-100'}`}
          aria-label={settings.showBookmarks ? 'hide bookmarks' : 'show bookmarks'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            {settings.showBookmarks ? (
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            ) : (
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            )}
          </svg>
        </button>
      )}

      <AIChatPanel open={chatOpen} onClose={() => setChatOpen(false)} onSend={handleChat} messages={ai.chatHistory} isLoading={ai.isChatting} />

      {hasApiKey && !chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-4 right-4 z-40 rounded-full bg-surface-hover p-3 text-text-muted transition-colors hover:bg-surface hover:text-text-secondary"
          aria-label="ask crush"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zm-4 0H9v2h2V9z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      <SettingsPanel settings={settings} updateSettings={updateSettings} hasApiKey={hasApiKey} />
    </div>
  );
}
