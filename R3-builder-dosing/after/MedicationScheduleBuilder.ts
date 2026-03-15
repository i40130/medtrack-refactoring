// src/domain/medication/MedicationScheduleBuilder.ts

import {
  DosingRule, CycleConfig, MedicationSchedule,
  SchedulePhase, FrequencyUnit
} from './DosingRule';

export class MedicationScheduleBuilder {
  private medicationId = '';
  private patientId = '';
  private startDate = '';
  private dosingRule: Partial<DosingRule> = {};
  private cycleConfig: CycleConfig | null = null;

  forMedication(medicationId: string): this {
    this.medicationId = medicationId;
    return this;
  }

  forPatient(patientId: string): this {
    this.patientId = patientId;
    return this;
  }

  startingOn(date: string): this {
    this.startDate = date;
    return this;
  }

  withFrequency(value: number, unit: FrequencyUnit): this {
    this.dosingRule.frequencyValue = value;
    this.dosingRule.frequencyUnit = unit;
    return this;
  }

  withDailyDoses(count: number, times: string[]): this {
    this.dosingRule.dosesPerDay = count;
    this.dosingRule.timesOfDay = times;
    return this;
  }

  takeWithFood(required: boolean): this {
    this.dosingRule.withFood = required;
    return this;
  }

  withCycles(treatmentDays: number, restDays: number, total: number): this {
    this.cycleConfig = {
      treatmentDays,
      restDays,
      totalCycles: total,
      doseAdjustmentPercent: 0
    };
    return this;
  }

  withDoseAdjustment(percent: number): this {
    if (this.cycleConfig) {
      this.cycleConfig.doseAdjustmentPercent = percent;
    }
    return this;
  }

  build(): MedicationSchedule {
    if (!this.medicationId || !this.patientId || !this.startDate) {
      throw new Error('Campos obligatorios: medicationId, patientId, startDate');
    }
    if (!this.dosingRule.frequencyValue || !this.dosingRule.frequencyUnit) {
      throw new Error('La frecuencia de dosificacion es obligatoria');
    }

    const rule = this.dosingRule as DosingRule;
    const phases = this.generatePhases();
    const endDate = phases.length > 0
      ? phases[phases.length - 1].endDate
      : null;

    return {
      medicationId: this.medicationId,
      patientId: this.patientId,
      dosingRule: rule,
      cycleConfig: this.cycleConfig,
      startDate: this.startDate,
      endDate,
      phases
    };
  }

  private generatePhases(): SchedulePhase[] {
    if (!this.cycleConfig) return [];
    const phases: SchedulePhase[] = [];
    let cursor = new Date(this.startDate);

    for (let c = 1; c <= this.cycleConfig.totalCycles; c++) {
      const treatStart = new Date(cursor);
      cursor.setDate(cursor.getDate() + this.cycleConfig.treatmentDays);
      phases.push({
        phase: 'treatment',
        cycleNumber: c,
        startDate: treatStart.toISOString().split('T')[0],
        endDate: new Date(cursor).toISOString().split('T')[0]
      });

      const restStart = new Date(cursor);
      cursor.setDate(cursor.getDate() + this.cycleConfig.restDays);
      phases.push({
        phase: 'rest',
        cycleNumber: c,
        startDate: restStart.toISOString().split('T')[0],
        endDate: new Date(cursor).toISOString().split('T')[0]
      });
    }
    return phases;
  }
}
