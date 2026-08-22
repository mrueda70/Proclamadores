import { ArrowLeft, Search, Calendar, Users as UsersIcon, Printer } from 'lucide-react';
import { useState } from 'react';
import type { Mass, Reader } from '@/react-app/types';
import { formatTimeTo12Hour } from '@/react-app/utils/timeFormat';
import { formatSpanishDate } from '@/react-app/utils/dateFormat';

interface ReaderParticipationProps {
  masses: Mass[];
  readers: Reader[];
  onBack: () => void;
}

interface ParticipationRow {
  mass: Mass;
  readers: {
    firstReader: Reader | string | null;
    secondReader: Reader | string | null;
    psalmReader: Reader | string | null;
  };
}

export default function ReaderParticipation({ masses, readers, onBack }: ReaderParticipationProps) {
  const [selectedReaderId, setSelectedReaderId] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [results, setResults] = useState<ParticipationRow[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    if (!selectedReaderId || !startDate || !endDate) {
      alert('Por favor completa todos los campos');
      return;
    }

    // Filter masses by date range and reader participation
    const filteredMasses = masses.filter(mass => {
      const massDate = mass.mass_date;
      const inDateRange = massDate >= startDate && massDate <= endDate;
      const hasReader = 
        mass.first_reader_id === selectedReaderId ||
        mass.second_reader_id === selectedReaderId ||
        mass.psalm_reader_id === selectedReaderId;
      
      return inDateRange && hasReader;
    });

    // Sort by date and time
    const sortedMasses = filteredMasses.sort((a, b) => {
      const dateCompare = a.mass_date.localeCompare(b.mass_date);
      if (dateCompare !== 0) return dateCompare;
      return a.mass_time.localeCompare(b.mass_time);
    });

    // Build participation rows with reader information
    const participationRows: ParticipationRow[] = sortedMasses.map(mass => ({
      mass,
      readers: {
        firstReader: mass.first_reader_custom || (mass.first_reader_id ? readers.find(r => r.id === mass.first_reader_id) || null : null),
        secondReader: mass.second_reader_custom || (mass.second_reader_id ? readers.find(r => r.id === mass.second_reader_id) || null : null),
        psalmReader: mass.psalm_reader_custom || (mass.psalm_reader_id ? readers.find(r => r.id === mass.psalm_reader_id) || null : null),
      }
    }));

    setResults(participationRows);
    setHasSearched(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedReader = selectedReaderId ? readers.find(r => r.id === selectedReaderId) : null;

  const renderReaderName = (reader: Reader | string | null, isSelected: boolean) => {
    if (!reader) return <span className="text-gray-400">Sin asignar</span>;
    
    const name = typeof reader === 'string' ? reader : reader.name;
    
    return (
      <span className={isSelected ? 'font-bold text-indigo-700' : 'text-gray-700'}>
        {name}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors print:hidden"
            title="Volver"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UsersIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Participación de Proclamadores</h1>
              <p className="text-gray-600">Consulta las eucaristías donde un proclamador ha participado</p>
            </div>
          </div>
        </div>
        {hasSearched && results.length > 0 && (
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 print:hidden"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
        )}
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proclamador
            </label>
            <select
              value={selectedReaderId}
              onChange={(e) => setSelectedReaderId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecciona un proclamador</option>
              {readers.sort((a, b) => a.name.localeCompare(b.name, 'es')).map(reader => (
                <option key={reader.id} value={reader.id}>
                  {reader.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Desde
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          onClick={handleSearch}
          className="mt-4 w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Search className="w-4 h-4" />
          <span>Buscar Participación</span>
        </button>
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {results.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-2">No se encontraron resultados</p>
              <p className="text-sm text-gray-400">
                {selectedReader?.name} no tiene asignaciones en el rango de fechas seleccionado
              </p>
            </div>
          ) : (
            <>
              <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 print:bg-white">
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-semibold">{results.length}</span> eucaristía(s) donde{' '}
                  <span className="font-bold text-indigo-700">{selectedReader?.name}</span> ha participado
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b-2 border-gray-200">
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Fecha</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Hora</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Primera Lectura</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Salmo</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Segunda Lectura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, index) => {
                      const { mass, readers: massReaders } = row;
                      const dateObj = new Date(mass.mass_date + 'T00:00:00');
                      const formattedDate = formatSpanishDate(dateObj, {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      });

                      return (
                        <tr
                          key={mass.id}
                          className={`border-b border-gray-100 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                            {formattedDate}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {formatTimeTo12Hour(mass.mass_time)}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {renderReaderName(massReaders.firstReader, mass.first_reader_id === selectedReaderId)}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {renderReaderName(massReaders.psalmReader, mass.psalm_reader_id === selectedReaderId)}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {mass.has_second_reading === 1 
                              ? renderReaderName(massReaders.secondReader, mass.second_reader_id === selectedReaderId)
                              : <span className="text-gray-400">N/A</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Print instructions */}
      {hasSearched && results.length > 0 && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg print:hidden">
          <p className="text-sm text-amber-800">
            <strong>Nota:</strong> Para imprimir sin el pie de página del navegador, asegúrate de desactivar la opción 
            "Encabezados y pies de página" en el diálogo de impresión de tu navegador.
          </p>
        </div>
      )}
    </div>
  );
}
