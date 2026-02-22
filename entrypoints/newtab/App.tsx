import { useMemo } from 'react';
import { useTasks } from '../../src/hooks/useTasks';
import { Greeting } from './components/Greeting';
import { SmartInput } from './components/SmartInput';
import { FocusCards } from './components/FocusCards';
import { NudgeSection } from './components/NudgeSection';
import { SomedayBucket } from './components/SomedayBucket';

export default function App() {
  const {
    activeTasks,
    deferredTasks,
    somedayTasks,
    addTask,
    completeTask,
    deferTask,
  } = useTasks();

  // Without AI, just show active tasks as focus items (AI will replace this later)
  const focusTasks = useMemo(() => activeTasks.slice(0, 4), [activeTasks]);

  const handleSubmit = (text: string) => {
    // For now, create a simple task without AI parsing (AI integration in Phase 5)
    addTask({
      text,
      parsed: { title: text, deadline: null, tags: [] },
      importance: 'medium',
      relationships: { blocks: [], blockedBy: [], cluster: null },
    });
  };

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-stone-50 px-6 py-12">
      <Greeting />
      <SmartInput onSubmit={handleSubmit} />
      <FocusCards tasks={focusTasks} nudges={[]} onComplete={completeTask} onDefer={deferTask} />
      <NudgeSection tasks={deferredTasks} onComplete={completeTask} onDefer={deferTask} />
      <SomedayBucket tasks={somedayTasks} onComplete={completeTask} onDefer={deferTask} />
    </div>
  );
}
