import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import { ArrowLeft, Loader2, Sparkles, BookOpen, Heart, MessageCircle, Hand, Star, Trash2 } from "lucide-react";
import Header from "../components/Header";
import { useAuth } from '@/react-app/contexts/AuthContext';

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

interface LectioDivinaContent {
  lectio: {
    title: string;
    content: string;
  };
  meditatio: {
    title: string;
    content: string;
  };
  oratio: {
    title: string;
    content: string;
  };
  contemplatio: {
    title: string;
    content: string;
  };
  actio: {
    title: string;
    content: string;
  };
}

interface LectioDivinaResponse {
  date: string;
  liturgical_day: string;
  lectio_divina: LectioDivinaContent;
}

const stepIcons = {
  lectio: BookOpen,
  meditatio: Heart,
  oratio: MessageCircle,
  contemplatio: Star,
  actio: Hand,
};

const stepColors = {
  lectio: "from-amber-500 to-orange-500",
  meditatio: "from-rose-500 to-pink-500",
  oratio: "from-purple-500 to-violet-500",
  contemplatio: "from-blue-500 to-indigo-500",
  actio: "from-green-500 to-emerald-500",
};

const stepBgColors = {
  lectio: "bg-amber-50 border-amber-200",
  meditatio: "bg-rose-50 border-rose-200",
  oratio: "bg-purple-50 border-purple-200",
  contemplatio: "bg-blue-50 border-blue-200",
  actio: "bg-green-50 border-green-200",
};

export default function LectioDivina() {
  const navigate = useNavigate();
  const location = useLocation();
  const { date } = useParams<{ date: string }>();
  const { role } = useAuth();
  const [content, setContent] = useState<LectioDivinaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isQuotaError, setIsQuotaError] = useState(false);
  const [clearing, setClearing] = useState(false);

  const weekFromState = location.state?.week;
  const isAdmin = role === 'admin';

  const clearCacheAndRetry = async () => {
    if (!date) return;
    setClearing(true);
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`/api/cached-ai-content/${date}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Reload the page to re-fetch
      window.location.reload();
    } catch (err) {
      console.error('Error clearing cache:', err);
      setClearing(false);
    }
  };

  useEffect(() => {
    if (!date) return;

    const fetchLectioDivina = async () => {
      setLoading(true);
      setError(null);
      setIsQuotaError(false);
      try {
        const response = await fetchWithRetry(`/api/lectio-divina/${date}`);
        const data = await response.json();
        if (!response.ok) {
          setIsQuotaError(data.isQuotaError || false);
          throw new Error(data.error || 'Error al cargar la Lectio Divina');
        }
        
        // Check if content is valid (not empty)
        const ld = data.lectio_divina;
        if (!ld?.lectio?.content || !ld?.meditatio?.content || !ld?.oratio?.content ||
            !ld?.contemplatio?.content || !ld?.actio?.content) {
          throw new Error('El contenido no está disponible. Por favor, intenta de nuevo más tarde.');
        }
        
        setContent(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchLectioDivina();
  }, [date]);

  const handleBack = () => {
    if (weekFromState !== undefined) {
      navigate('/weekly-readings', { state: { week: weekFromState } });
    } else {
      navigate('/weekly-readings');
    }
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

  const steps = content?.lectio_divina ? [
    { key: 'lectio', data: content.lectio_divina.lectio },
    { key: 'meditatio', data: content.lectio_divina.meditatio },
    { key: 'oratio', data: content.lectio_divina.oratio },
    { key: 'contemplatio', data: content.lectio_divina.contemplatio },
    { key: 'actio', data: content.lectio_divina.actio },
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-amber-700 hover:text-amber-900 font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver a Lecturas Semanales
        </button>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-6">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-8 h-8" />
              <h1 className="text-2xl font-bold">Lectio Divina</h1>
            </div>
            {date && (
              <p className="text-amber-100 capitalize">{formatDate(date)}</p>
            )}
            {content?.liturgical_day && (
              <p className="text-amber-100 mt-1 font-medium">{content.liturgical_day}</p>
            )}
          </div>

          <div className="p-6">
            {loading && (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-12 h-12 text-amber-600 animate-spin mb-4" />
                <p className="text-gray-600">Generando Lectio Divina...</p>
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
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={() => window.location.reload()}
                      className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      Reintentar
                    </button>
                    {isAdmin && (
                      <button
                        onClick={clearCacheAndRetry}
                        disabled={clearing}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        {clearing ? 'Limpiando...' : 'Limpiar caché y reintentar'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {content && !loading && !error && (
              <div className="space-y-6">
                <p className="text-gray-600 text-sm italic text-center mb-8">
                  La Lectio Divina es una forma de oración meditativa que nos ayuda a profundizar 
                  en la Palabra de Dios y permitir que transforme nuestras vidas.
                </p>

                {steps.map(({ key, data }, index) => {
                  const Icon = stepIcons[key as keyof typeof stepIcons];
                  const gradient = stepColors[key as keyof typeof stepColors];
                  const bgColor = stepBgColors[key as keyof typeof stepBgColors];

                  return (
                    <div key={key} className={`rounded-xl border-2 ${bgColor} overflow-hidden`}>
                      <div className={`bg-gradient-to-r ${gradient} text-white px-5 py-3 flex items-center gap-3`}>
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <Icon className="w-5 h-5" />
                        <h2 className="font-bold text-lg">{data.title}</h2>
                      </div>
                      <div className="p-5">
                        <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                          {data.content}
                        </p>
                      </div>
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
