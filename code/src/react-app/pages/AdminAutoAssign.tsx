import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Wand2, Check, AlertCircle, Users, Calendar, Clock } from 'lucide-react';
import { useAutoAssign, Assignment } from '@/react-app/hooks/useAutoAssign';
import { getWeekStart, getWeekEnd, toDateString } from '@/react-app/utils/weekHelpers';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const dayName = DAY_NAMES[date.getDay()];
  const day = date.getDate();
  const month = date.toLocaleDateString('es-ES', { month: 'long' });
  return `${dayName} ${day} de ${month}`;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour12}:${minutes} ${period}`;
}

function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const hasAssignments = assignment.proposed_names.first_reader || 
                         assignment.proposed_names.second_reader || 
                         assignment.proposed_names.psalm_reader ||
                         assignment.proposed_names.commentator;

  return (
    <div className={`rounded-xl p-4 border ${hasAssignments ? 'bg-white border-gray-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="w-4 h-4" />
          <span className="font-medium">{formatDate(assignment.mass_date)}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <Clock className="w-4 h-4" />
          <span>{formatTime(assignment.mass_time)}</span>
        </div>
        {assignment.mass_type && (
          <span className="text-sm text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
            {assignment.mass_type}
          </span>
        )}
      </div>
      
      {hasAssignments ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {assignment.proposed_names.first_reader && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 w-24">1ra Lectura:</span>
              <span className="font-medium text-gray-900">{assignment.proposed_names.first_reader}</span>
            </div>
          )}
          {assignment.proposed_names.second_reader && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 w-24">2da Lectura:</span>
              <span className="font-medium text-gray-900">{assignment.proposed_names.second_reader}</span>
            </div>
          )}
          {assignment.proposed_names.psalm_reader && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 w-24">Salmo:</span>
              <span className="font-medium text-gray-900">{assignment.proposed_names.psalm_reader}</span>
            </div>
          )}
          {assignment.proposed_names.commentator && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 w-24">Comentador:</span>
              <span className="font-medium text-gray-900">{assignment.proposed_names.commentator}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-amber-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>No hay proclamadores disponibles para esta misa</span>
        </div>
      )}
    </div>
  );
}

export default function AdminAutoAssign() {
  const navigate = useNavigate();
  const { loading, error, result, generateAssignments, applyAssignments, clearResult } = useAutoAssign();
  
  // Default to current week
  const startOfWeek = getWeekStart(new Date());
  const endOfWeek = getWeekEnd(startOfWeek);

  const [startDate, setStartDate] = useState(toDateString(startOfWeek));
  const [endDate, setEndDate] = useState(toDateString(endOfWeek));
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const handlePreview = async () => {
    setApplied(false);
    await generateAssignments(startDate, endDate, true);
  };

  const handleApply = async () => {
    if (!window.confirm('¿Estás seguro de aplicar estas asignaciones? Esto reemplazará las asignaciones actuales.')) {
      return;
    }
    
    setApplying(true);
    const result = await applyAssignments(startDate, endDate);
    setApplying(false);
    
    if (result?.success) {
      setApplied(true);
    }
  };

  const handleReset = () => {
    clearResult();
    setApplied(false);
  };

  // Count stats
  const totalAssigned = result?.assignments.filter(a => 
    a.proposed_names.first_reader || a.proposed_names.psalm_reader
  ).length || 0;
  
  const totalMissing = result?.assignments.filter(a => 
    !a.proposed_names.first_reader && !a.proposed_names.psalm_reader
  ).length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Volver"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Wand2 className="w-8 h-8 text-purple-600" />
              Asignación Automática
            </h1>
            <p className="text-gray-600 mt-1">
              Genera asignaciones de proclamadores basadas en su disponibilidad
            </p>
          </div>
        </div>

        {/* Date Range Selection */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Seleccionar Rango de Fechas
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  handleReset();
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  handleReset();
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={handlePreview}
            disabled={loading || !startDate || !endDate}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Wand2 className={`w-5 h-5 ${loading ? 'animate-pulse' : ''}`} />
            {loading ? 'Generando...' : 'Generar Vista Previa'}
          </button>

          <p className="mt-4 text-sm text-gray-600">
            El algoritmo asigna proclamadores dando prioridad a quienes hayan participado menos recientemente.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Misas con asignaciones</p>
                    <p className="text-2xl font-bold text-green-600">{totalAssigned}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sin proclamadores</p>
                    <p className="text-2xl font-bold text-amber-600">{totalMissing}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Apply Button */}
            {result.preview && !applied && (
              <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
                <button
                  onClick={handleApply}
                  disabled={applying || totalAssigned === 0}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <Check className="w-5 h-5" />
                  {applying ? 'Aplicando...' : 'Aplicar Asignaciones'}
                </button>
                <p className="mt-2 text-sm text-gray-600 text-center">
                  Esto reemplazará las asignaciones actuales en las misas seleccionadas
                </p>
              </div>
            )}

            {/* Applied Success */}
            {applied && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-green-700 font-medium">
                  ¡Asignaciones aplicadas correctamente! Puedes verlas en el horario de misas.
                </p>
              </div>
            )}

            {/* Assignments List */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {result.preview ? 'Vista Previa de Asignaciones' : 'Asignaciones Aplicadas'}
              </h2>
              
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {result.assignments.map((assignment) => (
                  <AssignmentCard key={assignment.mass_id} assignment={assignment} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
