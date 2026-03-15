// src/domain/ports/MedicationRepository.ts
// Tipos de dominio definidos localmente — evita dependencia de modulos externos

export type MedicationStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface Medication {
  id: string;
  patient_id: string;
  name: string;
  active_ingredient: string;
  status: MedicationStatus;
  created_at: string;
}

export type MedicationInput = Omit<Medication, 'id' | 'created_at'>;

export interface MedicationRepository {
  getAll(patientId: string): Promise<Medication[]>;
  getById(id: string): Promise<Medication | null>;
  create(input: MedicationInput): Promise<Medication>;
  update(id: string, input: Partial<MedicationInput>): Promise<Medication>;
  delete(id: string): Promise<void>;
  getByStatus(patientId: string, active: boolean): Promise<Medication[]>;
}
