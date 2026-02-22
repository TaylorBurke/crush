import { describe, it, expect, vi, afterEach } from 'vitest';
import { today, getGreeting, isNewDay } from '../lib/date';

describe('date utilities', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('today()', () => {
    it('returns current date when after 4 AM', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-21T10:00:00'));
      expect(today()).toBe('2026-02-21');
    });

    it('returns previous date when before 4 AM', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-22T02:30:00'));
      expect(today()).toBe('2026-02-21');
    });

    it('returns current date at exactly 4 AM', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-22T04:00:00'));
      expect(today()).toBe('2026-02-22');
    });
  });

  describe('getGreeting()', () => {
    it('returns morning greeting before noon', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-21T09:00:00'));
      const greeting = getGreeting();
      expect(greeting).toContain('morning');
    });

    it('returns afternoon greeting in the afternoon', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-21T14:00:00'));
      const greeting = getGreeting();
      expect(greeting).toContain('afternoon');
    });

    it('returns evening greeting at night', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-21T20:00:00'));
      const greeting = getGreeting();
      expect(greeting).toContain('evening');
    });

    it('returns late night greeting after midnight before 4 AM', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-22T01:30:00'));
      const greeting = getGreeting();
      expect(greeting).toContain('night');
    });
  });

  describe('isNewDay()', () => {
    it('returns true when last date differs from today', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-22T10:00:00'));
      expect(isNewDay('2026-02-21')).toBe(true);
    });

    it('returns false when last date is today', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-22T10:00:00'));
      expect(isNewDay('2026-02-22')).toBe(false);
    });

    it('returns true when no last date provided', () => {
      expect(isNewDay(null)).toBe(true);
    });
  });
});
