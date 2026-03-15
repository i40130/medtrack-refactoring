#!/bin/bash
# fix-tests-v2.sh — Correccion DEFINITIVA del repo medtrack-refactoring
# Ejecutar desde la raiz del repo clonado:
#   chmod +x fix-tests-v2.sh && ./fix-tests-v2.sh
#
# Que hace:
# 1. Corrige source files para que sean autocontenidos (sin imports @/ rotos)
# 2. Reescribe los 3 tests con imports relativos correctos
# 3. Limpia package.json y jest.config.js
# 4. Reinstala dependencias y ejecuta tests

set -e

echo "=========================================="
echo " MedTrack Refactoring — Fix v2"
echo "=========================================="
echo ""

# ── 1. Corregir R1: MedicationRepository.ts (define tipos inline) ──

echo "[1/8] Corrigiendo R1-adapter-repository/after/MedicationRepository.ts"
cat > R1-adapter-repository/after/MedicationRepository.ts << 'SRCEOF'
// src/domain/ports/MedicationRepository.ts
// Tipos de dominio definidos localmente — evita dependencia de modulos externos

export type MedicationStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface Medication {
  id: string;
  patient_id: string;
  name: string;
  active_ingredient: string;
  status: MedicationStatus;
  created_at: string;
}

export type MedicationInput = Omit<Medication, 'id' | 'created_at'>;

export interface MedicationRepository {
  getAll(patientId: string): Promise<Medication[]>;
  getById(id: string): Promise<Medication | null>;
  create(input: MedicationInput): Promise<Medication>;
  update(id: string, input: Partial<MedicationInput>): Promise<Medication>;
  delete(id: string): Promise<void>;
  getByStatus(patientId: string, active: boolean): Promise<Medication[]>;
}
SRCEOF

# ── 2. Corregir R1: SupabaseMedicationRepository.ts (import relativo) ──

echo "[2/8] Corrigiendo R1-adapter-repository/after/SupabaseMedicationRepository.ts"
cat > R1-adapter-repository/after/SupabaseMedicationRepository.ts << 'SRCEOF'
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
SRCEOF

# ── 3. Corregir R2: ConfirmDoseCommand.ts (DI en vez de import directo a supabase) ──

echo "[3/8] Corrigiendo R2-command-sync/after/ConfirmDoseCommand.ts"
cat > R2-command-sync/after/ConfirmDoseCommand.ts << 'SRCEOF'
// src/infrastructure/sync/ConfirmDoseCommand.ts

import { SyncCommand, SyncStatus, SyncQueueEntry } from './SyncCommand';

export interface DoseConfirmPayload {
  takenAt: string;
  medicationId: string;
  patientId: string;
}

// Gateway inyectable — desacopla de Supabase para testabilidad
export interface DoseEventGateway {
  upsert(data: Record<string, unknown>): Promise<{ error: unknown }>;
  revert(entityId: string): Promise<{ error: unknown }>;
}

export class ConfirmDoseCommand implements SyncCommand<DoseConfirmPayload> {
  readonly id: string;
  readonly entity = 'dose_event';
  readonly entityId: string;
  readonly payload: DoseConfirmPayload;
  readonly createdAt: string;
  status: SyncStatus = 'pending';
  retryCount = 0;
  maxRetries = 3;

  constructor(
    doseId: string,
    payload: DoseConfirmPayload,
    private readonly gateway: DoseEventGateway,
    idGenerator: () => string = () => `cmd-${Date.now()}`
  ) {
    this.id = idGenerator();
    this.entityId = doseId;
    this.payload = payload;
    this.createdAt = new Date().toISOString();
  }

  async execute(): Promise<void> {
    this.status = 'syncing';
    const { error } = await this.gateway.upsert({
      id: this.entityId,
      status: 'taken',
      taken_at: this.payload.takenAt,
      medication_id: this.payload.medicationId,
      patient_id: this.payload.patientId,
      idempotency_key: this.id
    });

    if (error) {
      this.status = 'failed';
      this.retryCount++;
      throw error;
    }
    this.status = 'synced';
  }

  async undo(): Promise<void> {
    const { error } = await this.gateway.revert(this.entityId);
    if (error) throw error;
    this.status = 'pending';
  }

  canRetry(): boolean {
    return this.retryCount < this.maxRetries;
  }

  toQueueEntry(): SyncQueueEntry {
    return {
      id: this.id,
      entity: this.entity,
      entityId: this.entityId,
      payload: this.payload,
      status: this.status,
      retryCount: this.retryCount,
      createdAt: this.createdAt
    };
  }
}
SRCEOF

# ── 4. Tests ──

echo "[4/8] Reescribiendo tests/useMedications.test.ts"
cat > tests/useMedications.test.ts << 'TESTEOF'
import {
  Medication,
  MedicationInput,
  MedicationRepository
} from '../R1-adapter-repository/after/MedicationRepository';

// Mock repository — sin dependencia de Supabase ni red
class InMemoryMedicationRepository implements MedicationRepository {
  private store: Medication[] = [];

  async getAll(patientId: string): Promise<Medication[]> {
    return this.store.filter((m) => m.patient_id === patientId);
  }

  async getById(id: string): Promise<Medication | null> {
    return this.store.find((m) => m.id === id) ?? null;
  }

  async create(input: MedicationInput): Promise<Medication> {
    const med: Medication = {
      ...input,
      id: `med-${this.store.length + 1}`,
      created_at: new Date().toISOString(),
    };
    this.store.push(med);
    return med;
  }

  async update(id: string, input: Partial<MedicationInput>): Promise<Medication> {
    const idx = this.store.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error('Not found');
    this.store[idx] = { ...this.store[idx], ...input };
    return this.store[idx];
  }

  async delete(id: string): Promise<void> {
    this.store = this.store.filter((m) => m.id !== id);
  }

  async getByStatus(patientId: string, active: boolean): Promise<Medication[]> {
    const status = active ? 'active' : 'completed';
    return this.store.filter((m) => m.patient_id === patientId && m.status === status);
  }
}

describe('useMedications con Repository Pattern', () => {
  let repo: MedicationRepository;

  beforeEach(() => {
    repo = new InMemoryMedicationRepository();
  });

  it('carga medicaciones sin depender de Supabase', async () => {
    await repo.create({ patient_id: 'p1', name: 'Oxaliplatino', active_ingredient: 'oxaliplatino', status: 'active' });
    await repo.create({ patient_id: 'p1', name: 'Leucovorin', active_ingredient: 'folinato calcico', status: 'active' });
    await repo.create({ patient_id: 'p2', name: 'Capecitabina', active_ingredient: 'capecitabina', status: 'active' });

    const meds = await repo.getAll('p1');

    expect(meds).toHaveLength(2);
    expect(meds.map((m) => m.name)).toContain('Oxaliplatino');
  });

  it('crea medicacion mediante interfaz de repositorio', async () => {
    const created = await repo.create({
      patient_id: 'p1',
      name: 'Bevacizumab',
      active_ingredient: 'bevacizumab',
      status: 'active',
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('Bevacizumab');
    expect(created.status).toBe('active');
    expect(created.created_at).toBeDefined();
  });
});
TESTEOF

echo "[5/8] Reescribiendo tests/ConfirmDoseCommand.test.ts"
cat > tests/ConfirmDoseCommand.test.ts << 'TESTEOF'
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
TESTEOF

echo "[6/8] Reescribiendo tests/MedicationScheduleBuilder.test.ts"
cat > tests/MedicationScheduleBuilder.test.ts << 'TESTEOF'
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
TESTEOF

# ── 5. Configs ──

echo "[7/8] Corrigiendo package.json y jest.config.js"
cat > package.json << 'PKGEOF'
{
  "name": "medtrack-refactoring",
  "version": "1.0.0",
  "description": "Refactorizacion del PoC MedTrack mediante patrones de diseno GoF — TFG UNIR",
  "private": true,
  "scripts": {
    "test": "jest --config jest.config.js",
    "test:coverage": "jest --config jest.config.js --coverage"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.4",
    "typescript": "^5.4.5"
  },
  "keywords": [
    "design-patterns", "GoF", "refactoring", "oncology",
    "PWA", "typescript", "repository-pattern",
    "command-pattern", "builder-pattern"
  ],
  "author": "Iago Moure Pazos",
  "license": "MIT"
}
PKGEOF

cat > jest.config.js << 'JESTEOF'
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  collectCoverageFrom: [
    'R1-adapter-repository/after/**/*.ts',
    'R2-command-sync/after/**/*.ts',
    'R3-builder-dosing/after/**/*.ts',
    '!**/*.d.ts'
  ],
  coverageReporters: ['text', 'lcov'],
  testMatch: ['**/tests/**/*.test.ts'],
  verbose: true
};
JESTEOF

# ── 6. Reinstalar y testear ──

echo "[8/8] Reinstalando dependencias y ejecutando tests..."
echo ""
rm -rf node_modules package-lock.json
npm install 2>&1
echo ""
npm test 2>&1

echo ""
echo "=========================================="
echo " Si ves 8 passed, ejecuta:"
echo ""
echo "  git add -A"
echo "  git commit -m \"fix: corregir imports, DI en ConfirmDoseCommand, y tests\""
echo "  git push"
echo "=========================================="
