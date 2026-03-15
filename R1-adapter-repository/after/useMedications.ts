// src/hooks/useMedications.ts (refactorizado)

import { useState, useCallback } from 'react';
import { MedicationRepository } from '@/domain/ports/MedicationRepository';
import { useAuthStore } from '@/store/auth';
import { Medication, MedicationInput } from '@/types/medication';

export function useMedications(repo: MedicationRepository) {
  const { user } = useAuthStore();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMedications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await repo.getAll(user.id);
      setMedications(data);
    } catch (err) {
      console.error('Error cargando medicacion:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, repo]);

  const addMedication = useCallback(async (input: MedicationInput) => {
    const created = await repo.create(input);
    setMedications(prev => [...prev, created]);
    return created;
  }, [repo]);

  const updateMedication = useCallback(async (id: string, input: Partial<MedicationInput>) => {
    const updated = await repo.update(id, input);
    setMedications(prev => prev.map(m => m.id === id ? updated : m));
    return updated;
  }, [repo]);

  const deleteMedication = useCallback(async (id: string) => {
    await repo.delete(id);
    setMedications(prev => prev.filter(m => m.id !== id));
  }, [repo]);

  return {
    medications,
    loading,
    loadMedications,
    addMedication,
    updateMedication,
    deleteMedication
  };
}
