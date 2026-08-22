import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatSpanishDate } from '@/react-app/utils/dateFormat';

interface WeekSelectorProps {
  selectedWeekStart: Date;
  onWeekChange: (weekStart: Date) => void;
}

export default function WeekSelector({ selectedWeekStart, onWeekChange }: WeekSelectorProps) {
  const getWeekRange = (date: Date) => {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day;
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return { weekStart, weekEnd };
  };

  const { weekStart, weekEnd } = getWeekRange(selectedWeekStart);

  const goToPreviousWeek = () => {
    const newDate = new Date(selectedWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    const normalized = getWeekRange(newDate).weekStart;
    onWeekChange(normalized);
  };

  const goToNextWeek = () => {
    const newDate = new Date(selectedWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    const normalized = getWeekRange(newDate).weekStart;
    onWeekChange(normalized);
  };

  const goToCurrentWeek = () => {
    const normalized = getWeekRange(new Date()).weekStart;
    onWeekChange(normalized);
  };

  const isCurrentWeek = () => {
    const { weekStart: currentWeekStart } = getWeekRange(new Date());
    return weekStart.getTime() === currentWeekStart.getTime();
  };

  const formatWeekRange = () => {
    const startFormatted = formatSpanishDate(weekStart, { weekday: 'short', day: 'numeric', month: 'short' });
    const endFormatted = formatSpanishDate(weekEnd, { weekday: 'short', day: 'numeric', month: 'short' });
    const year = weekEnd.getFullYear();
    
    return `${startFormatted} - ${endFormatted}, ${year}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-indigo-100 p-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={goToPreviousWeek}
          className="p-2 hover:bg-indigo-50 rounded-lg transition-colors group"
          title="Semana anterior"
        >
          <ChevronLeft className="w-5 h-5 text-indigo-600 group-hover:text-indigo-700" />
        </button>

        <div className="flex-1 flex items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Semana seleccionada</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatWeekRange()}
            </p>
          </div>
          
          {!isCurrentWeek() && (
            <button
              onClick={goToCurrentWeek}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Semana actual
            </button>
          )}
        </div>

        <button
          onClick={goToNextWeek}
          className="p-2 hover:bg-indigo-50 rounded-lg transition-colors group"
          title="Semana siguiente"
        >
          <ChevronRight className="w-5 h-5 text-indigo-600 group-hover:text-indigo-700" />
        </button>
      </div>
    </div>
  );
}
