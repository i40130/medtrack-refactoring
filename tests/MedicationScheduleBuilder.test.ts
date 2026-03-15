// tests/MedicationScheduleBuilder.test.ts
// Verifica la construcción de posologías oncológicas (R3)

import { MedicationScheduleBuilder } from
  '@/domain/medication/MedicationScheduleBuilder';

describe('MedicationScheduleBuilder', () => {

  test('construye protocolo quimioterapia 21+7 con 6 ciclos', () => {
    const schedule = new MedicationScheduleBuilder()
      .forMedication('med-tamoxifeno')
      .forPatient('patient-001')
      .startingOn('2025-07-01')
      .withFrequency(1, 'daily')
      .withDailyDoses(2, ['08:00', '20:00'])
      .takeWithFood(true)
      .withCycles(21, 7, 6)
      .build();

    expect(schedule.medicationId).toBe('med-tamoxifeno');
    expect(schedule.patientId).toBe('patient-001');
    expect(schedule.dosingRule.frequencyUnit).toBe('daily');
    expect(schedule.dosingRule.dosesPerDay).toBe(2);
    expect(schedule.dosingRule.timesOfDay).toEqual(['08:00', '20:00']);
    expect(schedule.dosingRule.withFood).toBe(true);
    expect(schedule.cycleConfig?.totalCycles).toBe(6);
    expect(schedule.cycleConfig?.treatmentDays).toBe(21);
    expect(schedule.cycleConfig?.restDays).toBe(7);

    // 6 ciclos x 2 fases (treatment + rest) = 12 fases
    expect(schedule.phases).toHaveLength(12);
    expect(schedule.phases[0].phase).toBe('treatment');
    expect(schedule.phases[0].cycleNumber).toBe(1);
    expect(schedule.phases[1].phase).toBe('rest');
    expect(schedule.phases[1].cycleNumber).toBe(1);

    // endDate debe existir tras generar fases
    expect(schedule.endDate).toBeTruthy();
  });

  test('lanza error si falta frecuencia de dosificacion', () => {
    const builder = new MedicationScheduleBuilder()
      .forMedication('med-1')
      .forPatient('patient-1')
      .startingOn('2025-07-01');

    expect(() => builder.build()).toThrow(
      'La frecuencia de dosificacion es obligatoria'
    );
  });

  test('lanza error si faltan campos obligatorios', () => {
    const builder = new MedicationScheduleBuilder()
      .withFrequency(1, 'daily');

    expect(() => builder.build()).toThrow(
      'Campos obligatorios'
    );
  });

  test('construye posologia simple sin ciclos', () => {
    const schedule = new MedicationScheduleBuilder()
      .forMedication('med-paracetamol')
      .forPatient('patient-002')
      .startingOn('2025-08-01')
      .withFrequency(8, 'hours')
      .withDailyDoses(3, ['08:00', '16:00', '00:00'])
      .takeWithFood(false)
      .build();

    expect(schedule.cycleConfig).toBeNull();
    expect(schedule.phases).toHaveLength(0);
    expect(schedule.endDate).toBeNull();
    expect(schedule.dosingRule.frequencyUnit).toBe('hours');
  });
});
