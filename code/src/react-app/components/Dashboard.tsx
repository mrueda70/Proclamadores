import { Users, Calendar, FileText, Sparkles, RefreshCw, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { Mass, Reader } from '@/react-app/types';
import { formatTimeTo12Hour } from '@/react-app/utils/timeFormat';
import { formatSpanishDate } from '@/react-app/utils/dateFormat';

interface DashboardProps {
  masses: Mass[];
  readers: Reader[];
  onManageReaders: () => void;
  onManageEucharists: () => void;
  onManageReports: () => void;
  onManageSpecialCelebrations: () => void;
}

export default function Dashboard({ masses, readers, onManageReaders, onManageEucharists, onManageReports, onManageSpecialCelebrations }: DashboardProps) {
  const navigate = useNavigate();
  
  // Get current date information
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayString = today.toISOString().split('T')[0];
  
  // Get tomorrow's date
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowString = tomorrow.toISOString().split('T')[0];
  
  // Get masses for today and tomorrow (all masses from these days)
  const upcomingMasses = masses
    .filter((m) => {
      // Include all masses from today or tomorrow
      return m.mass_date === todayString || m.mass_date === tomorrowString;
    })
    .sort((a, b) => {
      const dateTimeA = new Date(`${a.mass_date}T${a.mass_time}`);
      const dateTimeB = new Date(`${b.mass_date}T${b.mass_time}`);
      return dateTimeA.getTime() - dateTimeB.getTime();
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Control</h1>
        <p className="text-gray-600">Gestiona las lecturas y asignaciones de tu parroquia</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button
          onClick={onManageEucharists}
          className="bg-white rounded-2xl p-8 shadow-lg border border-indigo-100 hover:shadow-xl transition-all group text-left"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-100 rounded-xl group-hover:bg-indigo-200 transition-colors">
              <Calendar className="w-8 h-8 text-indigo-600" />
            </div>
            <div className="text-4xl group-hover:translate-x-1 transition-transform">→</div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">EUCARISTÍAS Y PROGRAMACIÓN</h3>
          <p className="text-gray-600">
            Crea misas y asigna proclamadores a las lecturas
          </p>
        </button>

        <button
          onClick={onManageReaders}
          className="bg-white rounded-2xl p-8 shadow-lg border border-purple-100 hover:shadow-xl transition-all group text-left"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <div className="text-4xl group-hover:translate-x-1 transition-transform">→</div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">PROCLAMADORES</h3>
          <p className="text-gray-600">
            Añade, edita o elimina proclamadores de tu parroquia
          </p>
        </button>

        <button
          onClick={onManageSpecialCelebrations}
          className="bg-white rounded-2xl p-8 shadow-lg border border-orange-100 hover:shadow-xl transition-all group text-left"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-xl group-hover:bg-orange-200 transition-colors">
              <Sparkles className="w-8 h-8 text-orange-600" />
            </div>
            <div className="text-4xl group-hover:translate-x-1 transition-transform">→</div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">CELEBRACIONES ESPECIALES</h3>
          <p className="text-gray-600">
            Gestiona Semana Santa, fiestas patronales y más
          </p>
        </button>

        <button
          onClick={onManageReports}
          className="bg-white rounded-2xl p-8 shadow-lg border border-green-100 hover:shadow-xl transition-all group text-left"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
              <FileText className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-4xl group-hover:translate-x-1 transition-transform">→</div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">CONSULTAS</h3>
          <p className="text-gray-600">
            Genera reportes de lectores y consulta participación
          </p>
        </button>

        <button
          onClick={() => navigate('/admin/refresh-readings')}
          className="bg-white rounded-2xl p-8 shadow-lg border border-blue-100 hover:shadow-xl transition-all group text-left"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
              <RefreshCw className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-4xl group-hover:translate-x-1 transition-transform">→</div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">ACTUALIZAR LECTURAS</h3>
          <p className="text-gray-600">
            Actualiza lecturas por rango de fechas desde Ciudad Redonda
          </p>
        </button>

        <button
          onClick={() => navigate('/admin/auto-assign')}
          className="bg-white rounded-2xl p-8 shadow-lg border border-teal-100 hover:shadow-xl transition-all group text-left"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-teal-100 rounded-xl group-hover:bg-teal-200 transition-colors">
              <Wand2 className="w-8 h-8 text-teal-600" />
            </div>
            <div className="text-4xl group-hover:translate-x-1 transition-transform">→</div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">ASIGNACIÓN AUTOMÁTICA</h3>
          <p className="text-gray-600">
            Genera asignaciones de proclamadores según disponibilidad
          </p>
        </button>

      </div>

      {/* Upcoming Masses */}
      {upcomingMasses.length > 0 && (
        <div className="mt-8 bg-white rounded-2xl p-6 shadow-lg border border-indigo-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Eucaristías de Hoy y Mañana
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingMasses.map((mass) => {
              const massDate = new Date(mass.mass_date + 'T00:00:00');
              const firstReader = mass.first_reader_id ? readers.find((r) => r.id === mass.first_reader_id) : null;
              const psalmReader = mass.psalm_reader_id ? readers.find((r) => r.id === mass.psalm_reader_id) : null;
              const secondReader = mass.second_reader_id ? readers.find((r) => r.id === mass.second_reader_id) : null;
              const commentatorReader = mass.commentator_reader_id ? readers.find((r) => r.id === mass.commentator_reader_id) : null;
              const isToday = mass.mass_date === todayString;
              
              return (
                <div
                  key={mass.id}
                  className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 hover:shadow-md transition-shadow"
                >
                  <div className="mb-3">
                    <p className="text-xs font-medium text-indigo-600 mb-1">
                      {isToday ? 'HOY' : formatSpanishDate(massDate, { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">{formatTimeTo12Hour(mass.mass_time)}</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    {firstReader && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-gray-500">Primera Lectura</p>
                          <p className="font-medium text-gray-900 truncate">{firstReader.name}</p>
                        </div>
                      </div>
                    )}
                    {psalmReader && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-gray-500">Salmo</p>
                          <p className="font-medium text-gray-900 truncate">{psalmReader.name}</p>
                        </div>
                      </div>
                    )}
                    {mass.has_second_reading === 1 && secondReader && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-gray-500">Segunda Lectura</p>
                          <p className="font-medium text-gray-900 truncate">{secondReader.name}</p>
                        </div>
                      </div>
                    )}
                    {mass.has_commentator === 1 && commentatorReader && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-gray-500">Comentarista</p>
                          <p className="font-medium text-gray-900 truncate">{commentatorReader.name}</p>
                        </div>
                      </div>
                    )}
                    {!firstReader && !psalmReader && !secondReader && !commentatorReader && (
                      <p className="text-gray-400 text-xs italic">Sin proclamadores asignados</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


    </div>
  );
}
