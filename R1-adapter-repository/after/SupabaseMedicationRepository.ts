// src/infrastructure/persistence/SupabaseMedicationRepository.ts
// Adapter: implementacion concreta con Supabase

import { Medication, MedicationInput, MedicationRepository } from './MedicationRepository';

// Interfaz minima del cliente Supabase (anti-corruption layer)
interface SupabaseClient {
  from(table: string): {
    select(columns?: string): any;
    insert(data: object): any;
    update(data: object): any;
    delete(): any;
  };
}

export class SupabaseMedicationRepository implements MedicationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getAll(patientId: string): Promise<Medication[]> {
    const { data, error } = await this.client
      .from('medications')
      .select('*')
      .eq('patient_id', patientId);
    if (error) throw new Error(`getAll failed: ${JSON.stringify(error)}`);
    return data ?? [];
  }

  async getById(id: string): Promise<Medication | null> {
    const { data, error } = await this.client
      .from('medications')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  }

  async create(input: MedicationInput): Promise<Medication> {
    const { data, error } = await this.client
      .from('medications')
      .insert(input)
      .select()
      .single();
    if (error || !data) throw new Error(`create failed: ${JSON.stringify(error)}`);
    return data;
  }

  async update(id: string, input: Partial<MedicationInput>): Promise<Medication> {
    const { data, error } = await this.client
      .from('medications')
      .update(input)
      .eq('id', id)
      .single();
    if (error || !data) throw new Error(`update failed: ${JSON.stringify(error)}`);
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from('medications')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`delete failed: ${JSON.stringify(error)}`);
  }

  async getByStatus(patientId: string, active: boolean): Promise<Medication[]> {
    const status = active ? 'active' : 'completed';
    const { data, error } = await this.client
      .from('medications')
      .select('*')
      .eq('patient_id', patientId)
      .eq('status', status);
    if (error) throw new Error(`getByStatus failed: ${JSON.stringify(error)}`);
    return data ?? [];
  }
}
