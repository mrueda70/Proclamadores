import { ArrowLeft, Printer, Loader2, RefreshCw } from 'lucide-react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { useEffect, useState } from 'react';
import { decodeHTMLEntities } from '@/react-app/utils/htmlDecode';
import { formatSpanishDate } from '@/react-app/utils/dateFormat';
import { useAuth } from '@/react-app/contexts/AuthContext';
import { getWeekStart } from '@/react-app/utils/weekHelpers';

function PsalmText({ text }: { text: string }) {
  const decodedText = decodeHTMLEntities(text);
  if (!decodedText) return null;
  
  // Split into lines
  const allLines = decodedText.split('\n').filter(line => line.trim() !== '');
  
  // Find where response ends
  // Response: starts with R/. and continues with lines that start with lowercase (continuations)
  // Verse starts when we hit a line that starts with uppercase (new sentence)
  let responseEndIndex = -1;
  
  if (allLines.length > 0) {
    const firstLine = allLines[0].trim();
    if (firstLine.startsWith('R./') || firstLine.startsWith('R/.')) {
      responseEndIndex = 0;
      // Check subsequent lines - they're part of response if they start with lowercase
      for (let j = 1; j < allLines.length; j++) {
        const nextLine = allLines[j].trim();
        const firstChar = nextLine.charAt(0);
        // If line starts with lowercase letter, it's a continuation of the response
        if (firstChar === firstChar.toLowerCase() && firstChar !== firstChar.toUpperCase()) {
          responseEndIndex = j;
        } else {
          // Line starts with uppercase or special char - this is the start of verses
          break;
        }
      }
    }
  }
  
  // Build response lines
  const responseLines = allLines.slice(0, responseEndIndex + 1);
  const verseLines = allLines.slice(responseEndIndex + 1);
  
  // Group verse lines into verses (each verse ends with R/. or R/)
  const verses: string[][] = [];
  let currentVerse: string[] = [];
  
  verseLines.forEach(line => {
    let displayLine = line.trim();
    // Remove V/. prefix if present
    if (displayLine.startsWith('V/.')) {
      displayLine = displayLine.slice(3).trim();
    }
    currentVerse.push(displayLine);
    
    // Check if this line ends a verse
    if (displayLine.endsWith('R./') || displayLine.endsWith('R/.') || displayLine.endsWith(' R/')) {
      verses.push([...currentVerse]);
      currentVerse = [];
    }
  });
  
  // Add any remaining lines as a verse
  if (currentVerse.length > 0) {
    verses.push(currentVerse);
  }
  
  return (
    <div>
      {/* Response in bold */}
      {responseLines.length > 0 && (
        <div className="mb-4">
          {responseLines.map((line, idx) => (
            <p key={`r-${idx}`} className="text-gray-800 font-bold leading-relaxed">
              {line.trim()}
            </p>
          ))}
        </div>
      )}
      
      {/* Verses with spacing between them */}
      {verses.map((verse, vIndex) => (
        <div key={`v-${vIndex}`} className="mb-4">
          {verse.map((line, lIndex) => {
            const isLastLine = lIndex === verse.length - 1;
            
            // Check if line ends with R./ or R/. or R/
            if (isLastLine && (line.endsWith('R./') || line.endsWith('R/.'))) {
              const textPart = line.slice(0, -3).trim();
              const marker = line.endsWith('R./') ? 'R./' : 'R/.';
              return (
                <p key={lIndex} className="text-gray-800 leading-relaxed">
                  {textPart} <span className="font-bold">{marker}</span>
                </p>
              );
            }
            
            if (isLastLine && line.endsWith(' R/')) {
              const textPart = line.slice(0, -3).trim();
              return (
                <p key={lIndex} className="text-gray-800 leading-relaxed">
                  {textPart} <span className="font-bold">R/</span>
                </p>
              );
            }
            
            return (
              <p key={lIndex} className="text-gray-800 leading-relaxed">
                {line}
              </p>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ReadingText({ text }: { text: string }) {
  const decodedText = decodeHTMLEntities(text);
  if (!decodedText) return null;
  const lines = decodedText.split('\n').filter(line => line.trim() !== '');
  
  return (
    <div>
      {lines.map((line, index) => (
        <p key={index} className="text-gray-800 leading-tight">
          {line.trim()}
        </p>
      ))}
    </div>
  );
}

interface ReadingData {
  first_reading: string | null;
  psalm: string | null;
  second_reading: string | null;
  gospel: string | null;
  mass_type: string | null;
  liturgical_day: string | null;
  first_reading_text: string | null;
  psalm_text: string | null;
  second_reading_text: string | null;
  gospel_text: string | null;
}

export default function DailyReadings() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuth();
  const [readings, setReadings] = useState<ReadingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Get the week from navigation state
  const week = (location.state as { week?: 'current' | 'next' })?.week || 'current';

  useEffect(() => {
    if (!date) return;

    // Check if user role can access this date (current and next week only for users)
    if (role === 'user') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const requestedDate = new Date(date + 'T00:00:00');
      
      const weekStart = getWeekStart(today);
      const twoWeeksEnd = new Date(weekStart);
      twoWeeksEnd.setDate(twoWeeksEnd.getDate() + 13); // End of next week
      twoWeeksEnd.setHours(23, 59, 59, 999);
      
      if (requestedDate < weekStart || requestedDate > twoWeeksEnd) {
        setError('Solo puedes ver las lecturas de la semana actual y la siguiente');
        setLoading(false);
        return;
      }
    }

    const fetchReadings = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/readings/${date}`);
        if (!response.ok) {
          throw new Error('No se pudieron cargar las lecturas');
        }
        const data = await response.json();
        
        // Check if response indicates an error (service temporarily unavailable)
        if (data.error && !data.readings?.first_reading) {
          setError(data.error);
          return;
        }
        
        setReadings(data.readings);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error de conexión. Intente de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchReadings();
  }, [date]);

  const handlePrint = () => {
    window.print();
  };

  const handleRefresh = async () => {
    if (!date) return;
    
    try {
      setRefreshing(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/readings/${date}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Show the server's error message if available
        const errorMsg = data?.message || 'No se pudieron actualizar las lecturas';
        throw new Error(errorMsg);
      }
      
      setReadings(data.readings);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar lecturas');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <span className="text-gray-600">Cargando lecturas...</span>
        </div>
      </div>
    );
  }

  if (error || !readings) {
    const handleRetry = () => {
      setError(null);
      setLoading(true);
      fetch(`/api/readings/${date}`)
        .then(res => res.json())
        .then(data => {
          if (data.error && !data.readings?.first_reading) {
            setError(data.error);
          } else {
            setReadings(data.readings);
            setError(null);
          }
        })
        .catch(() => setError('Error de conexión. Intente de nuevo más tarde.'))
        .finally(() => setLoading(false));
    };
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate('/weekly-readings', { state: { week } })}
            className="mb-6 p-2 hover:bg-gray-100 rounded-lg transition-colors print:hidden"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="bg-white rounded-xl p-8 shadow-md border border-red-200">
            <p className="text-red-600 text-center mb-4">{error || 'No se encontraron lecturas para esta fecha'}</p>
            <div className="flex justify-center">
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const dateObj = new Date(date + 'T00:00:00');
  const formattedDate = formatSpanishDate(dateObj, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 print:bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:py-4">
        {/* Header with navigation */}
        <div className="mb-8 flex items-center justify-between print:hidden">
          <button
            onClick={() => navigate('/weekly-readings', { state: { week } })}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Volver"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            {role === 'admin' && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Actualizar lecturas desde Ciudad Redonda"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Actualizando...' : 'Actualizar'}
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>
        </div>

        {/* Print-optimized header */}
        <div className="mb-8">
          <p className="text-sm text-indigo-600 font-semibold mb-3 text-center">
            {formattedDate}
          </p>
          {readings.liturgical_day && (
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl p-6 shadow-lg mb-4 print:bg-white print:text-gray-900 print:border print:border-gray-300">
              <h1 className="text-2xl md:text-3xl font-bold text-center">
                {decodeHTMLEntities(readings.liturgical_day)}
              </h1>
            </div>
          )}
          {readings.mass_type && readings.mass_type !== 'Lecturas de Hoy' && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-4 print:border print:border-amber-200">
              <p className="text-lg text-amber-900 font-semibold flex items-center gap-2">
                <span className="text-amber-600">✦</span>
                {decodeHTMLEntities(readings.mass_type)}
              </p>
            </div>
          )}
        </div>

        {/* Readings content */}
        <div className="space-y-8 print:space-y-6">
          {/* First Reading */}
          {readings.first_reading && readings.first_reading_text && (
            <div className="bg-white rounded-xl p-6 shadow-md border border-indigo-100 print:shadow-none print:border print:border-gray-300">
              <h2 className="text-xl font-bold text-indigo-700 mb-2">Primera Lectura</h2>
              <p className="text-sm text-gray-900 mb-4" style={{ fontWeight: 700 }}>
                {decodeHTMLEntities(readings.first_reading)}
              </p>
              <ReadingText text={readings.first_reading_text} />
            </div>
          )}

          {/* Responsorial Psalm */}
          {readings.psalm && readings.psalm_text && (
            <div className="bg-white rounded-xl p-6 shadow-md border border-purple-100 print:shadow-none print:border print:border-gray-300">
              <h2 className="text-xl font-bold text-purple-700 mb-2">Salmo</h2>
              <p className="text-sm text-gray-900 mb-4" style={{ fontWeight: 700 }}>
                {decodeHTMLEntities(readings.psalm)}
              </p>
              <PsalmText text={readings.psalm_text} />
            </div>
          )}

          {/* Second Reading */}
          {readings.second_reading && readings.second_reading_text && (
            <div className="bg-white rounded-xl p-6 shadow-md border border-indigo-100 print:shadow-none print:border print:border-gray-300">
              <h2 className="text-xl font-bold text-indigo-700 mb-2">Segunda Lectura</h2>
              <p className="text-sm text-gray-900 mb-4" style={{ fontWeight: 700 }}>
                {decodeHTMLEntities(readings.second_reading)}
              </p>
              <ReadingText text={readings.second_reading_text} />
            </div>
          )}

          {/* Gospel */}
          {readings.gospel && readings.gospel_text && (
            <div className="bg-white rounded-xl p-6 shadow-md border border-amber-100 print:shadow-none print:border print:border-gray-300">
              <h2 className="text-xl font-bold text-amber-700 mb-2">Evangelio</h2>
              <p className="text-sm text-gray-900 mb-4" style={{ fontWeight: 700 }}>
                {decodeHTMLEntities(readings.gospel)}
              </p>
              <ReadingText text={readings.gospel_text} />
            </div>
          )}
        </div>

        {/* Footer removed per customer request */}
        
        {/* Print instructions */}
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg print:hidden">
          <p className="text-sm text-amber-800">
            <strong>Nota:</strong> Para imprimir sin el pie de página del navegador, asegúrate de desactivar la opción 
            "Encabezados y pies de página" en el diálogo de impresión de tu navegador.
          </p>
        </div>
      </div>
    </div>
  );
}
