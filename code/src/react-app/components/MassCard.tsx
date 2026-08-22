import { Clock, Edit, Trash2, UserCheck, MessageSquare } from 'lucide-react';
import type { Mass, Reader } from '@/react-app/types';
import { formatTimeTo12Hour } from '@/react-app/utils/timeFormat';

interface MassCardProps {
  mass: Mass;
  readers: Reader[];
  onEdit: () => void;
  onEditMass: () => void;
  onDelete: () => void;
}

export default function MassCard({ mass, readers, onEdit, onEditMass, onDelete }: MassCardProps) {
  const getReaderName = (id: number | null, customName: string | null) => {
    if (customName) return customName;
    if (!id) return null;
    return readers.find((r) => r.id === id)?.name || 'Desconocido';
  };

  const firstReader = getReaderName(mass.first_reader_id, mass.first_reader_custom);
  const secondReader = getReaderName(mass.second_reader_id, mass.second_reader_custom);
  const psalmReader = getReaderName(mass.psalm_reader_id, mass.psalm_reader_custom);
  const commentatorReader = getReaderName(mass.commentator_reader_id, mass.commentator_reader_custom);

  const hasSecondReading = mass.has_second_reading === 1;
  const hasCommentator = mass.has_commentator === 1;
  const hasNotes = mass.notes && mass.notes.trim().length > 0;

  return (
    <div className="bg-gradient-to-br from-white to-indigo-50 rounded-lg p-4 border border-indigo-200 shadow-sm hover:shadow-md transition-all group">
      {/* Desktop Layout */}
      <div className="hidden md:flex items-center gap-4">
        {/* Time and Comments */}
        <div className="flex items-center gap-3 min-w-[180px]">
          <div className="p-1.5 bg-indigo-100 rounded-lg">
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 text-sm">{formatTimeTo12Hour(mass.mass_time)}</p>
            {hasNotes ? (
              <div className="flex items-center gap-1 mt-0.5">
                <MessageSquare className="w-3 h-3 text-blue-600" />
                <p className="text-xs text-blue-700 font-medium truncate" title={mass.notes || ''}>
                  {mass.notes}
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic mt-0.5">Sin notas</p>
            )}
          </div>
        </div>

        {/* Reading Assignments */}
        <div className={`flex-1 grid gap-3 ${hasSecondReading && hasCommentator ? 'grid-cols-4' : hasSecondReading || hasCommentator ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div className="bg-white rounded-lg p-2.5 border border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-1.5">Primera Lectura</p>
            <p className="text-sm font-semibold text-indigo-700">
              {firstReader || <span className="text-gray-400 italic text-xs">Sin asignar</span>}
            </p>
          </div>

          <div className="bg-white rounded-lg p-2.5 border border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-1.5">Salmo Responsorial</p>
            <p className="text-sm font-semibold text-purple-700">
              {psalmReader || <span className="text-gray-400 italic text-xs">Sin asignar</span>}
            </p>
          </div>

          {hasSecondReading && (
            <div className="bg-white rounded-lg p-2.5 border border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1.5">Segunda Lectura</p>
              <p className="text-sm font-semibold text-indigo-700">
                {secondReader || <span className="text-gray-400 italic text-xs">Sin asignar</span>}
              </p>
            </div>
          )}

          {hasCommentator && (
            <div className="bg-white rounded-lg p-2.5 border border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1.5">Comentarista</p>
              <p className="text-sm font-semibold text-green-700">
                {commentatorReader || <span className="text-gray-400 italic text-xs">Sin asignar</span>}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
          <button
            onClick={onEdit}
            className="p-2 hover:bg-indigo-100 rounded-lg transition-colors"
            title="Asignar lectores"
          >
            <UserCheck className="w-4 h-4 text-indigo-600" />
          </button>
          <button
            onClick={onEditMass}
            className="p-2 hover:bg-indigo-100 rounded-lg transition-colors"
            title="Editar misa"
          >
            <Edit className="w-4 h-4 text-indigo-600" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
            title="Eliminar misa"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Time and Actions Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 rounded-lg">
              <Clock className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="font-bold text-gray-900 text-lg">{formatTimeTo12Hour(mass.mass_time)}</p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="p-2 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors"
              title="Asignar lectores"
            >
              <UserCheck className="w-4 h-4 text-indigo-600" />
            </button>
            <button
              onClick={onEditMass}
              className="p-2 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors"
              title="Editar misa"
            >
              <Edit className="w-4 h-4 text-indigo-600" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
              title="Eliminar misa"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        </div>

        {/* Notes */}
        {hasNotes && (
          <div className="flex items-start gap-2 mb-3 p-2 bg-blue-50 rounded-lg">
            <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-700 font-medium">{mass.notes}</p>
          </div>
        )}

        {/* Reading Assignments - Stacked Vertically */}
        <div className="space-y-2">
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-1">Primera Lectura</p>
            <p className="text-sm font-semibold text-indigo-700">
              {firstReader || <span className="text-gray-400 italic text-xs">Sin asignar</span>}
            </p>
          </div>

          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-1">Salmo Responsorial</p>
            <p className="text-sm font-semibold text-purple-700">
              {psalmReader || <span className="text-gray-400 italic text-xs">Sin asignar</span>}
            </p>
          </div>

          {hasSecondReading && (
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">Segunda Lectura</p>
              <p className="text-sm font-semibold text-indigo-700">
                {secondReader || <span className="text-gray-400 italic text-xs">Sin asignar</span>}
              </p>
            </div>
          )}

          {hasCommentator && (
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">Comentarista</p>
              <p className="text-sm font-semibold text-green-700">
                {commentatorReader || <span className="text-gray-400 italic text-xs">Sin asignar</span>}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
