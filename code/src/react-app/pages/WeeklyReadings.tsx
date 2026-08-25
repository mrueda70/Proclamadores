import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { BookOpen, ArrowLeft, Loader2, Sparkles, Music } from "lucide-react";
import { useReadings } from "@/react-app/hooks/useReadings";
import { decodeHTMLEntities } from "@/react-app/utils/htmlDecode";
import { formatSpanishDate } from "@/react-app/utils/dateFormat";
import { useAuth } from "@/react-app/contexts/AuthContext";
import { getWeekStart } from '@/react-app/utils/weekHelpers';

export default function WeeklyReadings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuth();
  const [selectedWeek, setSelectedWeek] = useState<'current' | 'next'>('current');
  
  // Restore week selection from navigation state
  useEffect(() => {
    const week = (location.state as { week?: 'current' | 'next' })?.week;
    if (week) {
      setSelectedWeek(week);
      // Clear the state so it doesn't persist on page refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Get today's date in Colombia timezone (America/Bogota) - memoized to prevent re-renders
  const todayStr = useMemo(() => {
    const now = new Date();
    const colombiaDateStr = now.toLocaleString('en-US', { 
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const [month, day, year] = colombiaDateStr.split(',')[0].split('/');
    return `${year}-${month}-${day}`;
  }, []);

  // Calculate week start dates - memoized based on todayStr
  const { currentWeekStart, nextWeekStart } = useMemo(() => {
    const currentStart = getWeekStart(new Date(todayStr + 'T12:00:00'));
    
    const nextStart = new Date(currentStart);
    nextStart.setDate(nextStart.getDate() + 7);
    
    return { currentWeekStart: currentStart, nextWeekStart: nextStart };
  }, [todayStr]);

  // Calculate date strings for each week - memoized
  const { currentWeekDates, nextWeekDates } = useMemo(() => {
    const getWeekDates = (startDate: Date) => {
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
      }
      return dates;
    };
    
    return {
      currentWeekDates: getWeekDates(currentWeekStart),
      nextWeekDates: getWeekDates(nextWeekStart)
    };
  }, [currentWeekStart, nextWeekStart]);

  // Get week days as Date objects for display - memoized
  const currentWeekDays: Date[] = useMemo(() => {
    return currentWeekDates.map(dateStr => new Date(dateStr + 'T12:00:00'));
  }, [currentWeekDates]);

  const nextWeekDays: Date[] = useMemo(() => {
    return nextWeekDates.map(dateStr => new Date(dateStr + 'T12:00:00'));
  }, [nextWeekDates]);

  // Get date strings for readings API - memoized
  const readingsDateStrings = useMemo(() => {
    return [...currentWeekDates, ...nextWeekDates];
  }, [currentWeekDates, nextWeekDates]);

  // Fetch readings from external API
  const { readings, loading: readingsLoading } = useReadings(readingsDateStrings);

  const displayWeekDays = selectedWeek === 'current' ? currentWeekDays : nextWeekDays;
  const weekStartDate = selectedWeek === 'current' ? currentWeekStart : nextWeekStart;
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-green-100">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(role === 'admin' ? '/' : '/user')}
              className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-green-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Lecturas de la Palabra
                </h1>
                <p className="text-sm text-gray-600">
                  {formatSpanishDate(weekStartDate, { day: 'numeric', month: 'long' })} -{' '}
                  {formatSpanishDate(weekEndDate, { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Week Selector */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100 mb-6">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setSelectedWeek('current')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                selectedWeek === 'current'
                  ? 'bg-green-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Semana Actual
            </button>
            <button
              onClick={() => setSelectedWeek('next')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                selectedWeek === 'next'
                  ? 'bg-green-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Semana Siguiente
            </button>
          </div>
        </div>

        {/* Readings Content */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100">
          {readingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
              <span className="ml-3 text-gray-600">Cargando lecturas...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {displayWeekDays.map((day) => {
                // Format date as YYYY-MM-DD using local components to avoid timezone issues
                const year = day.getFullYear();
                const month = String(day.getMonth() + 1).padStart(2, '0');
                const dayNum = String(day.getDate()).padStart(2, '0');
                const dateKey = `${year}-${month}-${dayNum}`;
                const dayReadings = readings.get(dateKey);
                const dayName = formatSpanishDate(day, { weekday: 'long' });
                const dayDate = formatSpanishDate(day, { day: 'numeric', month: 'long' });
                
                const hasReadings = dayReadings && (
                  dayReadings.first_reading || 
                  dayReadings.psalm || 
                  dayReadings.gospel
                );
                
                const isToday = dateKey === todayStr;
                // Check if the day is Sunday - robust check
                const isSunday = dayName.toLowerCase().startsWith('dom') || day.getDay() === 0;
                
                return (
                  <div
                    key={dateKey}
                    className={`rounded-xl p-4 shadow-sm border transition-all ${
                      isToday
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'
                        : hasReadings 
                          ? 'bg-white border-green-100 hover:shadow-md' 
                          : 'bg-gray-50 border-gray-100 opacity-60'
                    }`}
                  >
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-sm font-bold uppercase ${isToday ? 'text-green-700' : 'text-green-600'}`}>
                          {dayName}
                        </p>
                        {isToday && (
                          <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded-full">
                            HOY
                          </span>
                        )}
                      </div>
                      <p className="text-base font-bold text-gray-900">
                        {dayDate}
                      </p>
                      {dayReadings?.liturgical_day && (
                        <p className="text-xs text-gray-700 mt-1 font-medium">
                          {decodeHTMLEntities(dayReadings.liturgical_day)}
                        </p>
                      )}
                    </div>

                    {hasReadings ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-3">
                          {dayReadings.first_reading && (
                            <div className="bg-white/70 p-2 rounded-lg">
                              <p className="text-gray-500 font-medium text-xs mb-1">Primera Lectura</p>
                              <p className="text-gray-900 font-semibold text-sm">{decodeHTMLEntities(dayReadings.first_reading)}</p>
                            </div>
                          )}

                          {dayReadings.psalm && (
                            <div className="bg-white/70 p-2 rounded-lg">
                              <p className="text-gray-500 font-medium text-xs mb-1">Salmo</p>
                              <p className="text-gray-900 font-semibold text-sm">{decodeHTMLEntities(dayReadings.psalm)}</p>
                            </div>
                          )}

                          {dayReadings.second_reading && (
                            <div className="bg-white/70 p-2 rounded-lg">
                              <p className="text-gray-500 font-medium text-xs mb-1">Segunda Lectura</p>
                              <p className="text-gray-900 font-semibold text-sm">{decodeHTMLEntities(dayReadings.second_reading)}</p>
                            </div>
                          )}

                          {dayReadings.gospel && (
                            <div className="bg-white/70 p-2 rounded-lg">
                              <p className="text-gray-500 font-medium text-xs mb-1">Evangelio</p>
                              <p className="text-gray-900 font-semibold text-sm">{decodeHTMLEntities(dayReadings.gospel)}</p>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => navigate(`/readings/${dateKey}`, { state: { week: selectedWeek } })}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                        >
                          <BookOpen className="w-4 h-4" />
                          Ir a las Lecturas
                        </button>
                        {isSunday && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => navigate(`/lectio-divina/${dateKey}`, { state: { week: selectedWeek } })}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-xs font-semibold"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Lectio Divina
                            </button>
                            <button
                              onClick={() => navigate(`/cantos/${dateKey}`, { state: { week: selectedWeek } })}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-semibold"
                            >
                              <Music className="w-3.5 h-3.5" />
                              Cantos Sugeridos
                            </button>
                          </div>
                        )}
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
    </div>
  );
}
