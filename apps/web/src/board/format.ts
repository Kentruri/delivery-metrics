const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const clock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long" });
const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const plural = (count: number, unit: string) => `${count} ${unit}${count === 1 ? "" : "s"}`;

export const formatClock = (date: Date) => clock.format(date);

export const listJoin = (items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : (items[0] ?? "");

export const formatAgo = (date: Date, now: Date): string => {
  const elapsed = now.getTime() - date.getTime();
  if (elapsed < HOUR) {
    return `${plural(Math.max(1, Math.round(elapsed / MINUTE)), "minute")} ago`;
  }
  if (sameDay(date, now)) {
    return `${plural(Math.floor(elapsed / HOUR), "hour")} ago`;
  }
  if (sameDay(date, new Date(now.getTime() - DAY))) {
    return `yesterday at ${formatClock(date)}`;
  }
  if (elapsed < 6 * DAY) {
    return `${weekday.format(date)} at ${formatClock(date)}`;
  }
  return `on ${dayMonth.format(date)}`;
};

export const formatSpan = (ms: number): string => {
  if (ms < HOUR) {
    return plural(Math.max(1, Math.round(ms / MINUTE)), "minute");
  }
  if (ms < 3 * DAY) {
    return plural(Math.floor(ms / HOUR), "hour");
  }
  return plural(Math.floor(ms / DAY), "day");
};

export const formatDecimal = (value: number): string => {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

export const formatHours = (hours: number): string => {
  if (hours < 1) {
    return `${Math.max(1, Math.round(hours * 60))} min`;
  }
  if (hours < 48) {
    return `${Math.round(hours)} h`;
  }
  return `${formatDecimal(hours / 24)} d`;
};

export const formatShare = (share: number): string => `${Math.round(share * 100)}%`;

export const formatShortSpan = (ms: number): string => {
  if (ms < HOUR) {
    return `${Math.max(1, Math.round(ms / MINUTE))} min`;
  }
  const hours = Math.floor(ms / HOUR);
  return `${hours} h`;
};
