// src/infrastructure/sync/SyncQueueProcessor.ts

import { SyncCommand } from '@/domain/sync/SyncCommand';

export interface SyncResult {
  synced: number;
  failed: number;
  conflicts: number;
}

export class SyncQueueProcessor {
  private queue: SyncCommand[] = [];

  enqueue(command: SyncCommand): void {
    this.queue.push(command);
  }

  async processAll(): Promise<SyncResult> {
    const results: SyncResult = { synced: 0, failed: 0, conflicts: 0 };

    for (const cmd of this.queue.filter(c => c.status === 'pending')) {
      try {
        await cmd.execute();
        results.synced++;
      } catch (err) {
        if (cmd.canRetry()) {
          cmd.status = 'pending';
        } else {
          cmd.status = 'failed';
          results.failed++;
        }
      }
    }

    this.queue = this.queue.filter(c => c.status !== 'synced');
    return results;
  }

  async undoLast(): Promise<void> {
    const last = this.queue.pop();
    if (last) await last.undo();
  }

  getPending(): SyncCommand[] {
    return this.queue.filter(c => c.status === 'pending');
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}
