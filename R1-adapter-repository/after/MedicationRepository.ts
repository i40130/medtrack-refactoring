// src/domain/ports/MedicationRepository.ts

import { Medication, MedicationInput } from '@/types/medication';

export interface MedicationRepository {
  getAll(patientId: string): Promise<Medication[]>;
  getById(id: string): Promise<Medication | null>;
  create(input: MedicationInput): Promise<Medication>;
  update(id: string, input: Partial<MedicationInput>): Promise<Medication>;
  delete(id: string): Promise<void>;
  getByStatus(patientId: string, active: boolean): Promise<Medication[]>;
}
