import { describe, it, expect } from 'vitest';
import { buildGreetingPrompt } from '../lib/greeting-prompt';

describe('greeting-prompt', () => {
  it('includes context block in user message', () => {
    const messages = buildGreetingPrompt('Focus tasks: A, B\nStreak: 5 days');
    const userMsg = messages.find((m) => m.role === 'user');
    expect(userMsg?.content).toContain('Focus tasks: A, B');
    expect(userMsg?.content).toContain('Streak: 5 days');
  });

  it('includes today date in system message', () => {
    const messages = buildGreetingPrompt('');
    const sysMsg = messages.find((m) => m.role === 'system');
    const year = new Date().getFullYear();
    expect(sysMsg?.content).toContain(String(year));
  });

  it('mentions reflection and streak in system instructions', () => {
    const messages = buildGreetingPrompt('');
    const sysMsg = messages.find((m) => m.role === 'system');
    expect(sysMsg?.content).toContain('reflection');
    expect(sysMsg?.content).toContain('streak');
  });

  it('handles empty context gracefully', () => {
    const messages = buildGreetingPrompt('');
    const userMsg = messages.find((m) => m.role === 'user');
    expect(userMsg?.content).toContain('(no context available)');
  });
});
