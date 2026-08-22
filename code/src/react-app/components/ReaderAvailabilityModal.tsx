import { X, Save, Clock, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Reader, ReaderAvailability } from '@/react-app/types';
import { useReaderAvailability } from '@/react-app/hooks/useReaderAvailability';

interface ReaderAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  reader: Reader | null;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

const MASS_TIMES = [
  { value: '07:00', label: '7:00 a.m.' },
  { value: '08:00', label: '8:00 a.m.' },
  { value: '11:00', label: '11:00 a.m.' },
  { value: '16:00', label: '4:00 p.m.' },
  { value: '17:00', label: '5:00 p.m.' },
  { value: '18:30', label: '6:30 p.m.' },
];

export default function ReaderAvailabilityModal({
  isOpen,
  onClose,
  reader,
}: ReaderAvailabilityModalProps) {
  const { fetchAvailability, updateAvailability, loading } = useReaderAvailability();
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && reader) {
      loadAvailability();
    }
  }, [isOpen, reader]);

  const loadAvailability = async () => {
    if (!reader) return;
    const availability = await fetchAvailability(reader.id);
    const slots = new Set(
      availability.map((a: ReaderAvailability) => `${a.day_of_week}-${a.mass_time}`)
    );
    setSelectedSlots(slots);
  };

  const toggleSlot = (day: number, time: string) => {
    const key = `${day}-${time}`;
    const newSlots = new Set(selectedSlots);
    if (newSlots.has(key)) {
      newSlots.delete(key);
    } else {
      newSlots.add(key);
    }
    setSelectedSlots(newSlots);
  };

  const handleSave = async () => {
    if (!reader) return;
    setSaving(true);
    try {
      const availability = Array.from(selectedSlots).map((slot) => {
        const [day, time] = slot.split('-');
        return { day_of_week: parseInt(day), mass_time: time };
      });
      await updateAvailability(reader.id, availability);
      onClose();
    } catch (error) {
      console.error('Error saving availability:', error);
    } finally {
      setSaving(false);
    }
  };

  const selectAllForDay = (day: number) => {
    const newSlots = new Set(selectedSlots);
    MASS_TIMES.forEach((time) => {
      newSlots.add(`${day}-${time.value}`);
    });
    setSelectedSlots(newSlots);
  };

  const clearDay = (day: number) => {
    const newSlots = new Set(selectedSlots);
    MASS_TIMES.forEach((time) => {
      newSlots.delete(`${day}-${time.value}`);
    });
    setSelectedSlots(newSlots);
  };

  const isDayFullySelected = (day: number) => {
    return MASS_TIMES.every((time) => selectedSlots.has(`${day}-${time.value}`));
  };

  if (!isOpen || !reader) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Disponibilidad</h2>
                <p className="text-emerald-100 text-sm">{reader.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm mb-4">
                Selecciona los días y horarios en que este proclamador está disponible para participar en las misas.
              </p>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-left text-sm font-semibold text-gray-700 border-b">
                        Día
                      </th>
                      {MASS_TIMES.map((time) => (
                        <th
                          key={time.value}
                          className="p-2 text-center text-sm font-semibold text-gray-700 border-b"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3" />
                            {time.label}
                          </div>
                        </th>
                      ))}
                      <th className="p-2 text-center text-sm font-semibold text-gray-700 border-b">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS_OF_WEEK.map((day) => (
                      <tr key={day.value} className="hover:bg-gray-50">
                        <td className="p-2 text-sm font-medium text-gray-900 border-b">
                          {day.label}
                        </td>
                        {MASS_TIMES.map((time) => {
                          const isSelected = selectedSlots.has(`${day.value}-${time.value}`);
                          return (
                            <td key={time.value} className="p-2 text-center border-b">
                              <button
                                onClick={() => toggleSlot(day.value, time.value)}
                                className={`w-8 h-8 rounded-lg transition-all ${
                                  isSelected
                                    ? 'bg-emerald-500 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                              >
                                {isSelected ? '✓' : ''}
                              </button>
                            </td>
                          );
                        })}
                        <td className="p-2 text-center border-b">
                          <button
                            onClick={() =>
                              isDayFullySelected(day.value)
                                ? clearDay(day.value)
                                : selectAllForDay(day.value)
                            }
                            className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                          >
                            {isDayFullySelected(day.value) ? 'Quitar' : 'Todos'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-sm text-emerald-800">
                  <strong>Resumen:</strong> {selectedSlots.size} horario{selectedSlots.size !== 1 ? 's' : ''} seleccionado{selectedSlots.size !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all font-medium flex items-center gap-2 shadow-lg disabled:opacity-50"
          >
            {saving ? (
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
