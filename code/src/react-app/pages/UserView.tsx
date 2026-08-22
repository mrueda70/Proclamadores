import { useNavigate } from "react-router";
import { Calendar, Book, LogOut, BookOpen } from "lucide-react";
import { useAuth } from "@/react-app/contexts/AuthContext";

export default function UserView() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-indigo-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <Book className="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Ministerio de Proclamadores
                </h1>
                <p className="text-sm text-gray-600">
                  Parroquia El Divino Niño
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Salir</span>
            </button>
          </div>
        </div>

        {/* Main Navigation Buttons */}
        <div className="grid grid-cols-1 gap-6">
          <button
            onClick={() => navigate("/eucharist-schedule")}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all group text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-4 bg-white/20 rounded-xl">
                <Calendar className="w-10 h-10 text-white" />
              </div>
              <div className="text-5xl group-hover:translate-x-2 transition-transform text-white">→</div>
            </div>
            <h3 className="text-2xl font-bold mb-2">Programación de Eucaristías</h3>
            <p className="text-indigo-100 text-base">Ver horarios y proclamadores asignados para las celebraciones</p>
          </button>

          <button
            onClick={() => navigate("/weekly-readings")}
            className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all group text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-4 bg-white/20 rounded-xl">
                <BookOpen className="w-10 h-10 text-white" />
              </div>
              <div className="text-5xl group-hover:translate-x-2 transition-transform text-white">→</div>
            </div>
            <h3 className="text-2xl font-bold mb-2">Lecturas del Día</h3>
            <p className="text-green-100 text-base">Lecturas bíblicas de la semana y sus referencias</p>
          </button>
        </div>
      </div>
    </div>
  );
}
