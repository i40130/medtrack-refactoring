// src/domain/medication/DosingRule.ts

export type FrequencyUnit = 'hours' | 'daily' | 'weekly';
export type CyclePhase = 'treatment' | 'rest' | 'evaluation';

export interface DosingRule {
  frequencyValue: number;
  frequencyUnit: FrequencyUnit;
  dosesPerDay: number;
  timesOfDay: string[];
  withFood: boolean;
}

export interface CycleConfig {
  treatmentDays: number;
  restDays: number;
  totalCycles: number;
  doseAdjustmentPercent: number;
}

export interface MedicationSchedule {
  medicationId: string;
  patientId: string;
  dosingRule: DosingRule;
  cycleConfig: CycleConfig | null;
  startDate: string;
  endDate: string | null;
  phases: SchedulePhase[];
}

export interface SchedulePhase {
  phase: CyclePhase;
  cycleNumber: number;
  startDate: string;
  endDate: string;
}
