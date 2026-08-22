import { X, Plus, Edit, Trash2, Save, Mail, Phone, User as UserIcon, MapPin, Calendar, Clock } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import type { Reader } from '@/react-app/types';
import ReaderAvailabilityModal from './ReaderAvailabilityModal';

interface ReadersModalProps {
  isOpen: boolean;
  onClose: () => void;
  readers: Reader[];
  onSave: (reader: { name: string; email: string; phone: string; address: string; birth_date: string; is_active: number }) => void;
  onUpdate: (id: number, reader: { name: string; email: string; phone: string; address: string; birth_date: string; is_active: number }) => void;
  onDelete: (id: number) => void;
}

export default function ReadersModal({ isOpen, onClose, readers, onSave, onUpdate, onDelete }: ReadersModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '', birth_date: '', is_active: 1 });
  const [availabilityReader, setAvailabilityReader] = useState<Reader | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Sort readers alphabetically by name
  const sortedReaders = useMemo(() => {
    return [...readers].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [readers]);

  const handleStartNew = () => {
    setFormData({ name: '', email: '', phone: '', address: '', birth_date: '', is_active: 1 });
    setEditingId(null);
    setIsEditing(true);
  };

  const handleStartEdit = (reader: Reader) => {
    setFormData({ 
      name: reader.name, 
      email: reader.email, 
      phone: reader.phone,
      address: reader.address || '',
      birth_date: reader.birth_date || '',
      is_active: reader.is_active
    });
    setEditingId(reader.id);
    setIsEditing(true);
  };

  // Scroll to form when editing starts
  useEffect(() => {
    if (isEditing && formRef.current) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [isEditing]);

  const handleCancel = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ name: '', email: '', phone: '', address: '', birth_date: '', is_active: 1 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdate(editingId, formData);
    } else {
      onSave(formData);
    }
    handleCancel();
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Estás seguro de que deseas eliminar este proclamador?')) {
      onDelete(id);
      if (editingId === id) {
        handleCancel();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Gestionar Proclamadores</h2>
                <p className="text-purple-100 text-sm">Administra la lista de proclamadores de la parroquia</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Lista de Proclamadores</h3>
                <button
                  onClick={handleStartNew}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo
                </button>
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {sortedReaders.map((reader) => (
                  <div
                    key={reader.id}
                    className={`p-4 rounded-lg border transition-all ${
                      editingId === reader.id
                        ? 'border-purple-300 bg-purple-50'
                        : 'border-gray-200 bg-white hover:border-purple-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{reader.name}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                          <Mail className="w-3 h-3" />
                          <span>{reader.email}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                          <Phone className="w-3 h-3" />
                          <span>{reader.phone}</span>
                        </div>
                        {reader.address && (
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                            <MapPin className="w-3 h-3" />
                            <span>{reader.address}</span>
                          </div>
                        )}
                        {reader.birth_date && (
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                            <Calendar className="w-3 h-3" />
                            <span>{reader.birth_date.split('-').reverse().join('/')}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setAvailabilityReader(reader)}
                          className="p-2 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Disponibilidad"
                        >
                          <Clock className="w-4 h-4 text-emerald-600" />
                        </button>
                        <button
                          onClick={() => handleStartEdit(reader)}
                          className="p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4 text-indigo-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(reader.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {sortedReaders.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <UserIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hay proclamadores registrados</p>
                    <p className="text-sm">Haz clic en "Nuevo" para agregar uno</p>
                  </div>
                )}
              </div>
            </div>

            <div ref={formRef}>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {editingId ? 'Editar Proclamador' : isEditing ? 'Nuevo Proclamador' : 'Formulario'}
              </h3>
              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre Completo *
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="Ej: María González"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Correo Electrónico *
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="ejemplo@correo.com"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Teléfono *
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="555-0123"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Dirección
                        </label>
                        <input
                          type="text"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="Calle, número, colonia"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fecha de Nacimiento
                        </label>
                        <input
                          type="date"
                          value={formData.birth_date}
                          onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-300 cursor-pointer hover:border-purple-400 transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.is_active === 1}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                            className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-700">Proclamador activo</span>
                            <p className="text-xs text-gray-500">Marca si el proclamador está disponible para asignaciones</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6 pt-6 border-t border-purple-200">
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors font-medium"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-medium flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Save className="w-5 h-5" />
                        {editingId ? 'Actualizar' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
                  <UserIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 mb-4">Selecciona un proclamador para editar o haz clic en "Nuevo" para agregar uno</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ReaderAvailabilityModal
        isOpen={availabilityReader !== null}
        onClose={() => setAvailabilityReader(null)}
        reader={availabilityReader}
      />
    </div>
  );
}
