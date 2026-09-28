export function formatSessionStart(timestamp: number, now = Date.now()): string {
  const start = new Date(timestamp);
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const day = start.toDateString() === today.toDateString() ? 'Today'
    : start.toDateString() === yesterday.toDateString() ? 'Yesterday'
    : start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', ...(start.getFullYear() !== today.getFullYear() ? { year: 'numeric' as const } : {}) });
  const time = start.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  return `${day} at ${time}`;
}
