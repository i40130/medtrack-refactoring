// src/lib/db.ts — Extracto del PoC original
// Cola de sincronización sin tipado fuerte, sin retry, sin undo

import Dexie, { Table } from 'dexie';

interface SyncQueueItem {
  id?: number;
  entity: string;
  entityId: string;
  payload: any;
  status: string;
  createdAt: string;
}

class MedTrackDatabase extends Dexie {
  medications!: Table;
  doseEvents!: Table;
  syncQueue!: Table<SyncQueueItem>;
  patients!: Table;
  medicalReports!: Table;
  reportHistory!: Table;

  constructor() {
    super('MedTrackDB');
    this.version(1).stores({
      medications: '++id, name, patient_id',
      doseEvents: '++id, medication_id, due_at, status',
      syncQueue: '++id, entity, entityId, status',
      patients: '++id, user_id',
      medicalReports: '++id, patient_id',
      reportHistory: '++id, report_id'
    });
  }
}

const db = new MedTrackDatabase();

export const dbUtils = {

  async getActiveMedications() {
    return db.medications.where('is_active').equals(1).toArray();
  },

  async getDoseEventsInRange(start: string, end: string) {
    return db.doseEvents
      .where('due_at')
      .between(start, end)
      .toArray();
  },

  async addToSyncQueue(entity: string, entityId: string, payload: any) {
    await db.syncQueue.add({
      entity: entity as any,
      entityId,
      payload,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
  },

  async markDoseAsTaken(doseEvent: any) {
    await db.doseEvents.put(doseEvent);
    await this.addToSyncQueue('doseEvent', doseEvent.id, {
      ...doseEvent,
      status: 'taken',
      takenAt: new Date().toISOString()
    });
  },

  async clearAllData() {
    await db.medications.clear();
    await db.doseEvents.clear();
    await db.syncQueue.clear();
  }
};
