// src/domain/sync/SyncCommand.ts

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';

export interface SyncQueueEntry {
  id: string;
  entity: string;
  entityId: string;
  payload: unknown;
  status: SyncStatus;
  retryCount: number;
  createdAt: string;
}

export interface SyncCommand<T = unknown> {
  readonly id: string;
  readonly entity: string;
  readonly entityId: string;
  readonly payload: T;
  readonly createdAt: string;
  status: SyncStatus;
  retryCount: number;
  maxRetries: number;

  execute(): Promise<void>;
  undo(): Promise<void>;
  canRetry(): boolean;
  toQueueEntry(): SyncQueueEntry;
}
