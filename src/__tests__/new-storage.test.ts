import { describe, it, expect, beforeEach } from 'vitest';
import { ClusterStorage, MemoryStorage, ProfileStorage, ReflectionStorage, runMigrations, getMigrationVersion } from '../lib/storage';
import type { PersistentCluster, DailyReflection } from '../types';

describe('ClusterStorage', () => {
  beforeEach(() => { localStorage.clear(); });

  it('returns empty array when no clusters stored', () => {
    expect(ClusterStorage.getAll()).toEqual([]);
  });

  it('saves and retrieves a cluster', () => {
    const cluster: PersistentCluster = {
      id: 'c1', name: 'Work', description: 'Work tasks', createdAt: '2026-02-24T10:00:00Z', archivedAt: null,
    };
    ClusterStorage.save(cluster);
    expect(ClusterStorage.getAll()).toHaveLength(1);
    expect(ClusterStorage.getAll()[0].name).toBe('Work');
  });

  it('updates an existing cluster', () => {
    const cluster: PersistentCluster = {
      id: 'c1', name: 'Work', description: '', createdAt: '2026-02-24T10:00:00Z', archivedAt: null,
    };
    ClusterStorage.save(cluster);
    ClusterStorage.save({ ...cluster, description: 'Updated' });
    expect(ClusterStorage.getAll()).toHaveLength(1);
    expect(ClusterStorage.getAll()[0].description).toBe('Updated');
  });

  it('removes a cluster', () => {
    ClusterStorage.save({ id: 'c1', name: 'A', description: '', createdAt: '', archivedAt: null });
    ClusterStorage.save({ id: 'c2', name: 'B', description: '', createdAt: '', archivedAt: null });
    ClusterStorage.remove('c1');
    expect(ClusterStorage.getAll()).toHaveLength(1);
    expect(ClusterStorage.getAll()[0].id).toBe('c2');
  });

  it('finds by name case-insensitively', () => {
    ClusterStorage.save({ id: 'c1', name: 'Work Projects', description: '', createdAt: '', archivedAt: null });
    expect(ClusterStorage.findByName('work projects')?.id).toBe('c1');
    expect(ClusterStorage.findByName('WORK PROJECTS')?.id).toBe('c1');
  });

  it('findByName ignores archived clusters', () => {
    ClusterStorage.save({ id: 'c1', name: 'Old', description: '', createdAt: '', archivedAt: '2026-02-24T10:00:00Z' });
    expect(ClusterStorage.findByName('Old')).toBeUndefined();
  });

  it('ensureCluster returns existing cluster if found', () => {
    ClusterStorage.save({ id: 'c1', name: 'Work', description: '', createdAt: '', archivedAt: null });
    const result = ClusterStorage.ensureCluster('Work');
    expect(result.id).toBe('c1');
    expect(ClusterStorage.getAll()).toHaveLength(1);
  });

  it('ensureCluster creates new cluster if not found', () => {
    const result = ClusterStorage.ensureCluster('New Cluster');
    expect(result.name).toBe('New Cluster');
    expect(result.id).toBeTruthy();
    expect(ClusterStorage.getAll()).toHaveLength(1);
  });

  it('archives a cluster', () => {
    ClusterStorage.save({ id: 'c1', name: 'Done', description: '', createdAt: '', archivedAt: null });
    ClusterStorage.archive('c1');
    expect(ClusterStorage.getById('c1')?.archivedAt).toBeTruthy();
  });

  it('getActive excludes archived clusters', () => {
    ClusterStorage.save({ id: 'c1', name: 'Active', description: '', createdAt: '', archivedAt: null });
    ClusterStorage.save({ id: 'c2', name: 'Archived', description: '', createdAt: '', archivedAt: '2026-02-24T10:00:00Z' });
    expect(ClusterStorage.getActive()).toHaveLength(1);
    expect(ClusterStorage.getActive()[0].name).toBe('Active');
  });

  it('purgeArchived removes only archived clusters', () => {
    ClusterStorage.save({ id: 'c1', name: 'Active', description: '', createdAt: '', archivedAt: null });
    ClusterStorage.save({ id: 'c2', name: 'Archived', description: '', createdAt: '', archivedAt: '2026-02-24T10:00:00Z' });
    ClusterStorage.purgeArchived();
    expect(ClusterStorage.getAll()).toHaveLength(1);
    expect(ClusterStorage.getAll()[0].name).toBe('Active');
  });
});

describe('MemoryStorage', () => {
  beforeEach(() => { localStorage.clear(); });

  it('returns empty array when no memories stored', () => {
    expect(MemoryStorage.getAll()).toEqual([]);
  });

  it('saves a new memory', () => {
    const memory = MemoryStorage.save({ type: 'observation', content: 'User prefers mornings', source: 'chat', confidence: 0.7 });
    expect(memory.id).toBeTruthy();
    expect(memory.content).toBe('User prefers mornings');
    expect(MemoryStorage.getAll()).toHaveLength(1);
  });

  it('deduplicates by boosting confidence on duplicate content', () => {
    MemoryStorage.save({ type: 'observation', content: 'User likes tea', source: 'chat', confidence: 0.5 });
    const boosted = MemoryStorage.save({ type: 'observation', content: 'User likes tea', source: 'chat', confidence: 0.5 });
    expect(MemoryStorage.getAll()).toHaveLength(1);
    expect(boosted.confidence).toBe(0.6);
  });

  it('deduplication is case-insensitive', () => {
    MemoryStorage.save({ type: 'observation', content: 'Prefers mornings', source: 'chat', confidence: 0.5 });
    MemoryStorage.save({ type: 'observation', content: 'prefers mornings', source: 'chat', confidence: 0.5 });
    expect(MemoryStorage.getAll()).toHaveLength(1);
  });

  it('caps at 100 entries, removing lowest confidence', () => {
    for (let i = 0; i < 105; i++) {
      MemoryStorage.save({ type: 'observation', content: `Memory ${i}`, source: 'pattern', confidence: i / 105 });
    }
    expect(MemoryStorage.getAll().length).toBeLessThanOrEqual(100);
  });

  it('decays confidence and removes zero-confidence entries', () => {
    MemoryStorage.save({ type: 'observation', content: 'Low confidence', source: 'chat', confidence: 0.03 });
    MemoryStorage.save({ type: 'rule', content: 'High confidence', source: 'explicit', confidence: 0.9 });
    MemoryStorage.decayConfidence();
    const memories = MemoryStorage.getAll();
    expect(memories).toHaveLength(1);
    expect(memories[0].content).toBe('High confidence');
    expect(memories[0].confidence).toBeCloseTo(0.85);
  });

  it('getHighConfidence filters by threshold', () => {
    MemoryStorage.save({ type: 'observation', content: 'Low', source: 'chat', confidence: 0.1 });
    MemoryStorage.save({ type: 'rule', content: 'High', source: 'explicit', confidence: 0.8 });
    expect(MemoryStorage.getHighConfidence(0.5)).toHaveLength(1);
    expect(MemoryStorage.getHighConfidence(0.5)[0].content).toBe('High');
  });

  it('removes a memory by id', () => {
    const m = MemoryStorage.save({ type: 'observation', content: 'Delete me', source: 'chat', confidence: 0.5 });
    MemoryStorage.remove(m.id);
    expect(MemoryStorage.getAll()).toHaveLength(0);
  });
});

describe('ProfileStorage', () => {
  beforeEach(() => { localStorage.clear(); });

  it('returns empty profile when nothing stored', () => {
    const profile = ProfileStorage.get();
    expect(profile.totalCompleted).toBe(0);
    expect(profile.totalDeferred).toBe(0);
    expect(profile.currentStreak).toBe(0);
  });

  it('records completion and updates totals', () => {
    ProfileStorage.recordCompletion('2026-02-24', 'morning');
    const profile = ProfileStorage.get();
    expect(profile.totalCompleted).toBe(1);
    expect(profile.completionsByDay['2026-02-24']).toBe(1);
    expect(profile.completionsByTime.morning).toBe(1);
  });

  it('records deferral and updates totals', () => {
    ProfileStorage.recordDeferral('2026-02-24', 'afternoon');
    const profile = ProfileStorage.get();
    expect(profile.totalDeferred).toBe(1);
    expect(profile.deferralsByDay['2026-02-24']).toBe(1);
    expect(profile.deferralsByTime.afternoon).toBe(1);
  });

  it('records creation and updates totals', () => {
    ProfileStorage.recordCreation('evening');
    const profile = ProfileStorage.get();
    expect(profile.totalCreated).toBe(1);
    expect(profile.creationsByTime.evening).toBe(1);
  });

  it('starts streak on first completion', () => {
    ProfileStorage.recordCompletion('2026-02-24', 'morning');
    const profile = ProfileStorage.get();
    expect(profile.currentStreak).toBe(1);
    expect(profile.longestStreak).toBe(1);
    expect(profile.lastActiveDate).toBe('2026-02-24');
  });

  it('increments streak on consecutive days', () => {
    ProfileStorage.recordCompletion('2026-02-23', 'morning');
    ProfileStorage.recordCompletion('2026-02-24', 'morning');
    const profile = ProfileStorage.get();
    expect(profile.currentStreak).toBe(2);
    expect(profile.longestStreak).toBe(2);
  });

  it('resets streak on non-consecutive days', () => {
    ProfileStorage.recordCompletion('2026-02-20', 'morning');
    ProfileStorage.recordCompletion('2026-02-24', 'morning');
    const profile = ProfileStorage.get();
    expect(profile.currentStreak).toBe(1);
    expect(profile.longestStreak).toBe(1);
  });

  it('does not increment streak for same-day completions', () => {
    ProfileStorage.recordCompletion('2026-02-24', 'morning');
    ProfileStorage.recordCompletion('2026-02-24', 'afternoon');
    const profile = ProfileStorage.get();
    expect(profile.currentStreak).toBe(1);
    expect(profile.totalCompleted).toBe(2);
  });
});

describe('ReflectionStorage', () => {
  beforeEach(() => { localStorage.clear(); });

  it('returns null when no reflection stored', () => {
    expect(ReflectionStorage.get()).toBeNull();
  });

  it('saves and retrieves a reflection', () => {
    const reflection: DailyReflection = {
      date: '2026-02-23',
      tasksCompleted: 5,
      tasksDeferred: 2,
      focusTasksHit: 3,
      focusTasksTotal: 4,
      topCompletedTitles: ['Task A', 'Task B'],
      topDeferredTitles: ['Task C'],
    };
    ReflectionStorage.save(reflection);
    const stored = ReflectionStorage.get();
    expect(stored?.date).toBe('2026-02-23');
    expect(stored?.tasksCompleted).toBe(5);
    expect(stored?.topCompletedTitles).toEqual(['Task A', 'Task B']);
  });

  it('overwrites previous reflection', () => {
    ReflectionStorage.save({ date: '2026-02-22', tasksCompleted: 3, tasksDeferred: 1, focusTasksHit: 2, focusTasksTotal: 3, topCompletedTitles: [], topDeferredTitles: [] });
    ReflectionStorage.save({ date: '2026-02-23', tasksCompleted: 5, tasksDeferred: 0, focusTasksHit: 4, focusTasksTotal: 4, topCompletedTitles: [], topDeferredTitles: [] });
    expect(ReflectionStorage.get()?.date).toBe('2026-02-23');
  });
});

describe('Migrations', () => {
  beforeEach(() => { localStorage.clear(); });

  it('migrates V1: adds new Task fields', () => {
    const oldTasks = [
      {
        id: 't1', text: 'test', parsed: { title: 'Test', deadline: null, tags: [] },
        importance: 'medium', relationships: { blocks: [], blockedBy: [], cluster: null },
        status: 'active', deferrals: 0, createdAt: '2026-02-21T10:00:00Z',
        completedAt: null, lastSurfacedAt: null,
      },
    ];
    localStorage.setItem('crush-tasks', JSON.stringify(oldTasks));
    runMigrations();

    const tasks = JSON.parse(localStorage.getItem('crush-tasks')!);
    expect(tasks[0].estimatedEffort).toBeNull();
    expect(tasks[0].emotionalContext).toBeNull();
    expect(tasks[0].creationContext).toBeNull();
    expect(tasks[0].relationships.clusterId).toBeNull();
    expect(tasks[0].relationships.cluster).toBeUndefined();
  });

  it('migrates V1: converts cluster name to PersistentCluster reference', () => {
    const oldTasks = [
      {
        id: 't1', text: 'test', parsed: { title: 'Test', deadline: null, tags: [] },
        importance: 'medium', relationships: { blocks: [], blockedBy: [], cluster: 'Work Project' },
        status: 'active', deferrals: 0, createdAt: '2026-02-21T10:00:00Z',
        completedAt: null, lastSurfacedAt: null,
      },
    ];
    localStorage.setItem('crush-tasks', JSON.stringify(oldTasks));
    runMigrations();

    const tasks = JSON.parse(localStorage.getItem('crush-tasks')!);
    expect(tasks[0].relationships.clusterId).toBeTruthy();
    expect(tasks[0].relationships.cluster).toBeUndefined();

    const clusters = ClusterStorage.getAll();
    expect(clusters).toHaveLength(1);
    expect(clusters[0].name).toBe('Work Project');
    expect(clusters[0].id).toBe(tasks[0].relationships.clusterId);
  });

  it('migrates V2: backfills UserProfile from completed tasks', () => {
    const tasks = [
      {
        id: 't1', text: 'done', parsed: { title: 'Done', deadline: null, tags: [] },
        importance: 'medium', relationships: { blocks: [], blockedBy: [], clusterId: null },
        status: 'completed', deferrals: 0, createdAt: '2026-02-20T10:00:00Z',
        completedAt: '2026-02-21T10:00:00Z', lastSurfacedAt: null,
        estimatedEffort: null, emotionalContext: null, creationContext: null,
      },
      {
        id: 't2', text: 'deferred', parsed: { title: 'Deferred', deadline: null, tags: [] },
        importance: 'medium', relationships: { blocks: [], blockedBy: [], clusterId: null },
        status: 'deferred', deferrals: 3, createdAt: '2026-02-20T10:00:00Z',
        completedAt: null, lastSurfacedAt: null,
        estimatedEffort: null, emotionalContext: null, creationContext: null,
      },
    ];
    localStorage.setItem('crush-tasks', JSON.stringify(tasks));
    localStorage.setItem('crush-migration-version', '1'); // Skip V1
    runMigrations();

    const profile = ProfileStorage.get();
    expect(profile.totalCompleted).toBe(1);
    expect(profile.totalDeferred).toBe(3);
    expect(profile.totalCreated).toBe(2);
  });

  it('is idempotent — running twice does not double-count', () => {
    const oldTasks = [
      {
        id: 't1', text: 'test', parsed: { title: 'Test', deadline: null, tags: [] },
        importance: 'medium', relationships: { blocks: [], blockedBy: [], cluster: 'X' },
        status: 'completed', deferrals: 0, createdAt: '2026-02-21T10:00:00Z',
        completedAt: '2026-02-21T10:00:00Z', lastSurfacedAt: null,
      },
    ];
    localStorage.setItem('crush-tasks', JSON.stringify(oldTasks));
    runMigrations();

    const version = getMigrationVersion();
    expect(version).toBe(2);

    // Running again should not change anything
    runMigrations();
    expect(getMigrationVersion()).toBe(2);
    expect(ClusterStorage.getAll()).toHaveLength(1);
  });

  it('handles corrupt task data gracefully', () => {
    localStorage.setItem('crush-tasks', 'not valid json');
    expect(() => runMigrations()).not.toThrow();
  });
});
