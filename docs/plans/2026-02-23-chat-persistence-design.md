# Chat Persistence & Context Mining Design

## Problem

1. **Daily brief greeting bug**: `chatHistory` in `useAI` is `useState([])` — empty every new tab mount. The greeting guard (`chatHistory.length === 0`) always passes, so users get a new greeting on every tab open even though the brief itself is correctly cached via `BriefStorage`.

2. **No chat persistence**: All chat history lives in React state. Every new tab is a blank slate — no continuity within a day, no memory across days.

3. **Missed context**: Chat conversations contain valuable signal (priorities, intent, implicit tasks) that the AI never sees again after the tab closes.

## Approach: Flat chat log with daily context window

Persist chat messages to localStorage keyed by date. Feed recent chat history into AI prompts for richer context. Add proactive task suggestion to the chat advisor prompt.

## Design

### 1. ChatStorage (storage.ts)

New storage module alongside `TaskStorage`, `ViewStorage`, `BriefStorage`.

Key format: `crush-chat-YYYY-MM-DD`

```typescript
ChatStorage = {
  getToday(): ChatMessage[]        // Load today's chat log
  getRecent(days: number): ChatMessage[]  // Load last N days of messages
  saveMessage(msg: ChatMessage): void     // Append message to today's log
  purgeOld(): void                 // Delete crush-chat-* keys older than 7 days
}
```

`purgeOld()` iterates localStorage keys matching `crush-chat-*`, parses the date suffix, and removes entries older than 7 days.

### 2. Greeting deduplication (bug fix)

Initialize `chatHistory` in `useAI` from `ChatStorage.getToday()` instead of `[]`. When today's chat already has messages, `chatHistory.length > 0` naturally skips the greeting. No new flags needed.

`greetedRef` in `App.tsx` remains as a session-level safety net (prevents double-greeting within a single tab lifecycle).

### 3. Context injection

**Daily brief** (`buildDailyBriefPrompt`): New optional `recentChat?: ChatMessage[]` parameter. Appends a "Recent conversations" section to the system prompt with the last 1-2 days of chat, truncated to ~20 most recent messages.

**Greeting** (`generateGreeting`): Include yesterday's chat in the greeting context so Crush can reference prior conversations.

**Chat advisor**: Already receives `chatHistory` via the message array. Once `chatHistory` is hydrated from storage, cross-tab continuity within a day works automatically.

### 4. Proactive task suggestions (prompt tweak)

Add to the chat advisor system prompt: if the user mentions something that sounds like an uncaptured task, gently suggest creating it using the existing `[ACTIONS]` block mechanism. No new code paths — pure prompt engineering.

### 5. Wiring

**`useAI.ts`**:
- Init `chatHistory` from `ChatStorage.getToday()`
- Call `ChatStorage.saveMessage()` after each user + assistant message in `chat()` and `generateGreeting()`

**`App.tsx`**:
- Call `ChatStorage.purgeOld()` on mount alongside `TaskStorage.purgeCompleted()`
- Pass `ChatStorage.getRecent(2)` into `generateBrief` and `generateGreeting`

**`daily-brief.ts`**:
- `buildDailyBriefPrompt` accepts optional `recentChat?: ChatMessage[]`
- Appends truncated recent conversation section to system prompt

### 6. Purging

Chat logs older than 7 days are purged on app mount. Same trigger point as `TaskStorage.purgeCompleted()`.

## Not included (YAGNI)

- Structured session metadata / topic extraction
- Chat summarization (can add later if prompt size becomes an issue)
- Cross-device sync (would need chrome.storage.sync)
- Explicit "implicit task" detection pipeline (the AI handles this via prompt)
