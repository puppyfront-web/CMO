export class Deduper {
  private readonly seenAt = new Map<string, number>();

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = () => Date.now()
  ) {}

  shouldAccept(key: string): boolean {
    const normalizedKey = key.trim().toLowerCase();
    const current = this.now();
    const previous = this.seenAt.get(normalizedKey);

    this.prune(current);

    if (previous !== undefined && current - previous < this.ttlMs) {
      return false;
    }

    this.seenAt.set(normalizedKey, current);
    return true;
  }

  private prune(current: number): void {
    for (const [key, timestamp] of this.seenAt.entries()) {
      if (current - timestamp >= this.ttlMs) {
        this.seenAt.delete(key);
      }
    }
  }
}
