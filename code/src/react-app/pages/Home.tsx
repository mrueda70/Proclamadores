import { Calendar, Plus, FileDown, Copy } from 'lucide-react';
import { useState } from 'react';
import MassCard from '@/react-app/components/MassCard';
import Header from '@/react-app/components/Header';
import Dashboard from '@/react-app/components/Dashboard';
import Reports from '@/react-app/pages/Reports';
import SpecialCelebrations from '@/react-app/pages/SpecialCelebrations';
import AssignmentModal from '@/react-app/components/AssignmentModal';
import ReadersModal from '@/react-app/components/ReadersModal';
import MassModal from '@/react-app/components/MassModal';
import DateRangeModal from '@/react-app/components/DateRangeModal';
import CopyScheduleModal from '@/react-app/components/CopyScheduleModal';
import WeekSelector from '@/react-app/components/WeekSelector';
import { useReaders } from '@/react-app/hooks/useReaders';
import { useMasses } from '@/react-app/hooks/useMasses';
import { useSpecialCelebrations } from '@/react-app/hooks/useSpecialCelebrations';
import { exportWeeklyAssignmentsPDF } from '@/react-app/utils/pdfExport';
import { getWeekStart, filterMassesByWeek } from '@/react-app/utils/weekHelpers';
import { formatSpanishDate } from '@/react-app/utils/dateFormat';
import type { Mass } from '@/react-app/types';

export default function Home() {
  const { masses, createMass, updateMass, deleteMass, updateAssignments, copySchedule } = useMasses();
  const { readers, createReader, updateReader, deleteReader } = useReaders();
  const { celebrations, createCelebration, updateCelebration, deleteCelebration, updateRoles } = useSpecialCelebrations();
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isReadersModalOpen, setIsReadersModalOpen] = useState(false);
  const [isMassModalOpen, setIsMassModalOpen] = useState(false);
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);
  const [isCopyScheduleModalOpen, setIsCopyScheduleModalOpen] = useState(false);
  const [selectedMass, setSelectedMass] = useState<Mass | null>(null);
  const [editingMass, setEditingMass] = useState<Mass | null>(null);
  const [showDashboard, setShowDashboard] = useState(true);
  const [showReports, setShowReports] = useState(false);
  const [showSpecialCelebrations, setShowSpecialCelebrations] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [calendarTitle, setCalendarTitle] = useState('Calendario de Eucaristías');

  const filteredMasses = filterMassesByWeek(masses, selectedWeekStart);
  
  const groupedMasses = filteredMasses.reduce((acc, mass) => {
    if (!acc[mass.mass_date]) {
      acc[mass.mass_date] = [];
    }
    acc[mass.mass_date].push(mass);
    return acc;
  }, {} as Record<string, typeof masses>);

  const sortedDates = Object.keys(groupedMasses).sort();

  const handleAssignReaders = (mass: Mass) => {
    setSelectedMass(mass);
    setIsAssignmentModalOpen(true);
  };

  const handleEditMass = (mass: Mass) => {
    setEditingMass(mass);
    setIsMassModalOpen(true);
  };

  const handleNewMass = () => {
    setEditingMass(null);
    setIsMassModalOpen(true);
  };

  const handleDeleteMass = async (mass: Mass) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta misa?')) {
      await deleteMass(mass.id);
    }
  };

  const handleSaveMass = async (massData: Omit<Mass, 'id' | 'created_at' | 'updated_at'>) => {
    await createMass(massData);
  };

  const handleUpdateMass = async (id: number, massData: Omit<Mass, 'id' | 'created_at' | 'updated_at'>) => {
    await updateMass(id, massData);
  };

  const handleSaveAssignment = async (
    massId: number,
    assignments: {
      first_reader_id?: number | null;
      second_reader_id?: number | null;
      psalm_reader_id?: number | null;
      commentator_reader_id?: number | null;
    }
  ) => {
    await updateAssignments(massId, assignments);
  };

  const handleSaveReader = async (readerData: { name: string; email: string; phone: string; address: string; birth_date: string; is_active: number }) => {
    await createReader(readerData);
  };

  const handleUpdateReader = async (id: number, readerData: { name: string; email: string; phone: string; address: string; birth_date: string; is_active: number }) => {
    await updateReader(id, readerData);
  };

  const handleDeleteReader = async (id: number) => {
    await deleteReader(id);
  };

  const handleExportPDF = async (startDate: Date, endDate: Date) => {
    await exportWeeklyAssignmentsPDF(masses, readers, startDate, endDate);
  };

  const handleCopySchedule = async (
    sourceStart: string,
    sourceEnd: string,
    destStart: string,
    destEnd: string,
    includeReaders: boolean
  ) => {
    await copySchedule(sourceStart, sourceEnd, destStart, destEnd, includeReaders);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Header />
      
      <main>
        {showSpecialCelebrations ? (
          <SpecialCelebrations
            celebrations={celebrations}
            readers={readers}
            onBack={() => {
              setShowSpecialCelebrations(false);
              setShowDashboard(true);
            }}
            onCreateCelebration={createCelebration}
            onUpdateCelebration={updateCelebration}
            onDeleteCelebration={deleteCelebration}
            onUpdateRoles={updateRoles}
          />
        ) : showReports ? (
          <Reports
            masses={masses}
            readers={readers}
            onBack={() => {
              setShowReports(false);
              setShowDashboard(true);
            }}
          />
        ) : showDashboard ? (
          <Dashboard
            masses={masses}
            readers={readers}
            onManageReaders={() => setIsReadersModalOpen(true)}
            onManageEucharists={() => {
              setCalendarTitle('Gestionar Eucaristías y Programación');
              setShowDashboard(false);
            }}
            onManageSpecialCelebrations={() => {
              setShowDashboard(false);
              setShowSpecialCelebrations(true);
            }}
            onManageReports={() => {
              setShowDashboard(false);
              setShowReports(true);
            }}
          />
        ) : (
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
            <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-6 border border-indigo-100">
              {/* Header - Mobile Optimized */}
              <div className="mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <button
                    onClick={() => setShowDashboard(true)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Volver al panel"
                  >
                    ←
                  </button>
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                  </div>
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900 flex-1 leading-tight">{calendarTitle}</h2>
                </div>
                
                {/* Action Buttons - Mobile Stacked */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => setIsDateRangeModalOpen(true)}
                    className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Exportar PDF</span>
                  </button>
                  <button
                    onClick={() => setIsCopyScheduleModalOpen(true)}
                    className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copiar Programación</span>
                  </button>
                  <button
                    onClick={handleNewMass}
                    className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nueva Misa</span>
                  </button>
                </div>
              </div>

              <WeekSelector
                selectedWeekStart={selectedWeekStart}
                onWeekChange={setSelectedWeekStart}
              />

              <div className="space-y-8">
                {sortedDates.length === 0 ? (
                  <div className="text-center py-16">
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 mb-2">No hay misas programadas para esta semana</p>
                    <p className="text-sm text-gray-400">Haz clic en "Nueva Misa" para crear una o selecciona otra semana</p>
                  </div>
                ) : (
                  sortedDates.map((date) => {
                    const dateMasses = groupedMasses[date];
                    const dateObj = new Date(date + 'T00:00:00');
                    const formattedDate = formatSpanishDate(dateObj, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    });

                    return (
                      <div key={date} className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
                          {formattedDate}
                        </h3>
                        <div className="grid gap-4">
                          {dateMasses.map((mass) => (
                            <MassCard
                              key={mass.id}
                              mass={mass}
                              readers={readers}
                              onEdit={() => handleAssignReaders(mass)}
                              onEditMass={() => handleEditMass(mass)}
                              onDelete={() => handleDeleteMass(mass)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <AssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        mass={selectedMass}
        readers={readers}
        onSave={handleSaveAssignment}
      />

      <ReadersModal
        isOpen={isReadersModalOpen}
        onClose={() => setIsReadersModalOpen(false)}
        readers={readers}
        onSave={handleSaveReader}
        onUpdate={handleUpdateReader}
        onDelete={handleDeleteReader}
      />

      <MassModal
        isOpen={isMassModalOpen}
        onClose={() => setIsMassModalOpen(false)}
        mass={editingMass}
        onSave={handleSaveMass}
        onUpdate={handleUpdateMass}
      />

      <DateRangeModal
        isOpen={isDateRangeModalOpen}
        onClose={() => setIsDateRangeModalOpen(false)}
        onExport={handleExportPDF}
      />

      <CopyScheduleModal
        isOpen={isCopyScheduleModalOpen}
        onClose={() => setIsCopyScheduleModalOpen(false)}
        onCopy={handleCopySchedule}
      />
    </div>
  );
}
