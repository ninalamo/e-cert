let resolve!: () => void;
const ready = new Promise<void>((r) => {
  resolve = r;
});

export function markSessionReady(): void {
  resolve();
}

export function waitForSession(): Promise<void> {
  return ready;
}
