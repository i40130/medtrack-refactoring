// src/hooks/useMedicationCycles.ts — Extracto del PoC original
// dosing_rule tipado como 'any', lógica dispersa entre hooks y componentes

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/auth';

interface MedicationCycle {
  id: string;
  medication_id: string;
  patient_id: string;
  cycle_number: number;
  start_date: string;
  end_date: string;
  dosing_rule: any;          // sin tipado fuerte
  status: string;
}

interface RestartCycleResult {
  success: boolean;
  medication_name?: string;
  previous_cycle?: number;
  new_cycle?: number;
  start_date?: string;
  end_date?: string;
  error?: string;
}

export function useMedicationCycles() {
  const { user } = useAuthStore();
  const [cycles, setCycles] = useState<MedicationCycle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCycles = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('medication_cycles')
      .select('*')
      .eq('patient_id', user.id);
    if (error) {
      console.error('Error fetching cycles:', error);
      return;
    }
    setCycles(data || []);
    setLoading(false);
  };

  const restartCycle = async (
    medicationId: string,
    cycleNumber: number,
    startDate: string,
    endDate: string,
    dosingRule: any           // sin tipado
  ): Promise<RestartCycleResult> => {
    try {
      const { data, error } = await supabase
        .from('medication_cycles')
        .insert({
          medication_id: medicationId,
          patient_id: user?.id,
          cycle_number: cycleNumber,
          start_date: startDate,
          end_date: endDate,
          dosing_rule: dosingRule,   // objeto sin validar
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        new_cycle: data.cycle_number,
        start_date: data.start_date,
        end_date: data.end_date
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    fetchCycles();
  }, [user?.id]);

  return { cycles, loading, fetchCycles, restartCycle };
}
