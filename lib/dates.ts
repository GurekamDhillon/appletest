function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function currentMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** ISO-ish week key: year + week number (Monday-start). */
export function currentWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7
    );
  return `${d.getUTCFullYear()}-W${pad(weekNum)}`;
}

export function isPastThe20th(date: Date = new Date()): boolean {
  return date.getDate() > 20;
}

export function daysUntilThe20th(date: Date = new Date()): number {
  const twentieth = new Date(date.getFullYear(), date.getMonth(), 20);
  return Math.ceil((twentieth.getTime() - date.getTime()) / 86400000);
}

export function daysSince(isoDate: string, now: Date = new Date()): number {
  return Math.floor((now.getTime() - new Date(isoDate).getTime()) / 86400000);
}

export function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
