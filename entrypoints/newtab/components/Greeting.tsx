import { getGreeting, getDayOfWeek } from '../../../src/lib/date';

export function Greeting() {
  const greeting = getGreeting();
  const day = getDayOfWeek();

  return (
    <div className="mb-8">
      <h1 className="text-2xl font-light text-text-primary tracking-tight">
        {greeting} here's your {day}.
      </h1>
    </div>
  );
}
