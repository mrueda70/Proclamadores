import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Eye, EyeOff, Key, AlertCircle, CheckCircle } from "lucide-react";

// Helper to get token from localStorage
const getToken = () => localStorage.getItem("auth_token");

export default function PinManagement() {
  const navigate = useNavigate();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [currentSecurityQuestion, setCurrentSecurityQuestion] = useState<string | null>(null);
  const [loadingPin, setLoadingPin] = useState(true);

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 5;
    
    const tryFetchPin = async () => {
      if (!mounted) return;
      
      const token = getToken();
      if (!token) {
        setLoadingPin(false);
        setMessage({ 
          type: "error", 
          text: "No hay sesión activa. Por favor, inicia sesión nuevamente." 
        });
        return;
      }
      
      // First check if we have a valid session
      try {
        const sessionResponse = await fetch("/api/auth/session", {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const sessionData = await sessionResponse.json();
        
        if (!sessionData.authenticated || sessionData.role !== "admin") {
          // Not authenticated yet, retry after a short delay
          retryCount++;
          if (retryCount < maxRetries) {
            setTimeout(tryFetchPin, 200);
          } else {
            // After max retries, show error with option to retry manually
            setLoadingPin(false);
            setMessage({ 
              type: "error", 
              text: "No se pudo verificar la sesión. Intenta hacer login nuevamente." 
            });
          }
          return;
        }
        
        // Session is valid, fetch the PIN
        await fetchCurrentPin();
      } catch (error) {
        console.error("Error checking session:", error);
        setLoadingPin(false);
        setMessage({ type: "error", text: "Error de conexión" });
      }
    };
    
    // Start trying to fetch
    tryFetchPin();
    
    return () => {
      mounted = false;
    };
  }, []);

  const fetchCurrentPin = async () => {
    setLoadingPin(true);
    setMessage(null);
    
    const token = getToken();
    if (!token) {
      setLoadingPin(false);
      setMessage({ type: "error", text: "No hay sesión activa" });
      return;
    }

    try {
      console.log("Fetching current PIN...");
      const response = await fetch("/api/auth/current-pin", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log("Response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("PIN loaded successfully");
        setCurrentPin(data.pin);
        setCurrentSecurityQuestion(data.security_question);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Error fetching PIN:", response.status, errorData);
        setMessage({ 
          type: "error", 
          text: `No se pudo cargar el PIN. ${errorData.error || 'Intenta recargar la página o hacer login nuevamente.'}` 
        });
      }
    } catch (error) {
      console.error("Error fetching current PIN:", error);
      setMessage({ type: "error", text: "Error de conexión al cargar el PIN" });
    } finally {
      setLoadingPin(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPin.length === 0) {
      setMessage({ type: "error", text: "Por favor ingresa el nuevo PIN" });
      return;
    }

    const token = getToken();
    if (!token) {
      setMessage({ type: "error", text: "No hay sesión activa" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/change-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPin }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "PIN actualizado correctamente" });
        setCurrentPin(newPin);
        setNewPin("");
        setShowNewPin(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage({ type: "error", text: errorData.error || "Error al actualizar el PIN" });
      }
    } catch (error) {
      console.error("Error changing PIN:", error);
      setMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSecurityQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!securityQuestion || !securityAnswer) {
      setMessage({ type: "error", text: "Por favor completa la pregunta y respuesta de seguridad" });
      return;
    }

    const token = getToken();
    if (!token) {
      setMessage({ type: "error", text: "No hay sesión activa" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/update-security-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          question: securityQuestion,
          answer: securityAnswer 
        }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Pregunta de seguridad actualizada correctamente" });
        setCurrentSecurityQuestion(securityQuestion);
        setSecurityQuestion("");
        setSecurityAnswer("");
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage({ type: "error", text: errorData.error || "Error al actualizar la pregunta de seguridad" });
      }
    } catch (error) {
      console.error("Error updating security question:", error);
      setMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-2 sm:p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8 border border-indigo-100">
          <button
            onClick={() => navigate("/")}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <Key className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Gestión de PIN
              </h1>
              <p className="text-sm text-gray-600">
                Consulta y cambia el PIN de administrador
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Current PIN Display */}
            <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                PIN Actual
              </label>
              <div className="flex items-center gap-2 sm:gap-3">
                <input
                  type={showCurrentPin ? "text" : "password"}
                  value={loadingPin ? "" : currentPin}
                  readOnly
                  placeholder={loadingPin ? "Cargando..." : "••••"}
                  className="flex-1 min-w-0 px-2 sm:px-4 py-3 bg-white text-center text-xl sm:text-2xl font-bold tracking-wide sm:tracking-widest border border-gray-300 rounded-lg cursor-default placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPin(!showCurrentPin)}
                  disabled={loadingPin || !currentPin}
                  className="flex-shrink-0 p-2 sm:p-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {showCurrentPin ? (
                    <EyeOff className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  ) : (
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  )}
                </button>
              </div>
              {!loadingPin && !currentPin && message?.type === "error" && (
                <button
                  onClick={fetchCurrentPin}
                  className="mt-3 w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  Reintentar cargar PIN
                </button>
              )}
            </div>

            {/* Change PIN Form */}
            <form onSubmit={handleChangePin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Nuevo PIN (4 dígitos)
                </label>
                <div className="flex items-center gap-2 sm:gap-3">
                  <input
                    type={showNewPin ? "text" : "password"}
                    value={newPin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setNewPin(value);
                    }}
                    maxLength={4}
                    placeholder="••••"
                    className="flex-1 min-w-0 px-2 sm:px-4 py-3 text-center text-xl sm:text-2xl font-bold tracking-wide sm:tracking-widest border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="flex-shrink-0 p-2 sm:p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {showNewPin ? (
                      <EyeOff className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                    ) : (
                      <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {message && (
                <div
                  className={`p-4 rounded-lg flex items-start gap-3 ${
                    message.type === "success"
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  {message.type === "success" ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <p
                    className={`text-sm ${
                      message.type === "success" ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {message.text}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || newPin.length === 0}
                className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Actualizando..." : "Cambiar PIN"}
              </button>
            </form>

            {/* Security Question Section */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Pregunta de Seguridad
              </h3>
              
              {currentSecurityQuestion && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Pregunta actual:</strong> {currentSecurityQuestion}
                  </p>
                </div>
              )}
              
              <form onSubmit={handleUpdateSecurityQuestion} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nueva Pregunta de Seguridad
                  </label>
                  <input
                    type="text"
                    value={securityQuestion}
                    onChange={(e) => setSecurityQuestion(e.target.value)}
                    placeholder="Ejemplo: ¿Cuál es el nombre de tu primera mascota?"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Respuesta
                  </label>
                  <input
                    type="text"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="Tu respuesta (no distingue mayúsculas)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isLoading || !securityQuestion || !securityAnswer}
                  className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Actualizando..." : "Actualizar Pregunta de Seguridad"}
                </button>
              </form>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Recuperación de PIN:</strong> Si olvidas el PIN, podrás recuperarlo en la pantalla de login
                respondiendo correctamente a tu pregunta de seguridad.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
