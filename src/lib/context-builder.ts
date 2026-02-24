import type { Task, ComputedView, ChatMessage, ContextSnapshot, PersistentCluster, Memory, UserProfile, DailyReflection, TimeOfDay } from '../types';
import { ClusterStorage, MemoryStorage, ProfileStorage, ReflectionStorage } from './storage';
import { today, getDayOfWeek, getTimeOfDayBucket } from './date';

export function buildContextSnapshot(
  tasks: Task[],
  view: ComputedView | null,
  recentChat: ChatMessage[],
  userName: string,
): ContextSnapshot {
  return {
    tasks,
    view,
    clusters: ClusterStorage.getActive(),
    memories: MemoryStorage.getAll(),
    profile: ProfileStorage.get(),
    reflection: ReflectionStorage.get(),
    recentChat,
    userName,
    today: today(),
    dayOfWeek: getDayOfWeek(),
    timeOfDay: getTimeOfDayBucket(),
  };
}

type TaskDetailLevel = 'full' | 'standard' | 'minimal';

export function renderTaskList(tasks: Task[], level: TaskDetailLevel): string {
  if (tasks.length === 0) return '(no tasks)';

  return tasks.map((t) => {
    if (level === 'minimal') {
      return `- [${t.id}] "${t.parsed.title}" (${t.status}, ${t.importance})`;
    }

    const parts = [
      `[${t.id}] "${t.parsed.title}"`,
      `status: ${t.status}`,
      `importance: ${t.importance}`,
    ];

    if (t.parsed.deadline) parts.push(`deadline: ${t.parsed.deadline}`);
    if (t.deferrals > 0) parts.push(`deferrals: ${t.deferrals}`);
    if (t.relationships.blocks.length > 0) parts.push(`blocks: [${t.relationships.blocks.join(', ')}]`);
    if (t.relationships.blockedBy.length > 0) parts.push(`blockedBy: [${t.relationships.blockedBy.join(', ')}]`);
    if (t.relationships.clusterId) parts.push(`clusterId: ${t.relationships.clusterId}`);

    if (level === 'full') {
      if (t.estimatedEffort) parts.push(`effort: ${t.estimatedEffort}`);
      if (t.emotionalContext) parts.push(`emotion: ${t.emotionalContext}`);
      if (t.creationContext) parts.push(`createdAt: ${t.creationContext}`);
      if (t.parsed.tags.length > 0) parts.push(`tags: [${t.parsed.tags.join(', ')}]`);
      parts.push(`created: ${t.createdAt.split('T')[0]}`);
    }

    return parts.join(' | ');
  }).join('\n');
}

export function renderClusters(clusters: PersistentCluster[]): string {
  if (clusters.length === 0) return '';
  return `Active clusters:\n${clusters.map((c) => `- "${c.name}" (id: ${c.id})`).join('\n')}`;
}

export function renderMemories(memories: Memory[], maxCount = 20): string {
  if (memories.length === 0) return '';
  const sorted = [...memories].sort((a, b) => b.confidence - a.confidence).slice(0, maxCount);
  return `Known user preferences and patterns:\n${sorted.map((m) => `- [${m.type}] ${m.content} (confidence: ${m.confidence.toFixed(1)})`).join('\n')}`;
}

export function renderProfile(profile: UserProfile | null): string {
  if (!profile) return '';
  const parts: string[] = [];
  parts.push(`Total: ${profile.totalCompleted} completed, ${profile.totalDeferred} deferred, ${profile.totalCreated} created`);
  if (profile.currentStreak > 0) parts.push(`Current streak: ${profile.currentStreak} day${profile.currentStreak > 1 ? 's' : ''}`);
  if (profile.longestStreak > 1) parts.push(`Longest streak: ${profile.longestStreak} days`);

  // Find peak productivity time
  const times = profile.completionsByTime;
  const peakTime = (Object.entries(times) as [TimeOfDay, number][])
    .sort(([, a], [, b]) => b - a)[0];
  if (peakTime && peakTime[1] > 0) {
    parts.push(`Peak productivity: ${peakTime[0]} (${peakTime[1]} completions)`);
  }

  return `User profile:\n${parts.join('\n')}`;
}

export function renderReflection(reflection: DailyReflection | null): string {
  if (!reflection) return '';
  const parts = [
    `Yesterday (${reflection.date}): ${reflection.tasksCompleted} completed, ${reflection.tasksDeferred} deferred`,
    `Focus tasks: ${reflection.focusTasksHit}/${reflection.focusTasksTotal} hit`,
  ];
  if (reflection.topCompletedTitles.length > 0) {
    parts.push(`Completed: ${reflection.topCompletedTitles.join(', ')}`);
  }
  if (reflection.topDeferredTitles.length > 0) {
    parts.push(`Deferred: ${reflection.topDeferredTitles.join(', ')}`);
  }
  return `Yesterday's reflection:\n${parts.join('\n')}`;
}

export function renderViewSummary(view: ComputedView | null, tasks: Task[]): string {
  if (!view) return '';
  const parts: string[] = [];

  const focusNames = view.focusToday.map((id) => {
    const t = tasks.find((tk) => tk.id === id);
    return t ? `"${t.parsed.title}" [${id}]` : id;
  });
  if (focusNames.length > 0) parts.push(`Today's focus: ${focusNames.join(', ')}`);

  if (view.nudges.length > 0) {
    parts.push(`Nudges:\n${view.nudges.map((n) => `- ${n.message} [${n.taskId}]`).join('\n')}`);
  }

  const scores = Object.entries(view.urgencyScores).sort(([, a], [, b]) => b.score - a.score).slice(0, 6);
  if (scores.length > 0) {
    parts.push(`Top urgency:\n${scores.map(([id, s]) => {
      const t = tasks.find((tk) => tk.id === id);
      return `- ${t ? `"${t.parsed.title}"` : id}: ${s.score}/1.0 (${s.reasons.join(', ')})`;
    }).join('\n')}`);
  }

  if (view.clusters.length > 0) {
    parts.push(`Clusters:\n${view.clusters.map((c) => `- "${c.name}" (${c.taskIds.length} tasks, ${Math.round(c.progress * 100)}% done)`).join('\n')}`);
  }

  return parts.join('\n\n');
}

export function buildParserContext(snapshot: ContextSnapshot): string {
  const sections: string[] = [];

  // Minimal task list
  const taskList = snapshot.tasks.length > 0
    ? snapshot.tasks.map((t) => `- [${t.id}] ${t.parsed.title} (${t.status})`).join('\n')
    : '(none)';
  sections.push(`Existing tasks:\n${taskList}`);

  // Cluster names for mapping
  if (snapshot.clusters.length > 0) {
    sections.push(`Existing clusters: ${snapshot.clusters.map((c) => `"${c.name}"`).join(', ')}\nMap to existing clusters when possible.`);
  }

  // Focus summary
  if (snapshot.view?.focusToday.length) {
    const focusNames = snapshot.view.focusToday.map((id) => {
      const t = snapshot.tasks.find((tk) => tk.id === id);
      return t ? t.parsed.title : id;
    });
    sections.push(`Today's focus: ${focusNames.join(', ')}\nInherit urgency from related focus tasks.`);
  }

  // High-confidence memories
  const memories = snapshot.memories.filter((m) => m.confidence >= 0.5);
  if (memories.length > 0) {
    sections.push(`User preferences:\n${memories.slice(0, 10).map((m) => `- ${m.content}`).join('\n')}\nApply known user preferences.`);
  }

  // Profile summary
  if (snapshot.profile && snapshot.profile.totalCompleted > 0) {
    sections.push(`User stats: ${snapshot.profile.totalCompleted} tasks completed, ${snapshot.profile.currentStreak}-day streak`);
  }

  return sections.join('\n\n');
}

export function buildBriefContext(snapshot: ContextSnapshot): string {
  const sections: string[] = [];

  sections.push(renderTaskList(snapshot.tasks, 'full'));
  const clusters = renderClusters(snapshot.clusters);
  if (clusters) sections.push(clusters);
  const memories = renderMemories(snapshot.memories);
  if (memories) sections.push(memories);
  const profile = renderProfile(snapshot.profile);
  if (profile) sections.push(profile);
  const reflection = renderReflection(snapshot.reflection);
  if (reflection) sections.push(reflection);

  if (snapshot.recentChat.length > 0) {
    sections.push(`Recent chat:\n${snapshot.recentChat.slice(-20).map((m) => `${m.role}: ${m.content}`).join('\n')}`);
  }

  return sections.join('\n\n');
}

export function buildChatContext(snapshot: ContextSnapshot): string {
  const sections: string[] = [];

  sections.push(renderTaskList(snapshot.tasks.filter((t) => t.status !== 'completed'), 'standard'));
  const viewSummary = renderViewSummary(snapshot.view, snapshot.tasks);
  if (viewSummary) sections.push(viewSummary);
  const clusters = renderClusters(snapshot.clusters);
  if (clusters) sections.push(clusters);
  const memories = renderMemories(snapshot.memories);
  if (memories) sections.push(memories);
  const profile = renderProfile(snapshot.profile);
  if (profile) sections.push(profile);
  const reflection = renderReflection(snapshot.reflection);
  if (reflection) sections.push(reflection);

  return sections.join('\n\n');
}

export function buildGreetingContext(snapshot: ContextSnapshot): string {
  const sections: string[] = [];

  const viewSummary = renderViewSummary(snapshot.view, snapshot.tasks);
  if (viewSummary) sections.push(viewSummary);
  const profile = renderProfile(snapshot.profile);
  if (profile) sections.push(profile);
  const reflection = renderReflection(snapshot.reflection);
  if (reflection) sections.push(reflection);

  if (snapshot.recentChat.length > 0) {
    sections.push(`Recent chat:\n${snapshot.recentChat.slice(-5).map((m) => `${m.role}: ${m.content}`).join('\n')}`);
  }

  return sections.join('\n\n');
}
