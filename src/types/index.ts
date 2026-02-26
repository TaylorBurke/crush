export type TaskStatus = 'active' | 'completed' | 'deferred' | 'someday';
export type Importance = 'high' | 'medium' | 'low';
export type TaskAction = 'create' | 'complete' | 'defer';
export type EffortLevel = 'quick' | 'deep' | 'draining';
export type EmotionalContext = 'excited' | 'dreading' | 'neutral';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export interface Task {
  id: string;
  text: string;
  parsed: {
    title: string;
    deadline: string | null;
    tags: string[];
  };
  importance: Importance;
  relationships: {
    blocks: string[];
    blockedBy: string[];
    clusterId: string | null;
  };
  status: TaskStatus;
  deferrals: number;
  createdAt: string;
  completedAt: string | null;
  lastSurfacedAt: string | null;
  estimatedEffort: EffortLevel | null;
  emotionalContext: EmotionalContext | null;
  creationContext: TimeOfDay | null;
}

export interface PersistentCluster {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  archivedAt: string | null;
}

export interface Memory {
  id: string;
  type: 'observation' | 'rule';
  content: string;
  source: 'chat' | 'pattern' | 'explicit';
  confidence: number;
  createdAt: string;
  lastReferencedAt: string;
}

export interface UserProfile {
  completionsByDay: Record<string, number>;
  completionsByTime: Record<TimeOfDay, number>;
  deferralsByDay: Record<string, number>;
  deferralsByTime: Record<TimeOfDay, number>;
  creationsByTime: Record<TimeOfDay, number>;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  totalCompleted: number;
  totalDeferred: number;
  totalCreated: number;
}

export interface DailyReflection {
  date: string;
  tasksCompleted: number;
  tasksDeferred: number;
  focusTasksHit: number;
  focusTasksTotal: number;
  topCompletedTitles: string[];
  topDeferredTitles: string[];
}

export interface ContextSnapshot {
  tasks: Task[];
  view: ComputedView | null;
  clusters: PersistentCluster[];
  memories: Memory[];
  profile: UserProfile | null;
  reflection: DailyReflection | null;
  recentChat: ChatMessage[];
  userName: string;
  today: string;
  dayOfWeek: string;
  timeOfDay: TimeOfDay;
}

export interface Nudge {
  taskId: string;
  message: string;
}

export interface UrgencyScore {
  score: number;
  reasons: string[];
}

export interface Cluster {
  id: string;
  name: string;
  taskIds: string[];
  progress: number;
}

export interface ComputedView {
  generatedAt: string;
  focusToday: string[];
  nudges: Nudge[];
  urgencyScores: Record<string, UrgencyScore>;
  clusters: Cluster[];
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  actionSummary?: string;
}

export type ChatAction =
  | { action: 'create'; title: string; deadline?: string | null; importance: Importance; tags?: string[]; estimatedEffort?: EffortLevel | null; emotionalContext?: EmotionalContext | null; clusterId?: string | null }
  | { action: 'complete'; targetTaskId: string }
  | { action: 'defer'; targetTaskId: string }
  | { action: 'update_importance'; targetTaskId: string; importance: Importance }
  | { action: 'update_dependencies'; targetTaskId: string; blocks: string[]; blockedBy: string[] }
  | { action: 'save_memory'; content: string; type: 'observation' | 'rule' };

export interface ChatResult {
  response: string;
  recomputeContext: string | null;
  actions: ChatAction[];
}

export type Provider = 'openai' | 'openrouter';

export interface Bookmark {
  id: string;
  url: string;
  label: string;
  icon: string;
}

export interface Settings {
  provider: Provider;
  apiKey: string;
  model: string;
  userName: string;
  showBookmarks: boolean;
  bookmarks: Bookmark[];
  theme: string;
}
