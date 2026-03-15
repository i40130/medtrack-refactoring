import { MedicationScheduleBuilder } from '../R3-builder-dosing/after/MedicationScheduleBuilder';

describe('MedicationScheduleBuilder', () => {
  it('construye protocolo quimioterapia 21+7 con 6 ciclos', () => {
    const schedule = new MedicationScheduleBuilder()
      .forMedication('med-capox')
      .forPatient('patient-001')
      .startingOn('2024-11-01')
      .withFrequency(1, 'daily')
      .withDailyDoses(2, ['08:00', '20:00'])
      .takeWithFood(true)
      .withCycles(21, 7, 6)
      .build();

    expect(schedule.cycleConfig!.totalCycles).toBe(6);
    expect(schedule.cycleConfig!.treatmentDays).toBe(21);
    expect(schedule.cycleConfig!.restDays).toBe(7);
    expect(schedule.phases.length).toBe(12); // 6 ciclos x 2 fases (treatment + rest)
    expect(schedule.phases[0].phase).toBe('treatment');
    expect(schedule.phases[1].phase).toBe('rest');
  });

  it('lanza error si falta frecuencia de dosificacion', () => {
    expect(() => {
      new MedicationScheduleBuilder()
        .forMedication('med-1')
        .forPatient('p-1')
        .startingOn('2024-11-01')
        // sin withFrequency
        .build();
    }).toThrow('frecuencia de dosificacion');
  });

  it('lanza error si faltan campos obligatorios', () => {
    expect(() => {
      new MedicationScheduleBuilder()
        .forMedication('med-1')
        // sin forPatient ni startingOn
        .withFrequency(1, 'daily')
        .build();
    }).toThrow('obligatorios');
  });

  it('construye posologia simple sin ciclos', () => {
    const schedule = new MedicationScheduleBuilder()
      .forMedication('med-dex')
      .forPatient('patient-002')
      .startingOn('2024-12-01')
      .withFrequency(12, 'hours')
      .withDailyDoses(2, ['08:00', '20:00'])
      .takeWithFood(false)
      .build();

    expect(schedule.cycleConfig).toBeNull();
    expect(schedule.phases).toHaveLength(0);
    expect(schedule.dosingRule.frequencyValue).toBe(12);
    expect(schedule.dosingRule.frequencyUnit).toBe('hours');
  });
});
