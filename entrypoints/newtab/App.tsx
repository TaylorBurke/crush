import { useState, useEffect, useMemo } from 'react';
import { useTasks } from '../../src/hooks/useTasks';
import { useSettings } from '../../src/hooks/useSettings';
import { useAI } from '../../src/hooks/useAI';
import { ViewStorage } from '../../src/lib/storage';
import { Greeting } from './components/Greeting';
import { SmartInput } from './components/SmartInput';
import { FocusCards } from './components/FocusCards';
import { NudgeSection } from './components/NudgeSection';
import { ClusterSection } from './components/ClusterSection';
import { SomedayBucket } from './components/SomedayBucket';
import { AIChatPanel } from './components/AIChatPanel';
import { SettingsPanel } from './components/SettingsPanel';
import type { ComputedView } from '../../src/types';

export default function App() {
  const { tasks, activeTasks, deferredTasks, somedayTasks, addTask, completeTask, deferTask } = useTasks();
  const { settings, hasApiKey } = useSettings();
  const ai = useAI(settings.openaiApiKey);
  const [computedView, setComputedView] = useState<ComputedView | null>(() => ViewStorage.get());
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (hasApiKey && tasks.length > 0) {
      ai.generateBrief(tasks).then((view) => { if (view) setComputedView(view); });
    }
  }, [hasApiKey]);

  const focusTasks = useMemo(() => {
    if (computedView?.focusToday.length) {
      return computedView.focusToday.map((id) => tasks.find((t) => t.id === id)).filter(Boolean) as typeof tasks;
    }
    return activeTasks.slice(0, 4);
  }, [computedView, tasks, activeTasks]);

  const nudges = computedView?.nudges ?? [];
  const clusters = computedView?.clusters ?? [];

  const handleSubmit = async (text: string) => {
    const parsed = await ai.parseTask(text, tasks);
    const newTask = addTask({
      text,
      parsed: { title: parsed.title, deadline: parsed.deadline, tags: parsed.tags },
      importance: parsed.importance,
      relationships: { blocks: parsed.blocks, blockedBy: parsed.blockedBy, cluster: parsed.cluster },
    });
    // Regenerate the computed view with the new task included
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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,var(--color-bg-gradient-from),var(--color-bg-gradient-to))]">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="flex items-start justify-between">
          <Greeting />
          {hasApiKey && (
            <button onClick={() => setChatOpen(true)} className="rounded-lg bg-accent-soft px-4 py-2 text-sm text-accent-text transition-colors hover:bg-accent-hover hover:text-white">
              ask crush
            </button>
          )}
        </div>

        <SmartInput onSubmit={handleSubmit} isLoading={ai.isParsing} />

        {!hasApiKey && tasks.length === 0 && (
          <div className="rounded-2xl border border-border bg-accent-soft p-6 text-center">
            <p className="text-sm text-accent-text">add your OpenAI API key in settings to unlock AI-powered task parsing, daily briefs, and smart prioritization.</p>
            <p className="mt-2 text-xs text-text-muted">click the gear icon in the bottom-right corner.</p>
          </div>
        )}

        <FocusCards tasks={focusTasks} nudges={nudges} onComplete={completeTask} onDefer={deferTask} />
        <NudgeSection tasks={deferredTasks} onComplete={completeTask} onDefer={deferTask} />

        {clusters.map((cluster) => {
          const clusterTasks = cluster.taskIds.map((id) => tasks.find((t) => t.id === id)).filter(Boolean) as typeof tasks;
          return <ClusterSection key={cluster.id} cluster={cluster} tasks={clusterTasks} onComplete={completeTask} onDefer={deferTask} />;
        })}

        <SomedayBucket tasks={somedayTasks} onComplete={completeTask} onDefer={deferTask} />
        <AIChatPanel open={chatOpen} onClose={() => setChatOpen(false)} onSend={handleChat} messages={ai.chatHistory} isLoading={ai.isChatting} />
        <SettingsPanel />
      </div>
    </div>
  );
}
