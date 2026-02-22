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
    addTask({
      text,
      parsed: { title: parsed.title, deadline: parsed.deadline, tags: parsed.tags },
      importance: parsed.importance,
      relationships: { blocks: parsed.blocks, blockedBy: parsed.blockedBy, cluster: parsed.cluster },
    });
  };

  const handleChat = async (message: string) => {
    return ai.chat(message, tasks, computedView);
  };

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-stone-50 px-6 py-12">
      <div className="flex items-start justify-between">
        <Greeting />
        {hasApiKey && (
          <button onClick={() => setChatOpen(true)} className="rounded-lg bg-amber-100 px-4 py-2 text-sm text-amber-700 transition-colors hover:bg-amber-200">
            ask crush
          </button>
        )}
      </div>

      <SmartInput onSubmit={handleSubmit} isLoading={ai.isParsing} />

      {!hasApiKey && tasks.length === 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm text-amber-800">add your OpenAI API key in settings to unlock AI-powered task parsing, daily briefs, and smart prioritization.</p>
          <p className="mt-2 text-xs text-amber-600">click the gear icon in the bottom-right corner.</p>
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
  );
}
