import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Calendar, ArrowLeft, Loader2 } from "lucide-react";
import type { Mass, Reader } from "@/react-app/types";
import { formatTimeTo12Hour } from "@/react-app/utils/timeFormat";
import { formatSpanishDate } from "@/react-app/utils/dateFormat";

export default function EucharistSchedule() {
  const navigate = useNavigate();
  const [masses, setMasses] = useState<Mass[]>([]);
  const [readers, setReaders] = useState<Reader[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [massesRes, readersRes] = await Promise.all([
        fetch("/api/masses"),
        fetch("/api/readers"),
      ]);
      const massesData = await massesRes.json();
      const readersData = await readersRes.json();
      setMasses(massesData);
      setReaders(readersData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate dates for previous, current, and next week
  const getWeekDates = (startDate: Date) => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split("T")[0]);
    }
    return dates;
  };

  // Get today's date
  const today = new Date();

  // Get this week's start (Monday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const currentWeekStart = getWeekStart(today);
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const nextWeekStart = new Date(currentWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  
  const previousWeekDates = getWeekDates(previousWeekStart);
  const currentWeekDates = getWeekDates(currentWeekStart);
  const nextWeekDates = getWeekDates(nextWeekStart);
  
  const allAllowedDates = [...previousWeekDates, ...currentWeekDates, ...nextWeekDates];

  const weekMasses = masses.filter((mass) => {
    return allAllowedDates.includes(mass.mass_date);
  });

  const groupedByDate = weekMasses.reduce((acc, mass) => {
    if (!acc[mass.mass_date]) {
      acc[mass.mass_date] = [];
    }
    acc[mass.mass_date].push(mass);
    return acc;
  }, {} as Record<string, Mass[]>);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return formatSpanishDate(date, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  // Group dates by week
  const datesByWeek = {
    previous: Object.keys(groupedByDate).filter(date => previousWeekDates.includes(date)).sort(),
    current: Object.keys(groupedByDate).filter(date => currentWeekDates.includes(date)).sort(),
    next: Object.keys(groupedByDate).filter(date => nextWeekDates.includes(date)).sort(),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-indigo-100">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/user")}
              className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Calendar className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Programación de Eucaristías
                </h1>
                <p className="text-sm text-gray-600">
                  Semana anterior, actual y siguiente
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Schedule */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-indigo-100">
          {Object.keys(groupedByDate).length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">
                No hay celebraciones programadas
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Previous Week */}
              {datesByWeek.previous.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-px flex-1 bg-gray-200"></div>
                    <h3 className="text-lg font-bold text-gray-500 uppercase text-sm">
                      Semana Anterior
                    </h3>
                    <div className="h-px flex-1 bg-gray-200"></div>
                  </div>
                  <div className="space-y-6">
                    {datesByWeek.previous.map((date) => (
                      <div key={date}>
                        <h4 className="text-base font-bold text-gray-700 mb-3">
                          {formatDate(date)}
                        </h4>
                        <div className="space-y-3">
                          {groupedByDate[date]
                            .sort((a, b) => a.mass_time.localeCompare(b.mass_time))
                            .map((mass) => (
                              <MassReadOnlyCard key={mass.id} mass={mass} readers={readers} />
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Week */}
              {datesByWeek.current.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-px flex-1 bg-indigo-200"></div>
                    <h3 className="text-lg font-bold text-indigo-600 uppercase text-sm">
                      Semana Actual
                    </h3>
                    <div className="h-px flex-1 bg-indigo-200"></div>
                  </div>
                  <div className="space-y-6">
                    {datesByWeek.current.map((date) => (
                      <div key={date}>
                        <h4 className="text-base font-bold text-gray-900 mb-3">
                          {formatDate(date)}
                        </h4>
                        <div className="space-y-3">
                          {groupedByDate[date]
                            .sort((a, b) => a.mass_time.localeCompare(b.mass_time))
                            .map((mass) => (
                              <MassReadOnlyCard key={mass.id} mass={mass} readers={readers} />
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Week */}
              {datesByWeek.next.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-px flex-1 bg-gray-200"></div>
                    <h3 className="text-lg font-bold text-gray-500 uppercase text-sm">
                      Semana Siguiente
                    </h3>
                    <div className="h-px flex-1 bg-gray-200"></div>
                  </div>
                  <div className="space-y-6">
                    {datesByWeek.next.map((date) => (
                      <div key={date}>
                        <h4 className="text-base font-bold text-gray-700 mb-3">
                          {formatDate(date)}
                        </h4>
                        <div className="space-y-3">
                          {groupedByDate[date]
                            .sort((a, b) => a.mass_time.localeCompare(b.mass_time))
                            .map((mass) => (
                              <MassReadOnlyCard key={mass.id} mass={mass} readers={readers} />
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface MassReadOnlyCardProps {
  mass: Mass;
  readers: Reader[];
}

function MassReadOnlyCard({ mass, readers }: MassReadOnlyCardProps) {
  const getReaderName = (id: number | null, customName: string | null) => {
    if (customName) return customName;
    if (!id) return null;
    if (!Array.isArray(readers)) return null;
    const reader = readers.find((r) => r.id === id);
    return reader ? reader.name : null;
  };
  
  const firstReader = getReaderName(mass.first_reader_id, mass.first_reader_custom);
  const secondReader = getReaderName(mass.second_reader_id, mass.second_reader_custom);
  const psalmReader = getReaderName(mass.psalm_reader_id, mass.psalm_reader_custom);
  const commentatorReader = getReaderName(mass.commentator_reader_id, mass.commentator_reader_custom);

  const hasSecondReading = mass.has_second_reading === 1;
  const hasCommentator = mass.has_commentator === 1;

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl font-bold text-indigo-600">
          {formatTimeTo12Hour(mass.mass_time)}
        </span>
      </div>

      {/* Reading References */}
      {(mass.first_reading || mass.psalm || mass.second_reading || mass.gospel) && (
        <div className="mb-3 p-2 bg-white/60 rounded-lg border border-indigo-100">
          <p className="text-sm font-medium text-gray-500 mb-1">Referencias Bíblicas</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
            {mass.first_reading && (
              <span><span className="font-medium">1ª:</span> {mass.first_reading}</span>
            )}
            {mass.psalm && (
              <span><span className="font-medium">Salmo:</span> {mass.psalm}</span>
            )}
            {mass.second_reading && (
              <span><span className="font-medium">2ª:</span> {mass.second_reading}</span>
            )}
            {mass.gospel && (
              <span><span className="font-medium">Evangelio:</span> {mass.gospel}</span>
            )}
          </div>
        </div>
      )}

      {/* Reader Assignments - Single Line Layout */}
      <div className="bg-white/70 rounded-lg p-3 border border-indigo-100">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-base">
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-gray-500">1ª Lectura:</span>
            <span className="font-semibold text-indigo-700">
              {firstReader || <span className="text-gray-400 italic">Sin asignar</span>}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-sm text-gray-500">Salmo:</span>
            <span className="font-semibold text-purple-700">
              {psalmReader || <span className="text-gray-400 italic">Sin asignar</span>}
            </span>
          </div>

          {hasSecondReading && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-gray-500">2ª Lectura:</span>
              <span className="font-semibold text-indigo-700">
                {secondReader || <span className="text-gray-400 italic">Sin asignar</span>}
              </span>
            </div>
          )}

          {hasCommentator && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-gray-500">Comentarista:</span>
              <span className="font-semibold text-green-700">
                {commentatorReader || <span className="text-gray-400 italic">Sin asignar</span>}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {mass.notes && mass.notes.trim().length > 0 && (
        <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm font-medium text-blue-700 mb-1">Notas</p>
          <p className="text-sm text-blue-900">{mass.notes}</p>
        </div>
      )}
    </div>
  );
}
