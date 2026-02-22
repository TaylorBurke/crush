# Crush -- AI-Powered Task Intelligence System

**Date:** 2026-02-21
**Status:** Approved
**Codename:** Crush

## Overview

Crush is a Chrome new-tab extension that replaces the default new tab page with a focused, AI-powered task management system. It is designed for a creative, chaotic workflow where tasks are interrelated, half-formed, and need intelligent surfacing rather than rigid categorization.

The core philosophy: **the app thinks for you.** AI silently manages priorities, detects relationships, nudges you toward important-but-deferred work, and gets out of the way. A conversational interface is available on demand but is not the primary interaction.

## Target User Profile

- Creative + chaotic task landscape (side projects, ideas, inspirations, professional work)
- Needs zero-friction capture without forced structure
- Wants to focus on important work, not just urgent work
- Needs help with procrastination and stale tasks
- Values a clean, warm, personal aesthetic

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Extension framework | WXT | Actively maintained, Vite-based, TypeScript-first, built-in new-tab support |
| UI framework | React 19 | Familiar from cock-pit, latest features |
| Language | TypeScript 5 | Type safety for the data model |
| Styling | Tailwind CSS 4 | Familiar, fast, utility-first |
| AI model | GPT-4o-mini (OpenAI) | Fast, cheap, sufficient for parsing + prioritization |
| Task storage | localStorage | Simple, offline-first, zero-backend |
| Settings/key storage | chrome.storage.local | Chrome-encrypted, extension-only access |
| Build tool | Vite (via WXT) | Fast builds, HMR |

## Data Model

### Task (Source of Truth)

```typescript
interface Task {
  id: string                          // UUID
  text: string                        // Raw user input
  parsed: {
    title: string                     // AI-extracted clean title
    deadline: string | null           // ISO date string
    tags: string[]                    // AI-inferred tags
  }
  importance: 'high' | 'medium' | 'low'  // AI-inferred, user-overridable
  relationships: {
    blocks: string[]                  // Task IDs this blocks
    blockedBy: string[]               // Task IDs blocking this
    cluster: string | null            // Thematic group ID
  }
  status: 'active' | 'completed' | 'deferred' | 'someday'
  deferrals: number                   // Times deferred
  createdAt: string                   // ISO timestamp
  completedAt: string | null
  lastSurfacedAt: string | null       // When AI last showed this
}
```

### ComputedView (AI's Cached Opinion)

```typescript
interface ComputedView {
  generatedAt: string
  focusToday: string[]                // 2-4 task IDs to show prominently
  nudges: Array<{
    taskId: string
    message: string                   // Warm, personal tone
  }>
  urgencyScores: Record<string, {
    score: number                     // 0-1 composite
    reasons: string[]                 // Human-readable explanations
  }>
  clusters: Array<{
    id: string
    name: string                      // e.g. "portfolio redesign"
    taskIds: string[]
    progress: number                  // 0-1 completion ratio
  }>
}
```

### Key Design Decision: Task vs ComputedView Separation

Task is the stable source of truth. ComputedView is the AI's ephemeral analysis. Today, ComputedView is generated on-demand (daily brief + explicit triggers). The architecture supports evolving to background sync (Chrome alarm API generating ComputedView on a timer) without changing the new-tab page code -- it just reads from whatever's in the cache.

## AI Integration

### Three Touchpoints

#### 1. Task Parser (every new task)
- **Trigger:** User submits text in the smart input
- **Model:** GPT-4o-mini
- **Input:** Raw text + list of existing task titles/IDs for relationship matching
- **Output:** Parsed title, deadline, importance, relationships, tags, cluster assignment
- **Latency:** ~500ms
- **Cost:** ~$0.001 per task

#### 2. Daily Brief (once per day)
- **Trigger:** First new-tab open after 4:00 AM (day rollover)
- **Model:** GPT-4o-mini
- **Input:** Full task list + completion history + deferral counts + date
- **Output:** Full ComputedView (focus picks, nudges, urgency scores, clusters)
- **Cached:** Until next day's rollover
- **Cost:** ~$0.01-0.03 per day

#### 3. On-Demand Chat (user-initiated)
- **Trigger:** User clicks "Ask AI" button
- **Model:** GPT-4o-mini
- **Input:** User question + full task graph + current ComputedView
- **Capabilities:** Prioritization advice, task breakdown, procrastination help, big-picture analysis
- **UI:** Slide-over panel from the right

### API Key Management
- User provides OpenAI API key once in settings
- Stored in chrome.storage.local (Chrome-encrypted, extension-only)
- All calls go directly from extension to OpenAI (no intermediary server)
- No data leaves the browser except to OpenAI

### Urgency Computation
Urgency is never stored -- always computed fresh in ComputedView from:
- Deadline proximity
- Importance propagation through blocking chains (if Task C is important and blocked by Task B, Task B gets high urgency)
- Deferral count (more deferrals = rising urgency)
- Staleness (old, untouched tasks)

## UI Design

### Visual Identity
- **Tone:** Warm, personal, friendly -- feels like a supportive friend
- **Style:** Soft colors, rounded corners, generous whitespace
- **Personality:** Casual greetings, gentle nudges, encouraging language

### Layout

```
+---------------------------------------------+
|                                              |
|  hey. here's your saturday.       [Ask AI]   |
|                                              |
|  +---------------------------------------+   |
|  | what's next?                           |   |
|  +---------------------------------------+   |
|                                              |
|  -- focus on these -------------------------  |
|                                              |
|  +------------+  +------------+              |
|  | Task Card  |  | Task Card  |              |
|  | title      |  | title      |              |
|  | deadline   |  | staleness  |              |
|  | blocks: N  |  | quick win  |              |
|  +------------+  +------------+              |
|                                              |
|  -- you've been putting off -----------------  |
|  [ ] Deferred task 1            deferred 4x  |
|  [ ] Deferred task 2            2 weeks old  |
|                                              |
|  -- cluster name ----------- 3/7 done ------  |
|  [ ] subtask  [ ] subtask  [x] subtask       |
|                                              |
|  -- someday -------------------- (12) ------  |
|                                              |
+---------------------------------------------+
```

### Sections
1. **Greeting** -- Time-aware, casual (changes by time of day)
2. **Smart Input** -- Always at top, always ready. Single text field, AI parses
3. **Focus Cards** -- 2-4 cards, AI-selected. Today's priorities
4. **Nudge Section** -- "you've been putting off" -- deferred/stale tasks with accountability
5. **Cluster Sections** -- AI-detected thematic groups with progress. Collapsible
6. **Someday Bucket** -- Collapsed by default. Safe parking for non-actionable ideas

### Interactions
- Click task card to expand (details, relationships, notes)
- Complete / Defer ("not today") / Move to someday via buttons or swipe
- Right-click for: edit, delete, set importance, link to another task
- "Ask AI" opens slide-over chat panel

### Nudge Personality Examples
- "hey, this has been sitting here for 2 weeks. still want it?"
- "you've pushed this off 4 times. want to break it into smaller pieces?"
- "this is blocking 3 other things you care about. maybe today?"
- "nice -- you knocked out 4 things yesterday. keep that momentum?"

## Task Lifecycle

```
                  +------------+
  User types --> |   ACTIVE   | --> Complete --> Done
                  +-----+------+
                        |
                  Defer ("not today")
                        |
                  +-----v------+
                  |  DEFERRED  | --> AI resurfaces in
                  |  (count++) |     "putting off" section
                  +-----+------+
                        |
                  Defer again / "someday"
                        |
                  +-----v------+
                  |   SOMEDAY  | --> AI may surface if
                  |            |     context changes
                  +------------+
```

## Chrome Extension Architecture

### Manifest V3 Structure
```
crush/
  manifest.json
  src/
    newtab/              # New tab page (React app)
      App.tsx
      index.html
      components/
        SmartInput.tsx
        FocusCards.tsx
        NudgeSection.tsx
        ClusterSection.tsx
        SomedayBucket.tsx
        AIChatPanel.tsx
        TaskCard.tsx
        Greeting.tsx
    background/
      service-worker.ts  # Stubbed for future background sync
    hooks/
      useTasks.ts
      useComputedView.ts
      useAI.ts
      useSettings.ts
    lib/
      ai-client.ts       # OpenAI API wrapper
      task-parser.ts      # AI prompt construction for parsing
      daily-brief.ts      # AI prompt construction for daily brief
      storage.ts          # localStorage wrapper
      date.ts             # 4 AM rollover logic
    types/
      index.ts            # Task, ComputedView, etc.
  public/
    icons/               # Extension icons (16, 48, 128)
  vite.config.ts
  wxt.config.ts
  tailwind.config.ts
  tsconfig.json
  package.json
```

### Permissions
- `chrome_url_overrides.newtab` -- new tab replacement
- `storage` -- chrome.storage.local for API key and settings

Minimal permission footprint for straightforward Chrome Web Store approval.

### Evolution Path to Background Sync
The service worker is stubbed from day one. When ready:
1. Add `alarms` permission to manifest
2. Implement alarm listener in service-worker.ts (every 30-60 min)
3. Background worker calls AI, writes ComputedView to storage
4. New tab page already reads from ComputedView cache -- no changes needed

## Estimated OpenAI Costs
- Task creation: ~$0.001/task
- Daily brief: ~$0.01-0.03/day
- Chat queries: ~$0.005-0.02/query
- **Typical daily cost: $0.02-0.10**
- **Monthly estimate: $1-3**

## Publishing
- Chrome Web Store: one-time $5 developer fee
- First review: a few days to one week
- Minimal permissions = low-friction approval
- Can start as unlisted (direct link only) and go public later
