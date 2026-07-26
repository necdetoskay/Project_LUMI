# Internal Service Contracts

## Database health port

```ts
export interface DatabaseHealthPort {
  check(signal?: AbortSignal): Promise<{
    status: "ready";
    durationMs: number;
  }>;
}
```

Failures are represented by typed dependency errors.

## Audit service

```ts
export type RecordAuditEventInput = {
  actorType: "user" | "system";
  actorId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  correlationId: string;
  metadata?: Record<string, unknown>;
};

export interface AuditService {
  record(input: RecordAuditEventInput): Promise<void>;
}
```

## Application information service

```ts
export interface ApplicationInfoService {
  getInfo(): {
    name: string;
    service: string;
    version: string;
    environment: string;
    commit?: string;
    builtAt?: string;
  };
}
```

## Session boundary

```ts
export type SessionUser = {
  id: string;
  email: string;
  householdIds: string[];
};

export interface SessionService {
  getCurrentUser(): Promise<SessionUser | null>;
}
```

These contracts may be adapted to repository conventions, but their responsibilities and testability must be preserved.
