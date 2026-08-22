import { ArrowLeft, FileText, Printer, Settings } from 'lucide-react';
import { useState } from 'react';
import type { Reader } from '@/react-app/types';
import { formatSpanishDate } from '@/react-app/utils/dateFormat';

interface ReadersReportProps {
  readers: Reader[];
  onBack: () => void;
}

interface ColumnConfig {
  name: { label: string; enabled: boolean };
  email: { label: string; enabled: boolean };
  phone: { label: string; enabled: boolean };
  address: { label: string; enabled: boolean };
  birth_date: { label: string; enabled: boolean };
}

export default function ReadersReport({ readers, onBack }: ReadersReportProps) {
  const [showConfig, setShowConfig] = useState(true);
  const [columns, setColumns] = useState<ColumnConfig>({
    name: { label: 'Nombre', enabled: true },
    email: { label: 'Correo Electrónico', enabled: true },
    phone: { label: 'Teléfono', enabled: true },
    address: { label: 'Dirección', enabled: false },
    birth_date: { label: 'Fecha de Nacimiento', enabled: false },
  });

  // Sort readers alphabetically by name
  const sortedReaders = [...readers].sort((a, b) => 
    a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
  );

  const handlePrint = () => {
    window.print();
  };

  const toggleColumn = (key: keyof ColumnConfig) => {
    setColumns(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled }
    }));
  };

  const generateReport = () => {
    setShowConfig(false);
  };

  const enabledColumns = Object.entries(columns).filter(([_, config]) => config.enabled);
  const hasAtLeastOneColumn = enabledColumns.length > 0;

  if (showConfig) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Volver"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Settings className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Configurar Reporte de Proclamadores</h1>
              <p className="text-gray-600">Selecciona las columnas que deseas incluir en el reporte</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Columnas disponibles</h3>
          
          <div className="space-y-4">
            {Object.entries(columns).map(([key, config]) => (
              <label
                key={key}
                className="flex items-center gap-3 p-4 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={() => toggleColumn(key as keyof ColumnConfig)}
                  className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-900">{config.label}</span>
              </label>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {enabledColumns.length === 0 
                ? 'Selecciona al menos una columna para continuar'
                : `${enabledColumns.length} columna${enabledColumns.length !== 1 ? 's' : ''} seleccionada${enabledColumns.length !== 1 ? 's' : ''}`
              }
            </p>
            <button
              onClick={generateReport}
              disabled={!hasAtLeastOneColumn}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />
              <span>Generar Reporte</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:px-0 print:py-0">
      <div className="mb-8 print:mb-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowConfig(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors print:hidden"
            title="Configurar columnas"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg print:hidden">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <div className="print:mb-1">
              <h1 className="text-3xl print:text-xl font-bold text-gray-900 print:mb-1">
                Reporte de Proclamadores
                <span className="hidden print:inline"> (PARROQUIA EL DIVINO NIÑO)</span>
              </h1>
              <p className="text-gray-600 print:text-xs print:hidden">Lista alfabética de todos los proclamadores registrados</p>
            </div>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 print:hidden"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden print:rounded-none print:shadow-none print:border-t-2 print:border-gray-300">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-200">
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 w-16">#</th>
                {columns.name.enabled && (
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Nombre</th>
                )}
                {columns.email.enabled && (
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Correo Electrónico</th>
                )}
                {columns.phone.enabled && (
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Teléfono</th>
                )}
                {columns.address.enabled && (
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Dirección</th>
                )}
                {columns.birth_date.enabled && (
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Fecha de Nacimiento</th>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedReaders.length === 0 ? (
                <tr>
                  <td colSpan={enabledColumns.length + 1} className="px-6 py-12 text-center text-gray-500">
                    No hay proclamadores registrados
                  </td>
                </tr>
              ) : (
                sortedReaders.map((reader, index) => (
                  <tr
                    key={reader.id}
                    className={`border-b border-gray-100 hover:bg-green-50/50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-600">
                      {index + 1}
                    </td>
                    {columns.name.enabled && (
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {reader.name}
                      </td>
                    )}
                    {columns.email.enabled && (
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {reader.email}
                      </td>
                    )}
                    {columns.phone.enabled && (
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {reader.phone}
                      </td>
                    )}
                    {columns.address.enabled && (
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {reader.address || '—'}
                      </td>
                    )}
                    {columns.birth_date.enabled && (
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {reader.birth_date 
                          ? formatSpanishDate(new Date(reader.birth_date + 'T00:00:00'), {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })
                          : '—'
                        }
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {sortedReaders.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Total de proclamadores: <span className="font-semibold text-gray-900">{sortedReaders.length}</span>
            </p>
          </div>
        )}
      </div>
      
      {/* Print instructions */}
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg print:hidden">
        <p className="text-sm text-amber-800">
          <strong>Nota:</strong> Para imprimir sin el pie de página del navegador, asegúrate de desactivar la opción 
          "Encabezados y pies de página" en el diálogo de impresión de tu navegador.
        </p>
      </div>
    </div>
  );
}
