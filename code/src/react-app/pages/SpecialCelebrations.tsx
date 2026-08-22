import { useState } from 'react';
import { Calendar, Plus, Edit, Trash2, Users, ArrowLeft, FileDown } from 'lucide-react';
import type { Reader, SpecialCelebration } from '@/react-app/types';
import SpecialCelebrationModal from '@/react-app/components/SpecialCelebrationModal';
import CelebrationRolesModal from '@/react-app/components/CelebrationRolesModal';
import { formatTimeTo12Hour } from '@/react-app/utils/timeFormat';
import { exportSpecialCelebrationsToPDF } from '@/react-app/utils/pdfExport';
import { formatSpanishDate } from '@/react-app/utils/dateFormat';

interface SpecialCelebrationsProps {
  celebrations: SpecialCelebration[];
  readers: Reader[];
  onBack: () => void;
  onCreateCelebration: (data: Omit<SpecialCelebration, 'id' | 'created_at' | 'updated_at' | 'roles'>) => Promise<void>;
  onUpdateCelebration: (id: number, data: Omit<SpecialCelebration, 'id' | 'created_at' | 'updated_at' | 'roles'>) => Promise<void>;
  onDeleteCelebration: (id: number) => Promise<void>;
  onUpdateRoles: (celebrationId: number, roles: any[]) => Promise<void>;
}

export default function SpecialCelebrations({
  celebrations,
  readers,
  onBack,
  onCreateCelebration,
  onUpdateCelebration,
  onDeleteCelebration,
  onUpdateRoles,
}: SpecialCelebrationsProps) {
  const [isCelebrationModalOpen, setIsCelebrationModalOpen] = useState(false);
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [editingCelebration, setEditingCelebration] = useState<SpecialCelebration | null>(null);
  const [selectedCelebration, setSelectedCelebration] = useState<SpecialCelebration | null>(null);
  const [selectedForExport, setSelectedForExport] = useState<Set<number>>(new Set());

  const handleNewCelebration = () => {
    setEditingCelebration(null);
    setIsCelebrationModalOpen(true);
  };

  const handleEditCelebration = (celebration: SpecialCelebration) => {
    setEditingCelebration(celebration);
    setIsCelebrationModalOpen(true);
  };

  const handleAssignRoles = (celebration: SpecialCelebration) => {
    setSelectedCelebration(celebration);
    setIsRolesModalOpen(true);
  };

  const handleDeleteCelebration = async (celebration: SpecialCelebration) => {
    if (confirm(`¿Estás seguro de eliminar "${celebration.name}"?`)) {
      await onDeleteCelebration(celebration.id);
    }
  };

  const toggleCelebrationSelection = (id: number) => {
    const newSelected = new Set(selectedForExport);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedForExport(newSelected);
  };

  const handleExportToPDF = async () => {
    const celebrationsToExport = sortedCelebrations.filter(c => 
      selectedForExport.has(c.id)
    );
    await exportSpecialCelebrationsToPDF(celebrationsToExport, readers);
  };

  const sortedCelebrations = [...celebrations].sort((a, b) => {
    const dateA = new Date(`${a.celebration_date}T${a.celebration_time}`);
    const dateB = new Date(`${b.celebration_date}T${b.celebration_time}`);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-indigo-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={onBack}
              className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Volver al panel"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-shrink-0 p-2 bg-orange-100 rounded-lg">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Celebraciones Especiales</h2>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Semana Santa, fiestas patronales y más</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={handleExportToPDF}
              disabled={selectedForExport.size === 0}
              className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base whitespace-nowrap"
              title={selectedForExport.size === 0 ? 'Selecciona al menos una celebración' : `Exportar ${selectedForExport.size} celebración(es) a PDF`}
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar a PDF</span>
              <span className="sm:hidden">Exportar</span>
              {selectedForExport.size > 0 && (
                <span className="bg-indigo-700 px-2 py-0.5 rounded-full text-xs">
                  {selectedForExport.size}
                </span>
              )}
            </button>
            <button
              onClick={handleNewCelebration}
              className="px-3 sm:px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva Celebración</span>
              <span className="sm:hidden">Nueva</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {sortedCelebrations.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-2">No hay celebraciones especiales programadas</p>
              <p className="text-sm text-gray-400">Haz clic en "Nueva Celebración" para crear una</p>
            </div>
          ) : (
            sortedCelebrations.map((celebration) => {
              const celebrationDate = new Date(celebration.celebration_date + 'T00:00:00');
              const formattedDate = formatSpanishDate(celebrationDate, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });

              return (
                <div
                  key={celebration.id}
                  className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={selectedForExport.has(celebration.id)}
                        onChange={() => toggleCelebrationSelection(celebration.id)}
                        className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                        title="Seleccionar para exportar"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{celebration.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <span>{formattedDate}</span>
                          <span>•</span>
                          <span>{formatTimeTo12Hour(celebration.celebration_time)}</span>
                        </div>
                        {celebration.description && (
                          <p className="text-gray-700 mb-4">{celebration.description}</p>
                        )}
                        
                        {celebration.roles && celebration.roles.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-sm font-medium text-gray-700">Proclamadores asignados:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {celebration.roles.map((role) => {
                                const reader = role.reader_id ? readers.find(r => r.id === role.reader_id) : null;
                                const displayName = reader ? reader.name : role.custom_reader_name || 'Sin asignar';
                                
                                return (
                                  <div key={role.id} className="flex items-center gap-2 text-sm">
                                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                                    <span className="text-gray-600">{role.role_name}:</span>
                                    <span className="font-medium text-gray-900">{displayName}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleAssignRoles(celebration)}
                          className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                          title="Asignar proclamadores"
                        >
                          <Users className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleEditCelebration(celebration)}
                          className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          title="Editar celebración"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCelebration(celebration)}
                          className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <SpecialCelebrationModal
        isOpen={isCelebrationModalOpen}
        onClose={() => setIsCelebrationModalOpen(false)}
        celebration={editingCelebration}
        onSave={onCreateCelebration}
        onUpdate={onUpdateCelebration}
      />

      <CelebrationRolesModal
        isOpen={isRolesModalOpen}
        onClose={() => setIsRolesModalOpen(false)}
        celebration={selectedCelebration}
        readers={readers}
        onSave={onUpdateRoles}
      />
    </div>
  );
}
