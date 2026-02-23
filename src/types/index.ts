export type TaskStatus = 'active' | 'completed' | 'deferred' | 'someday';
export type Importance = 'high' | 'medium' | 'low';
export type TaskAction = 'create' | 'complete' | 'defer';

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
    cluster: string | null;
  };
  status: TaskStatus;
  deferrals: number;
  createdAt: string;
  completedAt: string | null;
  lastSurfacedAt: string | null;
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
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
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
