import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import { ArrowLeft, Loader2, Music, ChevronDown, ChevronUp, Youtube } from "lucide-react";
import Header from "../components/Header";

/**
 * Fetch with retry for network resilience
 */
async function fetchWithRetry(url: string, maxRetries = 2): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`Fetch attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  throw lastError || new Error('Fetch failed');
}

interface Canto {
  titulo: string;
  autor: string;
  momento: string;
  letra_con_acordes: string;
  razon: string;
}

interface CantosResponse {
  date: string;
  liturgical_day: string;
  cantos: Canto[];
}

// Parse ChordPro format and render with chords above lyrics
function ChordProRenderer({ text }: { text: string }) {
  if (!text) {
    return <div className="text-gray-400 italic">Sin letra disponible</div>;
  }
  const lines = text.split('\n');

  return (
    <div className="font-mono text-sm leading-relaxed">
      {lines.map((line, lineIndex) => {
        // Check if line has chords
        const chordRegex = /\[([^\]]+)\]/g;
        const hasChords = chordRegex.test(line);

        if (!hasChords) {
          return (
            <div key={lineIndex} className="text-gray-700 min-h-[1.5em]">
              {line || '\u00A0'}
            </div>
          );
        }

        // Parse chords and lyrics
        const segments: { chord: string; text: string }[] = [];
        let lastIndex = 0;
        let match;
        
        chordRegex.lastIndex = 0;
        while ((match = chordRegex.exec(line)) !== null) {
          // Text before this chord
          if (match.index > lastIndex) {
            const prevText = line.substring(lastIndex, match.index);
            if (segments.length > 0) {
              segments[segments.length - 1].text += prevText;
            } else {
              segments.push({ chord: '', text: prevText });
            }
          }
          segments.push({ chord: match[1], text: '' });
          lastIndex = match.index + match[0].length;
        }
        
        // Remaining text after last chord
        if (lastIndex < line.length) {
          if (segments.length > 0) {
            segments[segments.length - 1].text += line.substring(lastIndex);
          } else {
            segments.push({ chord: '', text: line.substring(lastIndex) });
          }
        }

        return (
          <div key={lineIndex} className="flex flex-wrap">
            {segments.map((seg, segIndex) => (
              <div key={segIndex} className="inline-flex flex-col">
                <span className="text-purple-600 font-bold h-5">
                  {seg.chord || '\u00A0'}
                </span>
                <span className="text-gray-700">
                  {seg.text || '\u00A0'}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

const momentColors: Record<string, string> = {
  "Entrada": "bg-blue-100 text-blue-700 border-blue-300",
  "Gloria": "bg-yellow-100 text-yellow-700 border-yellow-300",
  "Salmo": "bg-green-100 text-green-700 border-green-300",
  "Aleluya": "bg-amber-100 text-amber-700 border-amber-300",
  "Ofertorio": "bg-purple-100 text-purple-700 border-purple-300",
  "Santo": "bg-red-100 text-red-700 border-red-300",
  "Paz": "bg-cyan-100 text-cyan-700 border-cyan-300",
  "Comunión": "bg-rose-100 text-rose-700 border-rose-300",
  "Acción de Gracias": "bg-orange-100 text-orange-700 border-orange-300",
  "Salida": "bg-indigo-100 text-indigo-700 border-indigo-300",
};

export default function Cantos() {
  const navigate = useNavigate();
  const location = useLocation();
  const { date } = useParams<{ date: string }>();
  const [content, setContent] = useState<CantosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isQuotaError, setIsQuotaError] = useState(false);
  const [expandedSongs, setExpandedSongs] = useState<Set<number>>(new Set());

  const weekFromState = location.state?.week;

  useEffect(() => {
    if (!date) return;

    const fetchCantos = async () => {
      setLoading(true);
      setError(null);
      setIsQuotaError(false);
      try {
        const response = await fetchWithRetry(`/api/cantos-sugeridos/${date}`);
        const data = await response.json();
        if (!response.ok) {
          setIsQuotaError(data.isQuotaError || false);
          throw new Error(data.error || 'Error al cargar los cantos sugeridos');
        }
        setContent(data);
        // Expand first song by default
        if (data.cantos?.length > 0) {
          setExpandedSongs(new Set([0]));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchCantos();
  }, [date]);

  const handleBack = () => {
    if (weekFromState !== undefined) {
      navigate('/weekly-readings', { state: { week: weekFromState } });
    } else {
      navigate('/weekly-readings');
    }
  };

  const toggleSong = (index: number) => {
    setExpandedSongs(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getMomentoColor = (momento: string) => {
    return momentColors[momento] || "bg-gray-100 text-gray-700 border-gray-300";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-purple-700 hover:text-purple-900 font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver a Lecturas Semanales
        </button>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-violet-600 text-white p-6">
            <div className="flex items-center gap-3 mb-2">
              <Music className="w-8 h-8" />
              <h1 className="text-2xl font-bold">Cantos Sugeridos</h1>
            </div>
            {date && (
              <p className="text-purple-100 capitalize">{formatDate(date)}</p>
            )}
            {content?.liturgical_day && (
              <p className="text-purple-100 mt-1 font-medium">{content.liturgical_day}</p>
            )}
          </div>

          <div className="p-6">
            {loading && (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
                <p className="text-gray-600">Generando sugerencias de cantos...</p>
                <p className="text-gray-400 text-sm mt-1">Esto puede tomar unos segundos</p>
              </div>
            )}

            {error && (
              <div className={`${isQuotaError ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'} border rounded-xl p-6 text-center`}>
                <p className={`${isQuotaError ? 'text-amber-700' : 'text-red-600'} font-medium`}>{error}</p>
                {isQuotaError ? (
                  <p className="text-amber-600 text-sm mt-2">
                    El servicio de inteligencia artificial ha alcanzado su límite diario de solicitudes gratuitas. 
                    Por favor, intenta de nuevo mañana.
                  </p>
                ) : (
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Reintentar
                  </button>
                )}
              </div>
            )}

            {content && !loading && !error && (
              <div className="space-y-4">
                <p className="text-gray-600 text-sm italic text-center mb-6">
                  Cantos sugeridos basados en las lecturas del día. 
                  Toca cada canto para ver la letra con acordes.
                </p>

                {content.cantos.map((canto, index) => {
                  const isExpanded = expandedSongs.has(index);
                  
                  return (
                    <div 
                      key={index} 
                      className="border-2 border-purple-200 rounded-xl overflow-hidden bg-white"
                    >
                      <button
                        onClick={() => toggleSong(index)}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-purple-50 transition-colors"
                      >
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getMomentoColor(canto.momento)}`}>
                              {canto.momento}
                            </span>
                            <h3 className="font-bold text-gray-900">{canto.titulo}</h3>
                          </div>
                          <p className="text-gray-500 text-sm mt-1">{canto.autor}</p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-purple-600 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-purple-600 flex-shrink-0" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-purple-100 p-5 bg-purple-50/30">
                          <div className="mb-4 p-3 bg-purple-100/50 rounded-lg">
                            <p className="text-sm text-purple-700 italic">
                              <strong>¿Por qué este canto?</strong> {canto.razon}
                            </p>
                          </div>
                          {/* YouTube search link */}
                          <a
                            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(canto.titulo + ' ' + canto.autor + ' canto católico')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                          >
                            <Youtube className="w-5 h-5" />
                            Buscar en YouTube
                          </a>
                          <div className="bg-white rounded-lg p-4 border border-purple-200 overflow-x-auto">
                            <ChordProRenderer text={canto.letra_con_acordes} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
