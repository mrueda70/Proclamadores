import { useState } from "react";
import { useNavigate } from "react-router";
import { Book, User, Shield, ArrowLeft, AlertCircle, HelpCircle } from "lucide-react";
import { useAuth } from "@/react-app/contexts/AuthContext";

export default function SimpleLogin() {
  const navigate = useNavigate();
  const { loginAsUser, loginAsAdmin } = useAuth();
  const [view, setView] = useState<"select" | "admin-pin" | "forgot-pin" | "show-pin">("select");
  const [pin, setPin] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [recoveredPin, setRecoveredPin] = useState("");

  const handleUserLogin = async () => {
    setIsLoading(true);
    try {
      await loginAsUser();
      navigate("/user");
    } catch (error) {
      setError("Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pin.length === 0) {
      setError("Por favor ingresa el PIN");
      return;
    }

    setIsLoading(true);
    setError("");

    const result = await loginAsAdmin(pin);

    if (result.success) {
      // Wait to ensure the cookie is properly set before navigating
      await new Promise(resolve => setTimeout(resolve, 500));
      navigate("/");
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= 3) {
        setError("Máximo de intentos alcanzado. Intenta recuperar el PIN usando la pregunta de seguridad.");
        setPin("");
      } else {
        setError(`PIN incorrecto. Intentos restantes: ${3 - newAttempts}`);
        setPin("");
      }
    }
    
    setIsLoading(false);
  };

  const handleForgotPin = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch("/api/auth/security-question", {
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        setSecurityQuestion(data.question);
        setView("forgot-pin");
      } else {
        setError("No hay pregunta de seguridad configurada. Contacta al administrador.");
      }
    } catch (error) {
      setError("Error al cargar la pregunta de seguridad");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!securityAnswer) {
      setError("Por favor ingresa tu respuesta");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify-security-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ answer: securityAnswer }),
      });

      if (response.ok) {
        const data = await response.json();
        setRecoveredPin(data.pin);
        setView("show-pin");
        setSecurityAnswer("");
      } else {
        setError("Respuesta incorrecta. Intenta nuevamente.");
        setSecurityAnswer("");
      }
    } catch (error) {
      setError("Error al verificar la respuesta");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-indigo-100">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-indigo-100 rounded-2xl mb-4">
            <Book className="w-12 h-12 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Ministerio de Proclamadores
          </h1>
          <h2 className="text-xl font-semibold text-indigo-600">
            PARROQUIA EL DIVINO NIÑO
          </h2>
        </div>

        {view === "select" ? (
          <div className="space-y-4">
            <button
              onClick={handleUserLogin}
              disabled={isLoading}
              className="w-full py-4 px-6 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all font-medium flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <User className="w-6 h-6" />
              <span>Ingresar como Usuario</span>
            </button>

            <button
              onClick={() => setView("admin-pin")}
              disabled={isLoading}
              className="w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all font-medium flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Shield className="w-6 h-6" />
              <span>Ingresar como Administrador</span>
            </button>

            <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Usuario:</strong> Consulta la programación y lecturas (solo lectura)
              </p>
              <p className="text-sm text-gray-600 mt-2">
                <strong>Administrador:</strong> Gestión completa del sistema
              </p>
            </div>
          </div>
        ) : view === "admin-pin" ? (
          <div>
            <button
              onClick={() => {
                setView("select");
                setPin("");
                setError("");
                setAttempts(0);
              }}
              className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>

            <form onSubmit={handleAdminPinSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PIN de Administrador (4 dígitos)
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setPin(value);
                  }}
                  maxLength={4}
                  placeholder="••••"
                  className="w-full px-4 py-3 text-center text-2xl font-bold tracking-widest border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={isLoading}
                  autoFocus
                />
                {attempts > 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    Intentos restantes: {3 - attempts}
                  </p>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || pin.length === 0}
                className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Verificando..." : "Ingresar"}
              </button>

              <button
                type="button"
                onClick={handleForgotPin}
                disabled={isLoading}
                className="w-full py-2 px-4 text-indigo-600 hover:text-indigo-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <HelpCircle className="w-4 h-4" />
                <span>¿Olvidaste tu PIN?</span>
              </button>
            </form>
          </div>
        ) : view === "forgot-pin" ? (
          <div>
            <button
              onClick={() => {
                setView("admin-pin");
                setSecurityAnswer("");
                setError("");
              }}
              className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>

            <form onSubmit={handleVerifyAnswer} className="space-y-6">
              <div className="p-4 bg-indigo-50 rounded-lg mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Pregunta de Seguridad:</p>
                <p className="text-base text-gray-900">{securityQuestion}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tu Respuesta
                </label>
                <input
                  type="text"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="Ingresa tu respuesta"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={isLoading}
                  autoFocus
                />
                <p className="mt-2 text-xs text-gray-500">
                  La respuesta no distingue entre mayúsculas y minúsculas
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !securityAnswer}
                className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Verificando..." : "Verificar Respuesta"}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="text-center mb-6">
              <div className="inline-block p-4 bg-green-100 rounded-2xl mb-4">
                <Shield className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                PIN Recuperado
              </h3>
              <p className="text-sm text-gray-600">
                Este es tu PIN de administrador
              </p>
            </div>

            <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 mb-6">
              <p className="text-sm text-gray-600 mb-3 text-center">Tu PIN es:</p>
              <div className="text-center">
                <span className="text-4xl font-bold text-gray-900 tracking-widest">
                  {recoveredPin}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setView("admin-pin");
                setRecoveredPin("");
                setAttempts(0);
              }}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
            >
              Volver al Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}