// src/infrastructure/adapters/SupabaseMedicationRepository.ts

import { supabase } from '@/integrations/supabase/client';
import { MedicationRepository } from '@/domain/ports/MedicationRepository';
import { Medication, MedicationInput } from '@/types/medication';

class RepositoryError extends Error {
  constructor(public code: string, message: string) {
    super(`[${code}] ${message}`);
    this.name = 'RepositoryError';
  }
}

export class SupabaseMedicationRepository implements MedicationRepository {

  async getAll(patientId: string): Promise<Medication[]> {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('patient_id', patientId);
    if (error) throw new RepositoryError('FETCH_MEDICATIONS', error.message);
    return data ?? [];
  }

  async getById(id: string): Promise<Medication | null> {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new RepositoryError('FETCH_MEDICATION', error.message);
    return data;
  }

  async create(input: MedicationInput): Promise<Medication> {
    const { data, error } = await supabase
      .from('medications')
      .insert(input)
      .select()
      .single();
    if (error) throw new RepositoryError('CREATE_MEDICATION', error.message);
    return data;
  }

  async update(id: string, input: Partial<MedicationInput>): Promise<Medication> {
    const { data, error } = await supabase
      .from('medications')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new RepositoryError('UPDATE_MEDICATION', error.message);
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('medications')
      .delete()
      .eq('id', id);
    if (error) throw new RepositoryError('DELETE_MEDICATION', error.message);
  }

  async getByStatus(patientId: string, active: boolean): Promise<Medication[]> {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('patient_id', patientId)
      .eq('is_active', active);
    if (error) throw new RepositoryError('FETCH_BY_STATUS', error.message);
    return data ?? [];
  }
}
