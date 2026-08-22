import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { SpecialCelebration, Reader } from '@/react-app/types';

interface CelebrationRole {
  role_name: string;
  reader_id: number | null;
  custom_reader_name: string | null;
  role_order: number;
}

interface CelebrationRolesModalProps {
  isOpen: boolean;
  onClose: () => void;
  celebration: SpecialCelebration | null;
  readers: Reader[];
  onSave: (celebrationId: number, roles: CelebrationRole[]) => Promise<void>;
}

const DEFAULT_ROLES = [
  'Primera Lectura',
  'Salmo',
  'Segunda Lectura',
  'Oración de los Fieles',
  'Ofrendas',
  'Comentarista',
];

export default function CelebrationRolesModal({ isOpen, onClose, celebration, readers, onSave }: CelebrationRolesModalProps) {
  const [roles, setRoles] = useState<CelebrationRole[]>([]);

  useEffect(() => {
    if (celebration?.roles && celebration.roles.length > 0) {
      setRoles(celebration.roles.map(r => ({
        role_name: r.role_name,
        reader_id: r.reader_id,
        custom_reader_name: r.custom_reader_name,
        role_order: r.role_order,
      })));
    } else {
      setRoles([]);
    }
  }, [celebration]);

  const addRole = (roleName: string = '') => {
    setRoles([...roles, {
      role_name: roleName,
      reader_id: null,
      custom_reader_name: null,
      role_order: roles.length,
    }]);
  };

  const removeRole = (index: number) => {
    setRoles(roles.filter((_, i) => i !== index));
  };

  const updateRole = (index: number, field: keyof CelebrationRole, value: any) => {
    const updatedRoles = [...roles];
    updatedRoles[index] = { ...updatedRoles[index], [field]: value };
    setRoles(updatedRoles);
  };

  const updateMultipleFields = (index: number, updates: Partial<CelebrationRole>) => {
    const updatedRoles = [...roles];
    updatedRoles[index] = { ...updatedRoles[index], ...updates };
    setRoles(updatedRoles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!celebration) return;
    
    await onSave(celebration.id, roles);
    onClose();
  };

  if (!isOpen || !celebration) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Asignar Proclamadores</h2>
            <p className="text-gray-600 mt-1">{celebration.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {roles.map((role, index) => (
            <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 rounded-lg">
              <div className="flex-1 space-y-3">
                <input
                  type="text"
                  value={role.role_name}
                  onChange={(e) => updateRole(index, 'role_name', e.target.value)}
                  placeholder="Nombre del rol"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <select
                  value={role.reader_id || (role.custom_reader_name !== null ? 'custom' : '')}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'custom') {
                      updateMultipleFields(index, {
                        reader_id: null,
                        custom_reader_name: '',
                      });
                    } else if (value) {
                      updateMultipleFields(index, {
                        reader_id: Number(value),
                        custom_reader_name: null,
                      });
                    } else {
                      updateMultipleFields(index, {
                        reader_id: null,
                        custom_reader_name: null,
                      });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Sin asignar</option>
                  {readers.filter(r => r.is_active === 1).map((reader) => (
                    <option key={reader.id} value={reader.id}>
                      {reader.name}
                    </option>
                  ))}
                  <option value="custom">Nombre personalizado...</option>
                </select>
                {role.reader_id === null && role.custom_reader_name !== null && (
                  <input
                    type="text"
                    value={role.custom_reader_name || ''}
                    onChange={(e) => updateRole(index, 'custom_reader_name', e.target.value)}
                    placeholder="Nombre del proclamador"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => removeRole(index)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            {DEFAULT_ROLES.map((roleName) => (
              <button
                key={roleName}
                type="button"
                onClick={() => addRole(roleName)}
                className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                + {roleName}
              </button>
            ))}
            <button
              type="button"
              onClick={() => addRole()}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Rol personalizado
            </button>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Guardar Asignaciones
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
