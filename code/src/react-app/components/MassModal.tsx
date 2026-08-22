import { X, Save, Calendar as CalendarIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Mass } from '@/react-app/types';

interface MassModalProps {
  isOpen: boolean;
  onClose: () => void;
  mass: Mass | null;
  onSave: (massData: Omit<Mass, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdate: (id: number, massData: Omit<Mass, 'id' | 'created_at' | 'updated_at'>) => void;
}

export default function MassModal({ isOpen, onClose, mass, onSave, onUpdate }: MassModalProps) {
  const [formData, setFormData] = useState({
    mass_date: '',
    mass_time: '',
    mass_type: '',
    first_reading: null as string | null,
    psalm: null as string | null,
    second_reading: null as string | null,
    gospel: null as string | null,
    has_second_reading: 0,
    has_commentator: 0,
    has_notes: 1,
    notes: '',
    first_reader_id: null as number | null,
    second_reader_id: null as number | null,
    psalm_reader_id: null as number | null,
    commentator_reader_id: null as number | null,
    first_reader_custom: null as string | null,
    second_reader_custom: null as string | null,
    psalm_reader_custom: null as string | null,
    commentator_reader_custom: null as string | null,
  });

  useEffect(() => {
    if (mass) {
      setFormData({
        mass_date: mass.mass_date,
        mass_time: mass.mass_time,
        mass_type: '',
        first_reading: null,
        psalm: null,
        second_reading: null,
        gospel: null,
        has_second_reading: mass.has_second_reading ?? 0,
        has_commentator: mass.has_commentator ?? 0,
        has_notes: 1,
        notes: mass.notes || '',
        first_reader_id: mass.first_reader_id,
        second_reader_id: mass.second_reader_id,
        psalm_reader_id: mass.psalm_reader_id,
        commentator_reader_id: mass.commentator_reader_id,
        first_reader_custom: mass.first_reader_custom,
        second_reader_custom: mass.second_reader_custom,
        psalm_reader_custom: mass.psalm_reader_custom,
        commentator_reader_custom: mass.commentator_reader_custom,
      });
    } else {
      setFormData({
        mass_date: '',
        mass_time: '',
        mass_type: '',
        first_reading: null,
        psalm: null,
        second_reading: null,
        gospel: null,
        has_second_reading: 0,
        has_commentator: 0,
        has_notes: 1,
        notes: '',
        first_reader_id: null,
        second_reader_id: null,
        psalm_reader_id: null,
        commentator_reader_id: null,
        first_reader_custom: null,
        second_reader_custom: null,
        psalm_reader_custom: null,
        commentator_reader_custom: null,
      });
    }
  }, [mass, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    console.log('Is editing?', !!mass);
    try {
      if (mass) {
        console.log('Calling onUpdate for mass id:', mass.id);
        await onUpdate(mass.id, formData);
      } else {
        console.log('Calling onSave with formData');
        await onSave(formData);
      }
      console.log('Save/Update successful, closing modal');
      onClose();
    } catch (error) {
      console.error('Error saving mass:', error);
      alert('Error al guardar la misa. Por favor intenta de nuevo.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <CalendarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {mass ? 'Editar Misa' : 'Nueva Misa'}
                </h2>
                <p className="text-indigo-100 text-sm">Complete los detalles de la eucaristía</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha *
              </label>
              <input
                type="date"
                value={formData.mass_date}
                onChange={(e) => setFormData({ ...formData, mass_date: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora *
              </label>
              <input
                type="time"
                value={formData.mass_time}
                onChange={(e) => setFormData({ ...formData, mass_time: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-5">
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="has_second_reading"
                  checked={formData.has_second_reading === 1}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    has_second_reading: e.target.checked ? 1 : 0
                  })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="has_second_reading" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Incluir Segunda Lectura
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="has_commentator"
                  checked={formData.has_commentator === 1}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    has_commentator: e.target.checked ? 1 : 0
                  })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="has_commentator" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Incluir Comentarista
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px]"
                placeholder="Notas o comentarios sobre esta celebración (ej: Epifanía del Señor, Domingo de Ramos, etc.)"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium flex items-center justify-center gap-2 shadow-lg"
            >
              <Save className="w-5 h-5" />
              {mass ? 'Actualizar Misa' : 'Crear Misa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
