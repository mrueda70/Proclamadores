import { X, Save, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Mass, Reader } from '@/react-app/types';
import { formatTimeTo12Hour } from '@/react-app/utils/timeFormat';
import { formatSpanishDate } from '@/react-app/utils/dateFormat';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  mass: Mass | null;
  readers: Reader[];
  onSave: (
    massId: number,
    assignments: {
      first_reader_id?: number | null;
      second_reader_id?: number | null;
      psalm_reader_id?: number | null;
      commentator_reader_id?: number | null;
      first_reader_custom?: string | null;
      second_reader_custom?: string | null;
      psalm_reader_custom?: string | null;
      commentator_reader_custom?: string | null;
    }
  ) => void;
}

export default function AssignmentModal({ isOpen, onClose, mass, readers, onSave }: AssignmentModalProps) {
  const [firstReaderId, setFirstReaderId] = useState<number | null>(null);
  const [secondReaderId, setSecondReaderId] = useState<number | null>(null);
  const [psalmReaderId, setPsalmReaderId] = useState<number | null>(null);
  const [commentatorReaderId, setCommentatorReaderId] = useState<number | null>(null);
  
  const [firstReaderCustom, setFirstReaderCustom] = useState<string>('');
  const [secondReaderCustom, setSecondReaderCustom] = useState<string>('');
  const [psalmReaderCustom, setPsalmReaderCustom] = useState<string>('');
  const [commentatorReaderCustom, setCommentatorReaderCustom] = useState<string>('');

  const [showFirstCustom, setShowFirstCustom] = useState(false);
  const [showSecondCustom, setShowSecondCustom] = useState(false);
  const [showPsalmCustom, setShowPsalmCustom] = useState(false);
  const [showCommentatorCustom, setShowCommentatorCustom] = useState(false);

  useEffect(() => {
    if (mass) {
      setFirstReaderId(mass.first_reader_id);
      setSecondReaderId(mass.second_reader_id);
      setPsalmReaderId(mass.psalm_reader_id);
      setCommentatorReaderId(mass.commentator_reader_id);
      
      setFirstReaderCustom(mass.first_reader_custom || '');
      setSecondReaderCustom(mass.second_reader_custom || '');
      setPsalmReaderCustom(mass.psalm_reader_custom || '');
      setCommentatorReaderCustom(mass.commentator_reader_custom || '');
      
      setShowFirstCustom(!!mass.first_reader_custom && !mass.first_reader_id);
      setShowSecondCustom(!!mass.second_reader_custom && !mass.second_reader_id);
      setShowPsalmCustom(!!mass.psalm_reader_custom && !mass.psalm_reader_id);
      setShowCommentatorCustom(!!mass.commentator_reader_custom && !mass.commentator_reader_id);
    }
  }, [mass]);

  if (!isOpen || !mass) return null;

  const handleSave = () => {
    onSave(mass.id, {
      first_reader_id: showFirstCustom ? null : firstReaderId,
      second_reader_id: showSecondCustom ? null : secondReaderId,
      psalm_reader_id: showPsalmCustom ? null : psalmReaderId,
      commentator_reader_id: showCommentatorCustom ? null : commentatorReaderId,
      first_reader_custom: showFirstCustom && firstReaderCustom ? firstReaderCustom : null,
      second_reader_custom: showSecondCustom && secondReaderCustom ? secondReaderCustom : null,
      psalm_reader_custom: showPsalmCustom && psalmReaderCustom ? psalmReaderCustom : null,
      commentator_reader_custom: showCommentatorCustom && commentatorReaderCustom ? commentatorReaderCustom : null,
    });
    onClose();
  };

  const dateObj = new Date(mass.mass_date + 'T00:00:00');
  const formattedDate = formatSpanishDate(dateObj, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const hasSecondReading = mass.has_second_reading === 1;
  const hasCommentator = mass.has_commentator === 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Asignar Proclamadores</h2>
              <p className="text-indigo-100 mt-1">{formattedDate} - {formatTimeTo12Hour(mass.mass_time)}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-indigo-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Lecturas del Día</h3>
            <div className="space-y-1 text-sm text-gray-600">
              {mass.first_reading && <p>• Primera: {mass.first_reading}</p>}
              {mass.psalm && <p>• Salmo: {mass.psalm}</p>}
              {hasSecondReading && mass.second_reading && <p>• Segunda: {mass.second_reading}</p>}
              {mass.gospel && <p>• Evangelio: {mass.gospel}</p>}
            </div>
          </div>

          <div className="space-y-5">
            {/* Primera Lectura */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Primera Lectura
                </label>
                {!showFirstCustom && (
                  <button
                    onClick={() => {
                      setShowFirstCustom(true);
                      setFirstReaderId(null);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Digitar nombre
                  </button>
                )}
              </div>
              
              {showFirstCustom ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={firstReaderCustom}
                    onChange={(e) => setFirstReaderCustom(e.target.value)}
                    placeholder="Nombre del lector"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                  <button
                    onClick={() => {
                      setShowFirstCustom(false);
                      setFirstReaderCustom('');
                    }}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <select
                  value={firstReaderId || ''}
                  onChange={(e) => setFirstReaderId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                >
                  <option value="">Sin asignar</option>
                  {readers.map((reader) => (
                    <option key={reader.id} value={reader.id}>
                      {reader.name}
                    </option>
                  ))}
                </select>
              )}
              {mass.first_reading && (
                <p className="text-xs text-gray-500 mt-1">{mass.first_reading}</p>
              )}
            </div>

            {/* Salmo Responsorial */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Salmo Responsorial
                </label>
                {!showPsalmCustom && (
                  <button
                    onClick={() => {
                      setShowPsalmCustom(true);
                      setPsalmReaderId(null);
                    }}
                    className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Digitar nombre
                  </button>
                )}
              </div>
              
              {showPsalmCustom ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={psalmReaderCustom}
                    onChange={(e) => setPsalmReaderCustom(e.target.value)}
                    placeholder="Nombre del lector"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  />
                  <button
                    onClick={() => {
                      setShowPsalmCustom(false);
                      setPsalmReaderCustom('');
                    }}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <select
                  value={psalmReaderId || ''}
                  onChange={(e) => setPsalmReaderId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                >
                  <option value="">Sin asignar</option>
                  {readers.map((reader) => (
                    <option key={reader.id} value={reader.id}>
                      {reader.name}
                    </option>
                  ))}
                </select>
              )}
              {mass.psalm && (
                <p className="text-xs text-gray-500 mt-1">{mass.psalm}</p>
              )}
            </div>

            {/* Segunda Lectura */}
            {hasSecondReading && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Segunda Lectura
                  </label>
                  {!showSecondCustom && (
                    <button
                      onClick={() => {
                        setShowSecondCustom(true);
                        setSecondReaderId(null);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Digitar nombre
                    </button>
                  )}
                </div>
                
                {showSecondCustom ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={secondReaderCustom}
                      onChange={(e) => setSecondReaderCustom(e.target.value)}
                      placeholder="Nombre del lector"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                    <button
                      onClick={() => {
                        setShowSecondCustom(false);
                        setSecondReaderCustom('');
                      }}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <select
                    value={secondReaderId || ''}
                    onChange={(e) => setSecondReaderId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  >
                    <option value="">Sin asignar</option>
                    {readers.map((reader) => (
                      <option key={reader.id} value={reader.id}>
                        {reader.name}
                      </option>
                    ))}
                  </select>
                )}
                {mass.second_reading && (
                  <p className="text-xs text-gray-500 mt-1">{mass.second_reading}</p>
                )}
              </div>
            )}

            {/* Comentarista */}
            {hasCommentator && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Comentarista
                  </label>
                  {!showCommentatorCustom && (
                    <button
                      onClick={() => {
                        setShowCommentatorCustom(true);
                        setCommentatorReaderId(null);
                      }}
                      className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Digitar nombre
                    </button>
                  )}
                </div>
                
                {showCommentatorCustom ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={commentatorReaderCustom}
                      onChange={(e) => setCommentatorReaderCustom(e.target.value)}
                      placeholder="Nombre del comentarista"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    />
                    <button
                      onClick={() => {
                        setShowCommentatorCustom(false);
                        setCommentatorReaderCustom('');
                      }}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <select
                    value={commentatorReaderId || ''}
                    onChange={(e) => setCommentatorReaderId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  >
                    <option value="">Sin asignar</option>
                    {readers.map((reader) => (
                      <option key={reader.id} value={reader.id}>
                        {reader.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium flex items-center justify-center gap-2 shadow-lg"
            >
              <Save className="w-5 h-5" />
              Guardar Asignación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
