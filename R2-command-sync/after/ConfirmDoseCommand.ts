// src/infrastructure/sync/ConfirmDoseCommand.ts

import { SyncCommand, SyncStatus, SyncQueueEntry } from './SyncCommand';

export interface DoseConfirmPayload {
  takenAt: string;
  medicationId: string;
  patientId: string;
}

// Gateway inyectable — desacopla de Supabase para testabilidad
export interface DoseEventGateway {
  upsert(data: Record<string, unknown>): Promise<{ error: unknown }>;
  revert(entityId: string): Promise<{ error: unknown }>;
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

  constructor(
    doseId: string,
    payload: DoseConfirmPayload,
    private readonly gateway: DoseEventGateway,
    idGenerator: () => string = () => `cmd-${Date.now()}`
  ) {
    this.id = idGenerator();
    this.entityId = doseId;
    this.payload = payload;
    this.createdAt = new Date().toISOString();
  }

  async execute(): Promise<void> {
    this.status = 'syncing';
    const { error } = await this.gateway.upsert({
      id: this.entityId,
      status: 'taken',
      taken_at: this.payload.takenAt,
      medication_id: this.payload.medicationId,
      patient_id: this.payload.patientId,
      idempotency_key: this.id
    });

    if (error) {
      this.status = 'failed';
      this.retryCount++;
      throw error;
    }
    this.status = 'synced';
  }

  async undo(): Promise<void> {
    const { error } = await this.gateway.revert(this.entityId);
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
