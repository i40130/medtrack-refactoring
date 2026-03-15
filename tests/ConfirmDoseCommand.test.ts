// tests/ConfirmDoseCommand.test.ts
// Verifica el ciclo de vida del comando de sincronización (R2)

import { ConfirmDoseCommand } from '@/infrastructure/sync/ConfirmDoseCommand';
import { SyncQueueProcessor } from '@/infrastructure/sync/SyncQueueProcessor';

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      })
    })
  }
}));

jest.mock('uuid', () => ({ v4: () => 'test-uuid-001' }));

describe('ConfirmDoseCommand', () => {

  test('ejecuta confirmacion de dosis y cambia estado a synced', async () => {
    const cmd = new ConfirmDoseCommand('dose-001', {
      takenAt: '2025-06-15T08:30:00Z',
      medicationId: 'med-1',
      patientId: 'patient-1'
    });

    expect(cmd.status).toBe('pending');
    expect(cmd.entity).toBe('dose_event');
    await cmd.execute();
    expect(cmd.status).toBe('synced');
    expect(cmd.retryCount).toBe(0);
  });

  test('reintenta comandos fallidos hasta maxRetries', async () => {
    const cmd = new ConfirmDoseCommand('dose-002', {
      takenAt: '2025-06-15T09:00:00Z',
      medicationId: 'med-2',
      patientId: 'patient-1'
    });

    cmd.execute = jest.fn().mockRejectedValue(new Error('Network error'));
    cmd.maxRetries = 2;

    const processor = new SyncQueueProcessor();
    processor.enqueue(cmd);

    await processor.processAll();
    expect(cmd.retryCount).toBeGreaterThanOrEqual(1);
    expect(cmd.canRetry()).toBe(true);

    await processor.processAll();
    expect(cmd.canRetry()).toBe(false);
    expect(cmd.status).toBe('failed');
    expect(processor.getPending()).toHaveLength(0);
  });
});
