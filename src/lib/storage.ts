import type { Task, ComputedView, ChatMessage, PersistentCluster, Memory, UserProfile, DailyReflection, TimeOfDay } from '../types';
import { today, formatLocalDate } from './date';

const TASKS_KEY = 'crush-tasks';
const VIEW_KEY = 'crush-computed-view';
const LAST_BRIEF_KEY = 'crush-last-brief-date-v2';
const CLUSTERS_KEY = 'crush-clusters';
const MEMORIES_KEY = 'crush-memories';
const PROFILE_KEY = 'crush-profile';
const REFLECTION_KEY = 'crush-reflection';
const MIGRATION_KEY = 'crush-migration-version';

export const TaskStorage = {
  getAll(): Task[] {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Task[];
  },

  getById(id: string): Task | undefined {
    return this.getAll().find((t) => t.id === id);
  },

  save(task: Task): void {
    const tasks = this.getAll();
    const idx = tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) {
      tasks[idx] = task;
    } else {
      tasks.push(task);
    }
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  },

  saveAll(tasks: Task[]): void {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  },

  remove(id: string): void {
    const tasks = this.getAll().filter((t) => t.id !== id);
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  },

  clear(): void {
    localStorage.removeItem(TASKS_KEY);
  },

  purgeCompleted(): void {
    const now = Date.now();
    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

    const tasks = this.getAll();
    const kept = tasks.filter((t) => {
      if (t.status !== 'completed' || !t.completedAt) return true;
      const age = now - new Date(t.completedAt).getTime();
      const hasRelationships = t.relationships.blocks.length > 0 || t.relationships.blockedBy.length > 0;
      if (hasRelationships) return age < SEVEN_DAYS;
      return age < THREE_DAYS;
    });

    if (kept.length < tasks.length) {
      localStorage.setItem(TASKS_KEY, JSON.stringify(kept));
    }
  },
};

export const ViewStorage = {
  get(): ComputedView | null {
    const raw = localStorage.getItem(VIEW_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ComputedView;
  },

  save(view: ComputedView): void {
    localStorage.setItem(VIEW_KEY, JSON.stringify(view));
  },

  clear(): void {
    localStorage.removeItem(VIEW_KEY);
  },
};

export const BriefStorage = {
  getLastDate(): string | null {
    return localStorage.getItem(LAST_BRIEF_KEY);
  },

  setLastDate(date: string): void {
    localStorage.setItem(LAST_BRIEF_KEY, date);
  },
};

const CHAT_KEY_PREFIX = 'crush-chat-';

export const ChatStorage = {
  getToday(): ChatMessage[] {
    const key = CHAT_KEY_PREFIX + today();
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try { return JSON.parse(raw) as ChatMessage[]; }
    catch { return []; }
  },

  getRecent(days: number): ChatMessage[] {
    const messages: ChatMessage[] = [];
    // Parse today() back to a Date to iterate backwards from the rollover-adjusted day
    const parts = today().split('-');
    const base = new Date(+parts[0], +parts[1] - 1, +parts[2], 12);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      const key = CHAT_KEY_PREFIX + formatLocalDate(d);
      const raw = localStorage.getItem(key);
      if (raw) {
        try { messages.push(...(JSON.parse(raw) as ChatMessage[])); }
        catch { /* skip corrupt entries */ }
      }
    }
    return messages;
  },

  saveMessage(msg: ChatMessage): void {
    const key = CHAT_KEY_PREFIX + today();
    const existing = this.getToday();
    existing.push(msg);
    localStorage.setItem(key, JSON.stringify(existing));
  },

  clearToday(): void {
    localStorage.removeItem(CHAT_KEY_PREFIX + today());
  },

  purgeOld(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = formatLocalDate(cutoff);

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CHAT_KEY_PREFIX)) {
        const dateStr = key.slice(CHAT_KEY_PREFIX.length);
        if (dateStr < cutoffStr) {
          localStorage.removeItem(key);
        }
      }
    }
  },
};

// --- New storage modules ---

export const ClusterStorage = {
  getAll(): PersistentCluster[] {
    const raw = localStorage.getItem(CLUSTERS_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw) as PersistentCluster[]; }
    catch { return []; }
  },

  save(cluster: PersistentCluster): void {
    const clusters = this.getAll();
    const idx = clusters.findIndex((c) => c.id === cluster.id);
    if (idx >= 0) {
      clusters[idx] = cluster;
    } else {
      clusters.push(cluster);
    }
    localStorage.setItem(CLUSTERS_KEY, JSON.stringify(clusters));
  },

  saveAll(clusters: PersistentCluster[]): void {
    localStorage.setItem(CLUSTERS_KEY, JSON.stringify(clusters));
  },

  remove(id: string): void {
    const clusters = this.getAll().filter((c) => c.id !== id);
    localStorage.setItem(CLUSTERS_KEY, JSON.stringify(clusters));
  },

  getById(id: string): PersistentCluster | undefined {
    return this.getAll().find((c) => c.id === id);
  },

  findByName(name: string): PersistentCluster | undefined {
    const lower = name.toLowerCase();
    return this.getAll().find((c) => c.name.toLowerCase() === lower && !c.archivedAt);
  },

  ensureCluster(name: string): PersistentCluster {
    const existing = this.findByName(name);
    if (existing) return existing;
    const cluster: PersistentCluster = {
      id: crypto.randomUUID(),
      name,
      description: '',
      createdAt: new Date().toISOString(),
      archivedAt: null,
    };
    this.save(cluster);
    return cluster;
  },

  archive(id: string): void {
    const cluster = this.getById(id);
    if (cluster && !cluster.archivedAt) {
      this.save({ ...cluster, archivedAt: new Date().toISOString() });
    }
  },

  getActive(): PersistentCluster[] {
    return this.getAll().filter((c) => !c.archivedAt);
  },

  purgeArchived(): void {
    const clusters = this.getAll().filter((c) => !c.archivedAt);
    localStorage.setItem(CLUSTERS_KEY, JSON.stringify(clusters));
  },
};

const MEMORY_CAP = 100;
const CONFIDENCE_DECAY = 0.05;

export const MemoryStorage = {
  getAll(): Memory[] {
    const raw = localStorage.getItem(MEMORIES_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw) as Memory[]; }
    catch { return []; }
  },

  save(memory: Omit<Memory, 'id' | 'createdAt' | 'lastReferencedAt'>): Memory {
    const memories = this.getAll();
    // Dedup: if similar content exists, boost confidence instead
    const existing = memories.find((m) => m.content.toLowerCase() === memory.content.toLowerCase());
    if (existing) {
      existing.confidence = Math.min(1, existing.confidence + 0.1);
      existing.lastReferencedAt = new Date().toISOString();
      localStorage.setItem(MEMORIES_KEY, JSON.stringify(memories));
      return existing;
    }

    const newMemory: Memory = {
      id: crypto.randomUUID(),
      ...memory,
      createdAt: new Date().toISOString(),
      lastReferencedAt: new Date().toISOString(),
    };
    memories.push(newMemory);

    // Cap at MEMORY_CAP: remove lowest-confidence entries
    if (memories.length > MEMORY_CAP) {
      memories.sort((a, b) => b.confidence - a.confidence);
      memories.length = MEMORY_CAP;
    }

    localStorage.setItem(MEMORIES_KEY, JSON.stringify(memories));
    return newMemory;
  },

  remove(id: string): void {
    const memories = this.getAll().filter((m) => m.id !== id);
    localStorage.setItem(MEMORIES_KEY, JSON.stringify(memories));
  },

  decayConfidence(): void {
    const memories = this.getAll();
    if (memories.length === 0) return;
    const updated = memories
      .map((m) => ({ ...m, confidence: Math.max(0, m.confidence - CONFIDENCE_DECAY) }))
      .filter((m) => m.confidence > 0);
    localStorage.setItem(MEMORIES_KEY, JSON.stringify(updated));
  },

  getHighConfidence(minConfidence = 0.3): Memory[] {
    return this.getAll().filter((m) => m.confidence >= minConfidence);
  },

  clear(): void {
    localStorage.removeItem(MEMORIES_KEY);
  },
};

function emptyProfile(): UserProfile {
  return {
    completionsByDay: {},
    completionsByTime: { morning: 0, afternoon: 0, evening: 0, night: 0 },
    deferralsByDay: {},
    deferralsByTime: { morning: 0, afternoon: 0, evening: 0, night: 0 },
    creationsByTime: { morning: 0, afternoon: 0, evening: 0, night: 0 },
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    totalCompleted: 0,
    totalDeferred: 0,
    totalCreated: 0,
  };
}

export const ProfileStorage = {
  get(): UserProfile {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return emptyProfile();
    try { return JSON.parse(raw) as UserProfile; }
    catch { return emptyProfile(); }
  },

  save(profile: UserProfile): void {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  },

  recordCompletion(day: string, timeOfDay: TimeOfDay): void {
    const profile = this.get();
    profile.completionsByDay[day] = (profile.completionsByDay[day] || 0) + 1;
    profile.completionsByTime[timeOfDay] = (profile.completionsByTime[timeOfDay] || 0) + 1;
    profile.totalCompleted++;
    this._updateStreak(profile, day);
    this.save(profile);
  },

  recordDeferral(day: string, timeOfDay: TimeOfDay): void {
    const profile = this.get();
    profile.deferralsByDay[day] = (profile.deferralsByDay[day] || 0) + 1;
    profile.deferralsByTime[timeOfDay] = (profile.deferralsByTime[timeOfDay] || 0) + 1;
    profile.totalDeferred++;
    this.save(profile);
  },

  recordCreation(timeOfDay: TimeOfDay): void {
    const profile = this.get();
    profile.creationsByTime[timeOfDay] = (profile.creationsByTime[timeOfDay] || 0) + 1;
    profile.totalCreated++;
    this.save(profile);
  },

  _updateStreak(profile: UserProfile, day: string): void {
    if (!profile.lastActiveDate) {
      profile.currentStreak = 1;
      profile.longestStreak = 1;
      profile.lastActiveDate = day;
      return;
    }

    if (profile.lastActiveDate === day) return;

    // Check if this is the next consecutive day
    const last = new Date(profile.lastActiveDate + 'T12:00:00');
    const current = new Date(day + 'T12:00:00');
    const diffDays = Math.round((current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      profile.currentStreak++;
    } else {
      profile.currentStreak = 1;
    }
    profile.longestStreak = Math.max(profile.longestStreak, profile.currentStreak);
    profile.lastActiveDate = day;
  },

  clear(): void {
    localStorage.removeItem(PROFILE_KEY);
  },
};

export const ReflectionStorage = {
  get(): DailyReflection | null {
    const raw = localStorage.getItem(REFLECTION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as DailyReflection; }
    catch { return null; }
  },

  save(reflection: DailyReflection): void {
    localStorage.setItem(REFLECTION_KEY, JSON.stringify(reflection));
  },

  clear(): void {
    localStorage.removeItem(REFLECTION_KEY);
  },
};

// --- Migration system ---

export function getMigrationVersion(): number {
  const raw = localStorage.getItem(MIGRATION_KEY);
  return raw ? parseInt(raw, 10) : 0;
}

function setMigrationVersion(version: number): void {
  localStorage.setItem(MIGRATION_KEY, String(version));
}

export function runMigrations(): void {
  const current = getMigrationVersion();

  if (current < 1) {
    migrateV1();
    setMigrationVersion(1);
  }

  if (current < 2) {
    migrateV2();
    setMigrationVersion(2);
  }
}

function migrateV1(): void {
  // Add new Task fields with null defaults
  // Convert relationships.cluster string names to PersistentCluster references
  const raw = localStorage.getItem(TASKS_KEY);
  if (!raw) return;

  try {
    const tasks = JSON.parse(raw) as Record<string, unknown>[];
    const migrated = tasks.map((t) => {
      // Add new fields if missing
      if (!('estimatedEffort' in t)) t.estimatedEffort = null;
      if (!('emotionalContext' in t)) t.emotionalContext = null;
      if (!('creationContext' in t)) t.creationContext = null;

      // Migrate cluster string to clusterId
      const rels = t.relationships as Record<string, unknown> | undefined;
      if (rels && 'cluster' in rels && !('clusterId' in rels)) {
        const clusterName = rels.cluster as string | null;
        if (clusterName) {
          const cluster = ClusterStorage.ensureCluster(clusterName);
          rels.clusterId = cluster.id;
        } else {
          rels.clusterId = null;
        }
        delete rels.cluster;
      }

      return t;
    });

    localStorage.setItem(TASKS_KEY, JSON.stringify(migrated));
  } catch {
    // Don't crash on corrupt data — leave as-is
  }
}

function migrateV2(): void {
  // Backfill UserProfile from existing completion timestamps
  let tasks: Task[];
  try {
    tasks = TaskStorage.getAll();
  } catch {
    return; // Don't crash on corrupt data
  }
  const profile = ProfileStorage.get();

  for (const task of tasks) {
    if (task.status === 'completed' && task.completedAt) {
      const date = task.completedAt.split('T')[0];
      profile.completionsByDay[date] = (profile.completionsByDay[date] || 0) + 1;
      profile.totalCompleted++;
    }
    if (task.status === 'deferred' && task.deferrals > 0) {
      profile.totalDeferred += task.deferrals;
    }
  }

  profile.totalCreated = tasks.length;
  ProfileStorage.save(profile);
}
