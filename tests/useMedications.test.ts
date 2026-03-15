// tests/useMedications.test.ts
// Verifica el desacoplamiento del hook respecto a Supabase (R1)

import { renderHook, act } from '@testing-library/react-hooks';
import { useMedications } from '@/hooks/useMedications';
import { MedicationRepository } from '@/domain/ports/MedicationRepository';

const mockRepo: MedicationRepository = {
  getAll: jest.fn().mockResolvedValue([
    { id: 'med-1', name: 'Tamoxifeno', dosage: '20mg', is_active: true },
    { id: 'med-2', name: 'Paracetamol', dosage: '1g', is_active: true }
  ]),
  getById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getByStatus: jest.fn()
};

jest.mock('@/store/auth', () => ({
  useAuthStore: () => ({ user: { id: 'user-test-001' } })
}));

describe('useMedications con Repository Pattern', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('carga medicaciones sin depender de Supabase', async () => {
    const { result } = renderHook(() => useMedications(mockRepo));
    await act(async () => {
      await result.current.loadMedications();
    });
    expect(result.current.medications).toHaveLength(2);
    expect(result.current.medications[0].name).toBe('Tamoxifeno');
    expect(mockRepo.getAll).toHaveBeenCalledWith('user-test-001');
  });

  test('crea medicacion mediante interfaz de repositorio', async () => {
    const newMed = { id: 'med-3', name: 'Ondansetron', dosage: '8mg', is_active: true };
    (mockRepo.create as jest.Mock).mockResolvedValue(newMed);

    const { result } = renderHook(() => useMedications(mockRepo));
    await act(async () => {
      const created = await result.current.addMedication({
        name: 'Ondansetron',
        dosage: '8mg',
        patient_id: 'patient-1'
      });
      expect(created.id).toBe('med-3');
    });
    expect(result.current.medications).toHaveLength(1);
    expect(mockRepo.create).toHaveBeenCalledTimes(1);
  });
});
