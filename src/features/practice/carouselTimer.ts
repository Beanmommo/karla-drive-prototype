export const TIP_ADVANCE_MS = 10_000;
export const TIP_RESUME_MS = 15_000;

// Keep one timeout, and measure the reading pause from the latest interaction.
export function createCarouselTimer(advance: () => void) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let enabled = false;
  const touches = new Set<string>();

  function clear() {
    clearTimeout(timeout);
    timeout = undefined;
  }

  function schedule(delay: number) {
    clear();
    if (!enabled || touches.size) return;
    timeout = setTimeout(() => {
      timeout = undefined;
      advance();
      schedule(TIP_ADVANCE_MS);
    }, delay);
  }

  return {
    start() { enabled = true; touches.clear(); schedule(TIP_ADVANCE_MS); },
    stop() { enabled = false; clear(); },
    touchStart(source = 'touch') { touches.add(source); clear(); },
    touchEnd(source = 'touch') { touches.delete(source); schedule(TIP_RESUME_MS); },
    interact() { schedule(TIP_RESUME_MS); },
  };
}
