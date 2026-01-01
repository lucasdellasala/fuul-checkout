export interface IdempotencyRecord {
  cartId: string;
  version: number;
  fingerprint: string;
}

export class IdempotencyKeyConflictError extends Error {
  constructor(
    public readonly idempotencyKey: string,
    public readonly expectedFingerprint: string,
    public readonly receivedFingerprint: string,
  ) {
    super(
      `Idempotency key conflict: key '${idempotencyKey}' was previously used with different request parameters. Expected: ${expectedFingerprint}, Received: ${receivedFingerprint}`,
    );
    this.name = 'IdempotencyKeyConflictError';
  }
}

export class IdempotencyStore {
  private readonly records = new Map<string, IdempotencyRecord>();

  createFingerprint(sku: string, quantity: number): string {
    return `${sku}:${quantity}`;
  }

  get(idempotencyKey: string): IdempotencyRecord | null {
    return this.records.get(idempotencyKey) || null;
  }

  set(idempotencyKey: string, cartId: string, version: number, fingerprint: string): void {
    this.records.set(idempotencyKey, {
      cartId,
      version,
      fingerprint,
    });
  }

  verifyAndSet(
    idempotencyKey: string,
    cartId: string,
    fingerprint: string,
  ): { isDuplicate: boolean; version?: number } {
    const existing = this.get(idempotencyKey);

    if (!existing) {
      return { isDuplicate: false };
    }

    if (existing.cartId !== cartId) {
      throw new IdempotencyKeyConflictError(
        idempotencyKey,
        `${existing.cartId}:${existing.fingerprint}`,
        `${cartId}:${fingerprint}`,
      );
    }

    if (existing.fingerprint !== fingerprint) {
      throw new IdempotencyKeyConflictError(idempotencyKey, existing.fingerprint, fingerprint);
    }

    return { isDuplicate: true, version: existing.version };
  }

  clear(): void {
    this.records.clear();
  }
}
