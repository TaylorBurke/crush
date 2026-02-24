# Crush

**AI-powered task intelligence for your new tab -- crush the day.**

Crush is a Chrome extension that replaces your new tab page with a focused, AI-driven task management system. Instead of forcing you into rigid lists and categories, Crush uses AI (OpenAI or OpenRouter) to silently parse your natural language, infer priorities from how you phrase things, detect relationships between tasks, and surface what matters most each day.

Built for creative professionals with chaotic, interrelated workloads where tasks are half-formed, context-dependent, and constantly shifting.

## What it does

- **Smart capture** -- type tasks the way you think. "I really need to finish the pitch deck by Friday" gets parsed into a titled, tagged, prioritized task with a deadline, automatically.
- **Daily brief** -- every morning, Crush analyzes your full task list and picks 2-4 things to focus on, generates warm nudges for tasks you've been putting off, and groups related work into clusters.
- **Priority from language** -- Crush reads the emotional weight of what you type. "I would like to" is low priority. "I need to" is medium. "I really need to" or "I must" is high. No manual tagging required.
- **Task relationships** -- blocking chains and thematic clusters are inferred automatically. If task A blocks task B, completing A inherits urgency.
- **Chat advisor** -- ask Crush anything about your tasks. "What should I focus on?" or "Break down the website redesign." When the conversation implies a priority shift, Crush automatically recalculates your view.
- **Warm, personal tone** -- lowercase, casual, like a supportive friend. Not a corporate productivity tool.

## Architecture

### Extension structure

Crush is built with [WXT](https://wxt.dev), a modern framework for building Chrome extensions with Vite, React, and TypeScript. It produces a Manifest V3 extension.

```
crush/
├── entrypoints/
│   ├── background.ts              # Service worker (future: alarms, sync)
│   └── newtab/
│       ├── index.html              # New tab override page
│       ├── main.tsx                # React entry point
│       ├── App.tsx                 # Root component, wires hooks + AI
│       ├── style.css               # Theme system (light/dark tokens)
│       └── components/
│           ├── SmartInput.tsx       # Natural language task input
│           ├── FocusCards.tsx       # Today's priority tasks
│           ├── NudgeSection.tsx     # Deferred task nudges
│           ├── ClusterSection.tsx   # Thematic task groups
│           ├── SomedayBucket.tsx    # Low-priority / aspirational tasks
│           ├── TaskCard.tsx         # Card + row task renderers
│           ├── Greeting.tsx         # Time-of-day greeting
│           ├── AIChatPanel.tsx      # Slide-out chat with Crush
│           └── SettingsPanel.tsx    # API key + user settings
├── src/
│   ├── types/index.ts              # Core TypeScript interfaces
│   ├── hooks/
│   │   ├── useTasks.ts             # Task CRUD, filtering, persistence
│   │   ├── useAI.ts                # AI orchestration (parse, brief, chat)
│   │   └── useSettings.ts          # Settings with chrome.storage.local
│   ├── lib/
│   │   ├── ai-client.ts            # OpenAI / OpenRouter API wrapper
│   │   ├── task-parser.ts          # Parse prompt construction + response handling
│   │   ├── daily-brief.ts          # Daily brief prompt + response handling
│   │   ├── date.ts                 # Date utilities (4 AM rollover, greeting)
│   │   └── storage.ts              # localStorage + chrome.storage abstraction
│   └── __tests__/                  # 66 tests across 11 files
├── public/icon/                    # Extension icons (16-128px)
├── docs/plans/                     # Design doc + implementation plan
├── wxt.config.ts                   # WXT + manifest config
├── vitest.config.ts                # Test configuration
└── tsconfig.json
```

### Data model

Crush separates stable task data from ephemeral AI analysis:

**Task** (source of truth, persisted in localStorage)
- `id`, `text`, `parsed` (title, deadline, tags)
- `importance` (high/medium/low) -- set by AI at creation, stable
- `relationships` (blocks, blockedBy, cluster)
- `status` (active/completed/deferred/someday)
- `deferrals` count, timestamps

**ComputedView** (AI's analysis, cached, regenerated)
- `focusToday` -- 2-4 task IDs to prioritize
- `nudges` -- warm reminders for deferred/stale tasks
- `urgencyScores` -- dynamic scores based on deadlines, importance propagation, deferrals, staleness
- `clusters` -- thematic groupings with progress

The ComputedView recalculates when:
- A new task is added
- The first tab opens each day (daily brief)
- The AI chat determines a priority shift is warranted (context-aware recompute)

### AI integration

Three touchpoints, using your chosen provider (OpenAI or OpenRouter) and model (defaults to GPT-4o-mini):

| Feature | Trigger | Cost estimate (GPT-4o-mini) |
|---------|---------|---------------|
| Task parser | Every new task | ~$0.001/task |
| Daily brief | First tab open of the day | ~$0.005/brief |
| Chat advisor | On demand | ~$0.002/message |

Cost varies by provider and model. OpenRouter gives access to models from Anthropic, Google, Meta, and others.

The API key is stored in `chrome.storage.local` (not localStorage) for better security isolation. All AI calls are made directly from the extension -- there is no backend server.

### Theme system

Crush uses CSS custom properties inside Tailwind's `@theme` directive for a dual-theme system:

- **Light theme** -- warm cream gradients (#faf5eb to #f0e6d4), gold accents
- **Dark theme** -- olive/forest green gradients (#3a4028 to #1a1e12), muted gold accents

Theme switching is automatic via `prefers-color-scheme`. All components use semantic tokens (`text-text-primary`, `bg-surface`, `border-border`, etc.) so the theme is consistent everywhere.

## Tech stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Extension framework | WXT | 0.20.x |
| UI | React | 19.x |
| Language | TypeScript | 5.9.x |
| Styling | Tailwind CSS | 4.x |
| AI | OpenAI / OpenRouter (default: GPT-4o-mini) | -- |
| Testing | Vitest + React Testing Library | 4.x |
| Build | Vite (via WXT) | -- |
| Manifest | Chrome MV3 | 3 |

## Development

### Prerequisites

- Node.js 18+
- npm
- An API key from OpenAI or OpenRouter (for AI features; the app works without one but with reduced functionality)

### Setup

```bash
git clone https://github.com/TaylorBurke/crush.git
cd crush
npm install
```

### Running in development

```bash
npm run dev
```

This starts WXT in dev mode with hot module replacement. To load the extension in Chrome:

1. Open `chrome://extensions`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select the `.output/chrome-mv3` directory inside the project

Every time you save a file, WXT will hot-reload the extension. Open a new tab to see Crush.

### Running tests

```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode
```

The test suite covers core utilities, storage, hooks, and component rendering (66 tests across 11 files). Tests use jsdom with React Testing Library.

### Type checking

```bash
npm run compile
```

### Building for production

```bash
npm run build
```

This produces an optimized build in `.output/chrome-mv3/`. The output is a complete, loadable Chrome extension.

### Creating a zip for distribution

```bash
npm run zip
```

Produces a `.zip` file ready for upload to the Chrome Web Store.

### Firefox support

WXT supports Firefox as an alternative target:

```bash
npm run dev:firefox
npm run build:firefox
npm run zip:firefox
```

## Publishing to the Chrome Web Store

### First-time setup

1. **Register as a developer** at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). There is a one-time $5 registration fee.
2. **Prepare store assets**: You'll need screenshots (1280x800 or 640x400), a 440x280 promotional tile, and a detailed description.
3. **Build and zip**: Run `npm run zip` to produce the distribution archive.
4. **Upload**: In the developer dashboard, click "New Item", upload the zip, fill in the listing details, and submit for review.

### Review process

Chrome Web Store reviews typically take 1-3 business days. Common review points:

- **Permissions justification**: Crush only requests the `storage` permission, which is minimal and straightforward.
- **New tab override**: Extensions that override the new tab page receive extra scrutiny. The listing should clearly explain what value the new tab replacement provides.
- **Remote code**: Crush does not load remote code. All AI calls are data-only API requests (sending/receiving JSON), which is compliant with MV3 policies.

### Updates

After initial publication, push updates by incrementing the `version` in `wxt.config.ts`, running `npm run zip`, and uploading the new zip to the developer dashboard.

## Security considerations

### API key handling

- The API key is stored in `chrome.storage.local`, which is isolated to the extension's origin and not accessible to web pages.
- The key is never written to localStorage, included in URLs, or logged.
- API calls go directly to your provider (`api.openai.com` or `openrouter.ai/api`) over HTTPS. There is no intermediary server.

### Data privacy

- **All task data stays local.** Tasks are stored in the browser's localStorage. Nothing is sent to any server except your chosen AI provider for parsing and analysis.
- **What is sent to the AI provider**: Task titles, statuses, importance levels, deadlines, and relationship data -- only when AI features are triggered. Raw user input text is sent for parsing.
- **What is NOT sent**: No browsing history, no personal information beyond what the user types into the task input, no telemetry.

### Extension permissions

Crush requests minimal permissions:

| Permission | Purpose |
|-----------|---------|
| `storage` | Persist settings (API key, user name) in chrome.storage.local |

The extension does NOT request:
- `tabs` -- no access to other tabs
- `history` -- no browsing history access
- `activeTab` -- no access to page content
- `<all_urls>` -- no arbitrary network access (OpenAI calls use standard fetch)

### Content Security Policy

As a Manifest V3 extension, Crush runs under Chrome's strict CSP which prevents inline script execution, eval, and remote code loading.

## Project status

Crush is in early development (v0.1.0). Current functionality is complete and working:

- Natural language task capture with AI parsing
- AI-generated daily briefs with focus tasks, nudges, and clusters
- Context-aware chat that can trigger view recomputation
- Dual light/dark theme
- Full test suite

### Potential next steps

- **Background sync via Chrome alarms** -- periodically regenerate the computed view instead of only on tab open
- **Task completion/deferral triggering recompute** -- currently only new tasks and chat trigger recalculation
- **Drag-and-drop reordering** of focus tasks
- **Subtask expansion** -- break down tasks into steps via AI
- **Data export/import** for backup and portability
- **Cross-device sync** via chrome.storage.sync (limited to 100KB)
- **Richer nudge logic** -- time-of-day awareness, workload balancing
- **Keyboard shortcuts** for power users
- **Onboarding flow** for first-time setup

## License

This project is private and not currently licensed for distribution.
