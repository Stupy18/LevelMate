import { format } from 'date-fns';

export function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  return format(d, "EEE d MMM · HH:mm");
}

export function formatEloDelta(n: number): string {
  if (n === 0) return '±0';
  return n > 0 ? `+${n}` : `${n}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
