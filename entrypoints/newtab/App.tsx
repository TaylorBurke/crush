import { useState, useEffect, useMemo } from 'react';
import { useTasks } from '../../src/hooks/useTasks';
import { useSettings } from '../../src/hooks/useSettings';
import { useAI } from '../../src/hooks/useAI';
import { ViewStorage, TaskStorage } from '../../src/lib/storage';
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
import type { ComputedView } from '../../src/types';

export default function App() {
  const { tasks, activeTasks, deferredTasks, somedayTasks, addTask, completeTask, deferTask } = useTasks();
  const { settings, updateSettings, hasApiKey } = useSettings();
  const ai = useAI(settings.apiKey, settings.provider, settings.model);
  const [computedView, setComputedView] = useState<ComputedView | null>(() => ViewStorage.get());
  const [chatOpen, setChatOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string } | null>(null);

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
      ai.generateBrief(tasks).then((view) => { if (view) setComputedView(view); });
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

  const handleChat = async (message: string) => {
    const { response, recomputeContext } = await ai.chat(message, tasks, computedView);
    if (recomputeContext && hasApiKey) {
      ai.generateBrief(tasks, true, recomputeContext).then((view) => { if (view) setComputedView(view); });
    }
    return response;
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
