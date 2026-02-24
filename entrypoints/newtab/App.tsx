import { useState, useEffect, useMemo, useRef } from 'react';
import { useTasks } from '../../src/hooks/useTasks';
import { useSettings } from '../../src/hooks/useSettings';
import { useAI } from '../../src/hooks/useAI';
import { ViewStorage, TaskStorage, ChatStorage } from '../../src/lib/storage';
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
import type { ComputedView, ChatAction } from '../../src/types';

export default function App() {
  const { tasks, activeTasks, deferredTasks, somedayTasks, addTask, completeTask, deferTask, updateTask } = useTasks();
  const { settings, updateSettings, hasApiKey } = useSettings();
  const ai = useAI(settings.apiKey, settings.provider, settings.model);
  const [computedView, setComputedView] = useState<ComputedView | null>(() => ViewStorage.get());
  const [chatOpen, setChatOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string } | null>(null);
  const greetedRef = useRef(false);

  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(settings.theme, isDark);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => applyTheme(settings.theme, e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings.theme]);

  useEffect(() => {
    if (hasApiKey && tasks.length > 0) {
      TaskStorage.purgeCompleted();
      ChatStorage.purgeOld();
      ai.generateBrief(tasks, false, undefined, ChatStorage.getRecent(2)).then(async (view) => {
        if (!view) return;
        setComputedView(view);
        // Generate daily greeting on first fresh brief of the session
        if (!greetedRef.current && ai.chatHistory.length === 0) {
          greetedRef.current = true;
          const greeting = await ai.generateGreeting(tasks, view, ChatStorage.getRecent(2));
          if (greeting) setChatOpen(true);
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
    const parsed = await ai.parseTask(text, tasks);

    if (parsed.action === 'complete') {
      const target = tasks.find((t) => t.id === parsed.targetTaskId);
      if (!target) {
        setFeedback({ message: "couldn't find that task" });
        return;
      }
      completeTask(target.id);
      setFeedback({ message: `${target.parsed.title} completed` });
      // Recompute brief with updated task list
      if (hasApiKey) {
        const updatedTasks = tasks.map((t) => t.id === target.id ? { ...t, status: 'completed' as const, completedAt: new Date().toISOString() } : t);
        ai.generateBrief(updatedTasks, true).then((view) => { if (view) setComputedView(view); });
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
      // Recompute brief with updated task list
      if (hasApiKey) {
        const updatedTasks = tasks.map((t) => t.id === target.id ? { ...t, status: 'deferred' as const, deferrals: t.deferrals + 1 } : t);
        ai.generateBrief(updatedTasks, true).then((view) => { if (view) setComputedView(view); });
      }
      return;
    }

    // Default: create
    const newTask = addTask({
      text,
      parsed: { title: parsed.title, deadline: parsed.deadline, tags: parsed.tags },
      importance: parsed.importance,
      relationships: { blocks: parsed.blocks, blockedBy: parsed.blockedBy, cluster: parsed.cluster },
    });
    setFeedback({ message: `${parsed.title} has been received` });
    if (hasApiKey && newTask) {
      const updatedTasks = [...tasks, newTask];
      ai.generateBrief(updatedTasks, true).then((view) => { if (view) setComputedView(view); });
    }
  };

  const handleChat = async (message: string): Promise<{ response: string; actionSummary: string | null }> => {
    const { response, recomputeContext, actions } = await ai.chat(message, tasks, computedView);

    // Execute actions
    let currentTasks = tasks;
    const counts = { created: 0, completed: 0, deferred: 0, updated: 0 };

    for (const action of actions) {
      if (action.action === 'create') {
        const newTask = addTask({
          text: action.title,
          parsed: { title: action.title, deadline: action.deadline ?? null, tags: action.tags ?? [] },
          importance: action.importance,
          relationships: { blocks: [], blockedBy: [], cluster: null },
        });
        if (newTask) {
          currentTasks = [...currentTasks, newTask];
          counts.created++;
        }
      } else if (action.action === 'complete') {
        const target = currentTasks.find((t) => t.id === action.targetTaskId);
        if (target) {
          completeTask(target.id);
          currentTasks = currentTasks.map((t) => t.id === target.id ? { ...t, status: 'completed' as const, completedAt: new Date().toISOString() } : t);
          counts.completed++;
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

    // Build action summary string
    let actionSummary: string | null = null;
    if (actions.length > 0) {
      const parts: string[] = [];
      if (counts.created) parts.push(`${counts.created} task${counts.created > 1 ? 's' : ''} added`);
      if (counts.completed) parts.push(`${counts.completed} completed`);
      if (counts.deferred) parts.push(`${counts.deferred} deferred`);
      if (counts.updated) parts.push(`${counts.updated} updated`);
      actionSummary = parts.join(', ');
    }

    // Recompute brief if actions were taken or recompute was requested
    const shouldRecompute = actions.length > 0 || recomputeContext;
    if (shouldRecompute && hasApiKey) {
      const briefContext = [recomputeContext, actionSummary].filter(Boolean).join('; ') || undefined;
      ai.generateBrief(currentTasks, true, briefContext).then((view) => { if (view) setComputedView(view); });
    }

    return { response, actionSummary };
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

          <FocusCards tasks={focusTasks} nudges={nudges} onComplete={completeTask} onDefer={deferTask} />
          <NudgeSection tasks={deferredTasks} onComplete={completeTask} onDefer={deferTask} />

          {clusters.map((cluster) => {
            const clusterTasks = cluster.taskIds.map((id) => tasks.find((t) => t.id === id)).filter((t) => t && t.status === 'active') as typeof tasks;
            if (clusterTasks.length === 0) return null;
            return <ClusterSection key={cluster.id} cluster={cluster} tasks={clusterTasks} onComplete={completeTask} onDefer={deferTask} />;
          })}

          <SomedayBucket tasks={somedayTasks} onComplete={completeTask} onDefer={deferTask} />
        </div>
      </div>

      {settings.showBookmarks && !chatOpen && settings.bookmarks.length > 0 && (
        <BookmarkBar bookmarks={settings.bookmarks} />
      )}

      {!chatOpen && settings.bookmarks.length > 0 && (
        <button
          onClick={() => updateSettings({ showBookmarks: !settings.showBookmarks })}
          className={`fixed bottom-[3.25rem] left-4 z-30 flex w-10 items-center justify-center rounded-full p-1 text-text-muted transition-all ${settings.showBookmarks ? '' : 'opacity-0 hover:opacity-100 focus:opacity-100'}`}
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
          className="fixed bottom-4 right-4 z-40 rounded-full bg-surface-hover p-2.5 text-text-muted transition-colors hover:bg-surface hover:text-text-secondary"
          aria-label="ask crush"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zm-4 0H9v2h2V9z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      <SettingsPanel settings={settings} updateSettings={updateSettings} hasApiKey={hasApiKey} />
    </div>
  );
}
