import { ArrowLeft, Download, Loader2, BookOpen } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import type { Mass } from '@/react-app/types';
import { getWeekStart, getWeekEnd } from '@/react-app/utils/weekHelpers';
import { exportWeeklyReadingsToPDF } from '@/react-app/utils/pdfExport';
import { useReadings } from '@/react-app/hooks/useReadings';
import { decodeHTMLEntities } from '@/react-app/utils/htmlDecode';
import { formatSpanishDate } from '@/react-app/utils/dateFormat';

interface WeeklyReadingsProps {
  masses: Mass[];
  onBack: () => void;
}

export default function WeeklyReadings({ onBack }: WeeklyReadingsProps) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekStart = getWeekStart(currentDate);
  const weekEnd = getWeekEnd(currentDate);

  // Create array of all days in the week
  const weekDays: Date[] = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  }, [weekStart]);

  // Get date strings for the week (using local date to avoid timezone shifts)
  const weekDateStrings = useMemo(() => {
    return weekDays.map(day => {
      const year = day.getFullYear();
      const month = String(day.getMonth() + 1).padStart(2, '0');
      const dayOfMonth = String(day.getDate()).padStart(2, '0');
      return `${year}-${month}-${dayOfMonth}`;
    });
  }, [weekDays]);

  // Fetch readings from external API
  const { readings, loading } = useReadings(weekDateStrings);

  const handlePreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const handleExportPDF = () => {
    // Export PDF with readings data
    const readingsData = weekDays.map(day => {
      const dateKey = day.toISOString().split('T')[0];
      const dayReadings = readings.get(dateKey);
      return {
        mass_date: dateKey,
        mass_time: '',
        mass_type: dayReadings?.mass_type || 'Diaria',
        first_reading: dayReadings?.first_reading || null,
        psalm: dayReadings?.psalm || null,
        second_reading: dayReadings?.second_reading || null,
        gospel: dayReadings?.gospel || null,
        has_second_reading: dayReadings?.second_reading ? 1 : 0,
      } as Mass;
    });
    exportWeeklyReadingsToPDF(readingsData, weekStart, weekEnd);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Volver a consultas"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Lecturas de la Semana</h1>
              <p className="text-gray-600">
                {formatSpanishDate(weekStart, { day: 'numeric', month: 'long', year: 'numeric' })} -{' '}
                {formatSpanishDate(weekEnd, { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <button
            onClick={handleExportPDF}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={handlePreviousWeek}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Semana Anterior
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-200 transition-colors"
          >
            Esta Semana
          </button>
          <button
            onClick={handleNextWeek}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Semana Siguiente →
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <span className="ml-3 text-gray-600">Cargando lecturas...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {weekDays.map((day) => {
              const year = day.getFullYear();
              const month = String(day.getMonth() + 1).padStart(2, '0');
              const dayOfMonth = String(day.getDate()).padStart(2, '0');
              const dateKey = `${year}-${month}-${dayOfMonth}`;
              const dayReadings = readings.get(dateKey);
              const dayName = formatSpanishDate(day, { weekday: 'long' });
              const dayDate = formatSpanishDate(day, { day: 'numeric', month: 'long' });
              
              const hasReadings = dayReadings && (
                dayReadings.first_reading || 
                dayReadings.psalm || 
                dayReadings.gospel
              );
              
              return (
                <div
                  key={dateKey}
                  className={`bg-white rounded-xl p-5 shadow-md border transition-all ${
                    hasReadings 
                      ? 'border-indigo-100 hover:shadow-lg' 
                      : 'border-gray-100 opacity-60'
                  }`}
                >
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-indigo-600 uppercase mb-1">
                      {dayName}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {dayDate}
                    </p>
                    {dayReadings?.liturgical_day && (
                      <p className="text-xs text-gray-700 mt-1 font-medium">
                        {decodeHTMLEntities(dayReadings.liturgical_day)}
                      </p>
                    )}
                    {dayReadings?.mass_type && dayReadings.mass_type !== 'Lecturas de Hoy' && (
                      <p className="text-xs text-gray-500 mt-1 italic">
                        {decodeHTMLEntities(dayReadings.mass_type)}
                      </p>
                    )}
                  </div>

                  {hasReadings ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                        {dayReadings.first_reading && (
                          <div>
                            <p className="text-gray-500 font-medium mb-1">Primera Lectura</p>
                            <p className="text-gray-900 font-semibold">{decodeHTMLEntities(dayReadings.first_reading)}</p>
                          </div>
                        )}

                        {dayReadings.psalm && (
                          <div>
                            <p className="text-gray-500 font-medium mb-1">Salmo</p>
                            <p className="text-gray-900 font-semibold">{decodeHTMLEntities(dayReadings.psalm)}</p>
                          </div>
                        )}

                        {dayReadings.second_reading && (
                          <div>
                            <p className="text-gray-500 font-medium mb-1">Segunda Lectura</p>
                            <p className="text-gray-900 font-semibold">{decodeHTMLEntities(dayReadings.second_reading)}</p>
                          </div>
                        )}

                        {dayReadings.gospel && (
                          <div>
                            <p className="text-gray-500 font-medium mb-1">Evangelio</p>
                            <p className="text-gray-900 font-semibold">{decodeHTMLEntities(dayReadings.gospel)}</p>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => navigate(`/readings/${dateKey}`)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                      >
                        <BookOpen className="w-4 h-4" />
                        Ir a las Lecturas
                      </button>
                    </>
                  ) : (
                    <p className="text-gray-400 text-sm italic">Lecturas no disponibles</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
