const ROLLOVER_HOUR = 4;

export function today(): string {
  const now = new Date();
  if (now.getHours() < ROLLOVER_HOUR) {
    now.setDate(now.getDate() - 1);
  }
  return now.toISOString().split('T')[0];
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < ROLLOVER_HOUR) return "hey, late night?";
  if (hour < 12) return "good morning.";
  if (hour < 17) return "good afternoon.";
  return "good evening.";
}

export function isNewDay(lastDate: string | null): boolean {
  if (!lastDate) return true;
  return today() !== lastDate;
}

export function getDayOfWeek(): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

export function daysAgo(isoDate: string): number {
  const then = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
