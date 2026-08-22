import { FileText, Users, ArrowLeft, BookOpen } from 'lucide-react';
import { useState } from 'react';
import ReadersReport from '@/react-app/components/ReadersReport';
import ReaderParticipation from '@/react-app/components/ReaderParticipation';
import WeeklyReadings from '@/react-app/components/WeeklyReadings';
import type { Mass, Reader } from '@/react-app/types';

interface ReportsProps {
  masses: Mass[];
  readers: Reader[];
  onBack: () => void;
}

type ReportView = 'menu' | 'readers-report' | 'participation-report' | 'weekly-readings';

export default function Reports({ masses, readers, onBack }: ReportsProps) {
  const [currentView, setCurrentView] = useState<ReportView>('menu');

  const renderContent = () => {
    switch (currentView) {
      case 'readers-report':
        return <ReadersReport readers={readers} onBack={() => setCurrentView('menu')} />;
      case 'participation-report':
        return <ReaderParticipation masses={masses} readers={readers} onBack={() => setCurrentView('menu')} />;
      case 'weekly-readings':
        return <WeeklyReadings masses={masses} onBack={() => setCurrentView('menu')} />;
      default:
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8 flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Volver al panel"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestionar Consultas</h1>
                <p className="text-gray-600">Genera reportes y consultas sobre lectores y participación</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <button
                onClick={() => setCurrentView('readers-report')}
                className="bg-white rounded-2xl p-8 shadow-lg border border-green-100 hover:shadow-xl transition-all group text-left"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
                    <FileText className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="text-4xl group-hover:translate-x-1 transition-transform">→</div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Reporte de Proclamadores</h3>
                <p className="text-gray-600">
                  Lista ordenada alfabéticamente con la información de todos los proclamadores
                </p>
              </button>

              <button
                onClick={() => setCurrentView('participation-report')}
                className="bg-white rounded-2xl p-8 shadow-lg border border-blue-100 hover:shadow-xl transition-all group text-left"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="text-4xl group-hover:translate-x-1 transition-transform">→</div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Participación de Proclamadores</h3>
                <p className="text-gray-600">
                  Consulta las eucaristías donde un proclamador ha participado en un rango de fechas
                </p>
              </button>

              <button
                onClick={() => setCurrentView('weekly-readings')}
                className="bg-white rounded-2xl p-8 shadow-lg border border-purple-100 hover:shadow-xl transition-all group text-left"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                    <BookOpen className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="text-4xl group-hover:translate-x-1 transition-transform">→</div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Lecturas de la Semana</h3>
                <p className="text-gray-600">
                  Consulta las lecturas programadas para cada eucaristía de la semana
                </p>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {renderContent()}
    </div>
  );
}
