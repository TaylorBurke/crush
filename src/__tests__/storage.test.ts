import { describe, it, expect, beforeEach } from 'vitest';
import { TaskStorage, ChatStorage } from '../lib/storage';
import type { Task, ChatMessage } from '../types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'test-1',
    text: 'test task',
    parsed: { title: 'Test Task', deadline: null, tags: [] },
    importance: 'medium',
    relationships: { blocks: [], blockedBy: [], cluster: null },
    status: 'active',
    deferrals: 0,
    createdAt: '2026-02-21T10:00:00Z',
    completedAt: null,
    lastSurfacedAt: null,
    ...overrides,
  };
}

function makeMsg(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    role: 'assistant',
    content: 'hello',
    timestamp: '2026-02-23T10:00:00Z',
    ...overrides,
  };
}

describe('TaskStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when no tasks stored', () => {
    expect(TaskStorage.getAll()).toEqual([]);
  });

  it('saves and retrieves a task', () => {
    const task = makeTask();
    TaskStorage.save(task);
    const tasks = TaskStorage.getAll();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe('test-1');
  });

  it('updates an existing task', () => {
    const task = makeTask();
    TaskStorage.save(task);
    TaskStorage.save({ ...task, status: 'completed' });
    const tasks = TaskStorage.getAll();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].status).toBe('completed');
  });

  it('deletes a task', () => {
    TaskStorage.save(makeTask({ id: 'a' }));
    TaskStorage.save(makeTask({ id: 'b' }));
    TaskStorage.remove('a');
    const tasks = TaskStorage.getAll();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe('b');
  });

  it('gets a task by id', () => {
    TaskStorage.save(makeTask({ id: 'find-me' }));
    const found = TaskStorage.getById('find-me');
    expect(found?.id).toBe('find-me');
  });

  it('returns undefined for missing task', () => {
    expect(TaskStorage.getById('nope')).toBeUndefined();
  });
});

describe('ChatStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when no messages stored for today', () => {
    expect(ChatStorage.getToday()).toEqual([]);
  });

  it('saves and retrieves a message for today', () => {
    const msg = makeMsg({ content: 'hey there' });
    ChatStorage.saveMessage(msg);
    const messages = ChatStorage.getToday();
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('hey there');
  });

  it('appends multiple messages to the same day', () => {
    ChatStorage.saveMessage(makeMsg({ role: 'user', content: 'q1' }));
    ChatStorage.saveMessage(makeMsg({ role: 'assistant', content: 'a1' }));
    const messages = ChatStorage.getToday();
    expect(messages).toHaveLength(2);
    expect(messages[0].content).toBe('q1');
    expect(messages[1].content).toBe('a1');
  });

  it('getRecent returns messages from multiple days', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `crush-chat-${yesterday.toISOString().split('T')[0]}`;
    localStorage.setItem(yesterdayKey, JSON.stringify([makeMsg({ content: 'yesterday msg' })]));

    ChatStorage.saveMessage(makeMsg({ content: 'today msg' }));

    const recent = ChatStorage.getRecent(2);
    expect(recent).toHaveLength(2);
    expect(recent[0].content).toBe('yesterday msg');
    expect(recent[1].content).toBe('today msg');
  });

  it('getRecent only returns days within the range', () => {
    const old = new Date();
    old.setDate(old.getDate() - 5);
    const oldKey = `crush-chat-${old.toISOString().split('T')[0]}`;
    localStorage.setItem(oldKey, JSON.stringify([makeMsg({ content: 'old msg' })]));

    ChatStorage.saveMessage(makeMsg({ content: 'today msg' }));

    const recent = ChatStorage.getRecent(2);
    expect(recent).toHaveLength(1);
    expect(recent[0].content).toBe('today msg');
  });

  it('purgeOld removes chat logs older than 7 days', () => {
    const old = new Date();
    old.setDate(old.getDate() - 10);
    const oldKey = `crush-chat-${old.toISOString().split('T')[0]}`;
    localStorage.setItem(oldKey, JSON.stringify([makeMsg()]));

    ChatStorage.saveMessage(makeMsg({ content: 'today' }));

    ChatStorage.purgeOld();

    expect(localStorage.getItem(oldKey)).toBeNull();
    expect(ChatStorage.getToday()).toHaveLength(1);
  });

  it('purgeOld keeps chat logs within 7 days', () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 3);
    const recentKey = `crush-chat-${recent.toISOString().split('T')[0]}`;
    localStorage.setItem(recentKey, JSON.stringify([makeMsg()]));

    ChatStorage.purgeOld();

    expect(localStorage.getItem(recentKey)).not.toBeNull();
  });
});
