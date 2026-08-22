import { X, Copy, Calendar as CalendarIcon } from 'lucide-react';
import { useState } from 'react';

interface CopyScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopy: (sourceStart: string, sourceEnd: string, destStart: string, destEnd: string, includeReaders: boolean) => Promise<void>;
}

export default function CopyScheduleModal({ isOpen, onClose, onCopy }: CopyScheduleModalProps) {
  const [sourceStartDate, setSourceStartDate] = useState('');
  const [sourceEndDate, setSourceEndDate] = useState('');
  const [destStartDate, setDestStartDate] = useState('');
  const [destEndDate, setDestEndDate] = useState('');
  const [includeReaders, setIncludeReaders] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateDates = (): boolean => {
    setError('');

    if (!sourceStartDate || !sourceEndDate || !destStartDate || !destEndDate) {
      setError('Debe completar todas las fechas');
      return false;
    }

    const srcStart = new Date(sourceStartDate + 'T00:00:00');
    const srcEnd = new Date(sourceEndDate + 'T00:00:00');
    const dstStart = new Date(destStartDate + 'T00:00:00');
    const dstEnd = new Date(destEndDate + 'T00:00:00');

    // Validar que las fechas de origen sean coherentes
    if (srcStart > srcEnd) {
      setError('La fecha de inicio del origen debe ser anterior a la fecha de fin');
      return false;
    }

    // Validar que las fechas de destino sean coherentes
    if (dstStart > dstEnd) {
      setError('La fecha de inicio del destino debe ser anterior a la fecha de fin');
      return false;
    }

    // Calcular número de días
    const sourceDays = Math.floor((srcEnd.getTime() - srcStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const destDays = Math.floor((dstEnd.getTime() - dstStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (sourceDays !== destDays) {
      setError(`Los rangos deben tener el mismo número de días. Origen: ${sourceDays} días, Destino: ${destDays} días`);
      return false;
    }

    // Validar que el día de la semana inicial coincida
    if (srcStart.getDay() !== dstStart.getDay()) {
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      setError(`El día inicial debe coincidir. Origen inicia en ${dayNames[srcStart.getDay()]}, Destino inicia en ${dayNames[dstStart.getDay()]}`);
      return false;
    }

    // Validar que el día de la semana final coincida
    if (srcEnd.getDay() !== dstEnd.getDay()) {
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      setError(`El día final debe coincidir. Origen termina en ${dayNames[srcEnd.getDay()]}, Destino termina en ${dayNames[dstEnd.getDay()]}`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateDates()) {
      return;
    }

    setLoading(true);
    try {
      await onCopy(sourceStartDate, sourceEndDate, destStartDate, destEndDate, includeReaders);
      setSourceStartDate('');
      setSourceEndDate('');
      setDestStartDate('');
      setDestEndDate('');
      setIncludeReaders(true);
      setError('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al copiar programación');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Copy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Copiar Programación</h2>
                <p className="text-indigo-100 text-sm">Duplique la programación de un rango de fechas</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarIcon className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">Rango Origen</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Desde *
                </label>
                <input
                  type="date"
                  value={sourceStartDate}
                  onChange={(e) => setSourceStartDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hasta *
                </label>
                <input
                  type="date"
                  value={sourceEndDate}
                  onChange={(e) => setSourceEndDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarIcon className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Rango Destino</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Desde *
                </label>
                <input
                  type="date"
                  value={destStartDate}
                  onChange={(e) => setDestStartDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hasta *
                </label>
                <input
                  type="date"
                  value={destEndDate}
                  onChange={(e) => setDestEndDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-lg">
              <input
                type="checkbox"
                id="include_readers"
                checked={includeReaders}
                onChange={(e) => setIncludeReaders(e.target.checked)}
                className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="include_readers" className="text-sm font-medium text-gray-900 cursor-pointer flex-1">
                Incluir asignación de proclamadores
                <p className="text-xs text-gray-600 font-normal mt-1">
                  Si está marcado, se copiarán los proclamadores asignados. Si no, solo se crearán las eucaristías sin asignaciones.
                </p>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              <Copy className="w-5 h-5" />
              {loading ? 'Copiando...' : 'Copiar Programación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
