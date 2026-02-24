# Chat Persistence & Context Mining Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Persist chat history to localStorage, fix the daily greeting re-firing bug, feed recent chat into AI prompts, and add proactive task suggestion to the chat advisor.

**Architecture:** New `ChatStorage` module in `storage.ts` keyed per day (`crush-chat-YYYY-MM-DD`). `useAI` hydrates `chatHistory` from storage on init and persists each message. `buildDailyBriefPrompt` and `generateGreeting` accept recent chat for context injection. Chat advisor prompt gets a proactive task suggestion paragraph.

**Tech Stack:** React 19, TypeScript, Vitest, localStorage

---

### Task 1: ChatStorage — write failing tests

**Files:**
- Modify: `src/__tests__/storage.test.ts`

**Step 1: Write failing tests for ChatStorage**

Add a new `describe('ChatStorage', ...)` block after the existing `TaskStorage` tests. These tests cover all four methods plus the 7-day purge logic.

```typescript
import { TaskStorage, ChatStorage } from '../lib/storage';
import type { Task, ChatMessage } from '../types';

// (existing makeTask helper stays)

function makeMsg(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    role: 'assistant',
    content: 'hello',
    timestamp: '2026-02-23T10:00:00Z',
    ...overrides,
  };
}

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
    // Manually set messages for yesterday and today
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
    // Set a message for 5 days ago
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
```

Note: Update the import at the top to include `ChatStorage` and `ChatMessage`.

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/storage.test.ts`
Expected: FAIL — `ChatStorage` is not exported from `../lib/storage`

---

### Task 2: ChatStorage — implement

**Files:**
- Modify: `src/lib/storage.ts`

**Step 1: Implement ChatStorage**

Add to the bottom of `storage.ts`, after `BriefStorage`:

```typescript
import type { Task, ComputedView, ChatMessage } from '../types';

// ... (existing code) ...

const CHAT_KEY_PREFIX = 'crush-chat-';

function chatKeyForDate(date: Date): string {
  return CHAT_KEY_PREFIX + date.toISOString().split('T')[0];
}

export const ChatStorage = {
  getToday(): ChatMessage[] {
    const key = chatKeyForDate(new Date());
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try { return JSON.parse(raw) as ChatMessage[]; }
    catch { return []; }
  },

  getRecent(days: number): ChatMessage[] {
    const messages: ChatMessage[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = chatKeyForDate(d);
      const raw = localStorage.getItem(key);
      if (raw) {
        try { messages.push(...(JSON.parse(raw) as ChatMessage[])); }
        catch { /* skip corrupt entries */ }
      }
    }
    return messages;
  },

  saveMessage(msg: ChatMessage): void {
    const key = chatKeyForDate(new Date());
    const existing = this.getToday();
    existing.push(msg);
    localStorage.setItem(key, JSON.stringify(existing));
  },

  purgeOld(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().split('T')[0];

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
```

Also update the import at the top of `storage.ts` to include `ChatMessage`:

```typescript
import type { Task, ComputedView, ChatMessage } from '../types';
```

**Step 2: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/storage.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/lib/storage.ts src/__tests__/storage.test.ts
git commit -m "feat: add ChatStorage for per-day chat persistence"
```

---

### Task 3: Daily brief context injection — write failing tests

**Files:**
- Modify: `src/__tests__/daily-brief.test.ts`

**Step 1: Write failing tests for recentChat parameter**

Add these tests inside the existing `describe('buildDailyBriefPrompt', ...)` block:

```typescript
it('includes recent chat context when provided', () => {
  const tasks = [makeTask()];
  const recentChat: ChatMessage[] = [
    { role: 'user', content: 'I want to focus on design this week', timestamp: '2026-02-22T14:00:00Z' },
    { role: 'assistant', content: 'Got it, shifting focus to design tasks.', timestamp: '2026-02-22T14:00:05Z' },
  ];
  const messages = buildDailyBriefPrompt(tasks, undefined, recentChat);
  const sysMsg = messages.find((m) => m.role === 'system');
  expect(sysMsg?.content).toContain('Recent conversations');
  expect(sysMsg?.content).toContain('I want to focus on design this week');
});

it('omits recent chat section when recentChat is empty', () => {
  const tasks = [makeTask()];
  const messages = buildDailyBriefPrompt(tasks, undefined, []);
  const sysMsg = messages.find((m) => m.role === 'system');
  expect(sysMsg?.content).not.toContain('Recent conversations');
});

it('truncates recent chat to last 20 messages', () => {
  const tasks = [makeTask()];
  const recentChat: ChatMessage[] = Array.from({ length: 30 }, (_, i) => ({
    role: 'user' as const,
    content: `message ${i}`,
    timestamp: '2026-02-23T10:00:00Z',
  }));
  const messages = buildDailyBriefPrompt(tasks, undefined, recentChat);
  const sysMsg = messages.find((m) => m.role === 'system');
  expect(sysMsg?.content).toContain('message 10');
  expect(sysMsg?.content).toContain('message 29');
  expect(sysMsg?.content).not.toContain('message 9');
});
```

Note: Update the import to include `ChatMessage` type:
```typescript
import type { Task, ChatMessage } from '../types';
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/daily-brief.test.ts`
Expected: FAIL — the new tests fail because `buildDailyBriefPrompt` doesn't accept `recentChat` yet (tests pass vacuously for the `undefined` case but fail for the content assertions)

---

### Task 4: Daily brief context injection — implement

**Files:**
- Modify: `src/lib/daily-brief.ts`

**Step 1: Add recentChat parameter to buildDailyBriefPrompt**

Update the function signature and add the recent chat section to the system prompt. The new parameter goes after `chatContext`:

```typescript
import type { Task, ComputedView, ChatMessage } from '../types';

export function buildDailyBriefPrompt(tasks: Task[], chatContext?: string, recentChat?: ChatMessage[]): Message[] {
```

At the end of the system prompt content string (before the closing backtick), after the existing `chatContext` conditional, add:

```typescript
${recentChat && recentChat.length > 0 ? `\n\nRecent conversations (use these to understand the user's mindset and priorities):\n${recentChat.slice(-20).map((m) => `${m.role}: ${m.content}`).join('\n')}` : ''}
```

**Step 2: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/daily-brief.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/lib/daily-brief.ts src/__tests__/daily-brief.test.ts
git commit -m "feat: inject recent chat context into daily brief prompt"
```

---

### Task 5: Hydrate useAI chatHistory from storage & persist messages

**Files:**
- Modify: `src/hooks/useAI.ts`

**Step 1: Import ChatStorage**

At the top of `useAI.ts`, add `ChatStorage` to the storage import:

```typescript
import { ViewStorage, BriefStorage, ChatStorage } from '../lib/storage';
```

**Step 2: Hydrate chatHistory on init**

Change line 14 from:

```typescript
const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
```

to:

```typescript
const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => ChatStorage.getToday());
```

**Step 3: Persist messages in chat()**

In the `chat` function, after creating `newUserMsg` (line 59), add:

```typescript
ChatStorage.saveMessage(newUserMsg);
```

After creating `assistantMsg` (line 122), add:

```typescript
ChatStorage.saveMessage(assistantMsg);
```

Similarly for the error case — after creating `errorResponse` (line 127), add:

```typescript
ChatStorage.saveMessage(errorResponse);
```

**Step 4: Persist greeting message in generateGreeting()**

After creating `assistantMsg` (line 172), add:

```typescript
ChatStorage.saveMessage(assistantMsg);
```

**Step 5: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/hooks/useAI.ts
git commit -m "feat: hydrate chat history from storage and persist messages"
```

---

### Task 6: Wire up purge and context injection in App.tsx

**Files:**
- Modify: `entrypoints/newtab/App.tsx`

**Step 1: Import ChatStorage**

Update the storage import:

```typescript
import { ViewStorage, TaskStorage, ChatStorage } from '../../src/lib/storage';
```

**Step 2: Add purgeOld() call on mount**

In the `useEffect` that calls `TaskStorage.purgeCompleted()` (around line 39), add `ChatStorage.purgeOld()` right after:

```typescript
TaskStorage.purgeCompleted();
ChatStorage.purgeOld();
```

**Step 3: Pass recent chat to generateBrief**

In the same `useEffect`, update the `ai.generateBrief(tasks)` call to include recent chat:

```typescript
ai.generateBrief(tasks, false, undefined, ChatStorage.getRecent(2)).then(async (view) => {
```

**Step 4: Update generateBrief signature in useAI**

The `generateBrief` function in `useAI.ts` needs to accept and forward `recentChat`. Update its signature:

```typescript
const generateBrief = useCallback(async (tasks: Task[], force = false, chatContext?: string, recentChat?: ChatMessage[]): Promise<ComputedView | null> => {
```

And update the `buildDailyBriefPrompt` call inside it:

```typescript
const messages = buildDailyBriefPrompt(tasks, chatContext, recentChat);
```

**Step 5: Pass recent chat to generateGreeting**

In App.tsx, update the `generateGreeting` call to pass yesterday's chat:

```typescript
const greeting = await ai.generateGreeting(tasks, view, ChatStorage.getRecent(2));
```

And in `useAI.ts`, update `generateGreeting` to accept and use it:

```typescript
const generateGreeting = useCallback(async (tasks: Task[], view: ComputedView, recentChat?: ChatMessage[]): Promise<string | null> => {
```

Add recent chat to the greeting's user message content, after the existing brief context:

```typescript
content: `Today's brief:\n- Focus tasks: ${focusNames.join(', ') || 'none set'}\n- Nudges: ${nudgeMessages.join('; ') || 'none'}\n- Top urgency: ${topUrgent.join(', ') || 'nothing pressing'}\n- Clusters: ${clusterSummary.join(', ') || 'none'}\n- Total active tasks: ${tasks.filter((t) => t.status === 'active').length}${recentChat && recentChat.length > 0 ? `\n\nRecent conversations:\n${recentChat.slice(-10).map((m) => `${m.role}: ${m.content}`).join('\n')}` : ''}`,
```

**Step 6: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

**Step 7: Run type check**

Run: `npm run compile`
Expected: No errors

**Step 8: Commit**

```bash
git add entrypoints/newtab/App.tsx src/hooks/useAI.ts
git commit -m "feat: wire chat purge and context injection on mount"
```

---

### Task 7: Proactive task suggestion — prompt tweak

**Files:**
- Modify: `src/hooks/useAI.ts`

**Step 1: Add proactive task suggestion paragraph to chat system prompt**

In the `chat` function's system prompt (the long template string), add the following paragraph after the "When NOT to use [ACTIONS]" section and before the "Action format" section:

```
Additionally, if the user mentions something that sounds like a task they haven't captured yet (e.g. "I really need to call the dentist", "I should start working on that proposal", "ugh, taxes are due soon"), go ahead and create it for them using an [ACTIONS] create block. Preface it conversationally — e.g. "sounds like that could be a task — i've added it for you. let me know if you want to tweak the priority or deadline."

Compare against the current task list to avoid duplicates. Only do this for clear task-like intent, not casual mentions.
```

**Step 2: Run type check**

Run: `npm run compile`
Expected: No errors

**Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/hooks/useAI.ts
git commit -m "feat: add proactive task suggestion to chat advisor prompt"
```

---

### Task 8: Manual smoke test

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test chat persistence**

1. Open a new tab — greeting should appear and chat panel opens
2. Send a message in chat — verify response works
3. Open another new tab — chat history should be preserved, no second greeting
4. Close all tabs, open a new one — chat history still there for today

**Step 3: Test context injection**

1. Chat about priorities ("I want to focus on writing this week")
2. Wait, then force a brief recompute (modify a task)
3. Verify the brief accounts for the conversation context

**Step 4: Test proactive task suggestion**

1. In chat, say something like "I really need to call the dentist"
2. Verify Crush creates a task via [ACTIONS] block
3. Check that the task appears in the task list

**Step 5: Test purging**

1. In devtools console, manually set an old chat key:
   ```javascript
   localStorage.setItem('crush-chat-2026-02-10', '[{"role":"user","content":"old","timestamp":"2026-02-10T10:00:00Z"}]')
   ```
2. Open a new tab (triggers purge)
3. Verify the old key is removed from localStorage
