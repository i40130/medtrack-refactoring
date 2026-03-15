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
