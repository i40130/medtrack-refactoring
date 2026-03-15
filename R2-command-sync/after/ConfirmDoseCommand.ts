// src/infrastructure/sync/ConfirmDoseCommand.ts

import { supabase } from '@/integrations/supabase/client';
import { SyncCommand, SyncStatus, SyncQueueEntry } from '@/domain/sync/SyncCommand';
import { v4 as uuidv4 } from 'uuid';

export interface DoseConfirmPayload {
  takenAt: string;
  medicationId: string;
  patientId: string;
}

export class ConfirmDoseCommand implements SyncCommand<DoseConfirmPayload> {
  readonly id: string;
  readonly entity = 'dose_event';
  readonly entityId: string;
  readonly payload: DoseConfirmPayload;
  readonly createdAt: string;
  status: SyncStatus = 'pending';
  retryCount = 0;
  maxRetries = 3;

  constructor(doseId: string, payload: DoseConfirmPayload) {
    this.id = uuidv4();
    this.entityId = doseId;
    this.payload = payload;
    this.createdAt = new Date().toISOString();
  }

  async execute(): Promise<void> {
    this.status = 'syncing';
    const { error } = await supabase
      .from('dose_events')
      .upsert({
        id: this.entityId,
        status: 'taken',
        taken_at: this.payload.takenAt,
        medication_id: this.payload.medicationId,
        patient_id: this.payload.patientId,
        idempotency_key: this.id
      }, { onConflict: 'idempotency_key' });

    if (error) {
      this.status = 'failed';
      this.retryCount++;
      throw error;
    }
    this.status = 'synced';
  }

  async undo(): Promise<void> {
    const { error } = await supabase
      .from('dose_events')
      .update({ status: 'pending', taken_at: null })
      .eq('id', this.entityId);
    if (error) throw error;
    this.status = 'pending';
  }

  canRetry(): boolean {
    return this.retryCount < this.maxRetries;
  }

  toQueueEntry(): SyncQueueEntry {
    return {
      id: this.id,
      entity: this.entity,
      entityId: this.entityId,
      payload: this.payload,
      status: this.status,
      retryCount: this.retryCount,
      createdAt: this.createdAt
    };
  }
}
