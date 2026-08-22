import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { SpecialCelebration } from '@/react-app/types';

interface SpecialCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  celebration: SpecialCelebration | null;
  onSave: (celebrationData: Omit<SpecialCelebration, 'id' | 'created_at' | 'updated_at' | 'roles'>) => Promise<void>;
  onUpdate: (id: number, celebrationData: Omit<SpecialCelebration, 'id' | 'created_at' | 'updated_at' | 'roles'>) => Promise<void>;
}

export default function SpecialCelebrationModal({ isOpen, onClose, celebration, onSave, onUpdate }: SpecialCelebrationModalProps) {
  const [name, setName] = useState('');
  const [celebrationDate, setCelebrationDate] = useState('');
  const [celebrationTime, setCelebrationTime] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (celebration) {
      setName(celebration.name);
      setCelebrationDate(celebration.celebration_date);
      setCelebrationTime(celebration.celebration_time);
      setDescription(celebration.description || '');
    } else {
      setName('');
      setCelebrationDate('');
      setCelebrationTime('');
      setDescription('');
    }
  }, [celebration]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const celebrationData = {
      name,
      celebration_date: celebrationDate,
      celebration_time: celebrationTime,
      description: description || null,
    };

    if (celebration) {
      await onUpdate(celebration.id, celebrationData);
    } else {
      await onSave(celebrationData);
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {celebration ? 'Editar Celebración' : 'Nueva Celebración Especial'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Celebración *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Viernes Santo, Fiesta Patronal"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha *
            </label>
            <input
              type="date"
              value={celebrationDate}
              onChange={(e) => setCelebrationDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hora *
            </label>
            <input
              type="time"
              value={celebrationTime}
              onChange={(e) => setCelebrationTime(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Información adicional sobre la celebración"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {celebration ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
