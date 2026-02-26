# Privacy Policy

**Crush** is a Chrome extension that replaces your new tab page with an AI-powered task management system. This policy explains what data the extension handles and how.

## Data stored locally

All task data, settings, and chat history are stored in your browser using `localStorage` and `chrome.storage.local`. This data never leaves your device except as described below.

Locally stored data includes:

- Tasks (titles, deadlines, tags, status, priority)
- AI-generated daily briefs (focus tasks, nudges, clusters)
- Chat conversation history
- User preferences (theme, display name, bookmarks)
- Your API key (stored in `chrome.storage.local`, isolated from web pages)

## Data sent to AI providers

When AI features are used, Crush sends data to the AI provider you configure (OpenAI or OpenRouter) via their official APIs over HTTPS. There is no intermediary server.

Data sent includes:

- Task titles, statuses, importance levels, deadlines, and relationships
- Raw text you type into the task input or chat
- Your display name (if set)

Data is sent only when you:

- Add a new task (for natural language parsing)
- Open a new tab for the first time each day (for daily brief generation)
- Send a message in the chat panel

## Data NOT collected

Crush does **not** collect, transmit, or have access to:

- Browsing history
- Page content or URLs from other tabs
- Personal information beyond what you type into the extension
- Analytics or telemetry of any kind
- Cookies or tracking identifiers

There is no backend server, no analytics service, and no third-party tracking.

## Permissions

Crush requests a single Chrome permission:

| Permission | Purpose |
|------------|---------|
| `storage`  | Store your API key and settings securely in `chrome.storage.local` |

No other permissions are requested. The extension cannot access your tabs, browsing history, or page content.

## Your control

- You can delete all stored data at any time by removing the extension from Chrome.
- You can change or remove your API key in the extension settings at any time.
- AI features are entirely optional. The extension functions without an API key (with reduced functionality).

## Third-party services

Crush connects only to the API provider you choose:

- **OpenAI** -- [Privacy Policy](https://openai.com/privacy)
- **OpenRouter** -- [Privacy Policy](https://openrouter.ai/privacy)

Your use of these services is governed by their respective privacy policies. Crush does not control how these providers handle data sent to their APIs.

## Changes

If this policy changes, the updated version will be posted in this repository.

## Contact

For questions about this policy, open an issue at [github.com/TaylorBurke/crush](https://github.com/TaylorBurke/crush/issues).
