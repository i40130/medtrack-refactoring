import {
  ConfirmDoseCommand,
  DoseConfirmPayload,
  DoseEventGateway,
} from '../R2-command-sync/after/ConfirmDoseCommand';

const makePayload = (): DoseConfirmPayload => ({
  takenAt: '2024-10-15T09:00:00Z',
  medicationId: 'med-oxali',
  patientId: 'patient-001',
});

const makeGateway = (shouldFail = false): DoseEventGateway => ({
  upsert: jest.fn().mockResolvedValue(
    shouldFail ? { error: new Error('Network error') } : { error: null }
  ),
  revert: jest.fn().mockResolvedValue({ error: null }),
});

describe('ConfirmDoseCommand', () => {
  it('ejecuta confirmacion de dosis y cambia estado a synced', async () => {
    const gw = makeGateway(false);
    const cmd = new ConfirmDoseCommand('dose-abc', makePayload(), gw);

    expect(cmd.status).toBe('pending');

    await cmd.execute();

    expect(cmd.status).toBe('synced');
    expect(gw.upsert).toHaveBeenCalledTimes(1);
  });

  it('reintenta comandos fallidos hasta maxRetries', async () => {
    const gw = makeGateway(true);
    const cmd = new ConfirmDoseCommand('dose-abc', makePayload(), gw);

    // Primer intento — falla, retryCount=1, canRetry=true
    await expect(cmd.execute()).rejects.toThrow();
    expect(cmd.retryCount).toBe(1);
    expect(cmd.status).toBe('failed');
    expect(cmd.canRetry()).toBe(true);

    // Segundo intento — falla, retryCount=2, canRetry=true
    await expect(cmd.execute()).rejects.toThrow();
    expect(cmd.retryCount).toBe(2);
    expect(cmd.canRetry()).toBe(true);

    // Tercer intento — falla, retryCount=3, canRetry=false
    await expect(cmd.execute()).rejects.toThrow();
    expect(cmd.retryCount).toBe(3);
    expect(cmd.canRetry()).toBe(false);
  });
});
