
import React, { useState } from 'react';
import { parseRawInputToData } from '../services/geminiService';
import { ImportData } from '../types';

interface ImportModalProps {
  onClose: () => void;
  onImport: (data: ImportData[]) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport }) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await parseRawInputToData(inputText);
      if (data && data.length > 0) {
        onImport(data);
        onClose();
      } else {
        setError("La IA no ha pogut entendre les dades. Si us plau, revisa el text.");
      }
    } catch (err) {
      setError("Error de connexió amb el servei d'intel·ligència artificial.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        {/* Header - Minimalista */}
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-indigo-700">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-white">Importació Intel·ligent</h2>
              <p className="text-indigo-100 text-xs sm:text-sm mt-1 hidden sm:block">
                Enganxa llistes d'alumnes, matèries i competències
              </p>
            </div>
            <button
              onClick={onClose}
              className="ml-2 p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - Optimizado para móvil */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          <textarea
            className="w-full h-48 sm:h-64 p-3 sm:p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none text-sm sm:text-base text-gray-700 bg-gray-50"
            placeholder={`Exemple:

Grup 1r A:
Maria, Joan, Pere
Matèria: Mates

Grup 1r B:
Anna, Lluís
Matèria: Català

Competències:
1. Càlcul mental
2. Resolució problemes`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          {error && (
            <div className="mt-3 sm:mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-xs sm:text-sm border border-red-200 flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Info adicional - Solo en desktop */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 hidden sm:block">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs text-blue-700">
                <p className="font-semibold mb-1">Consell:</p>
                <p>La IA detecta automàticament múltiples grups i matèries. Pots usar format lliure!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Botones optimizados para móvil */}
        <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 sm:px-5 py-2.5 rounded-lg text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-100 font-medium transition-colors"
            >
              Cancel·lar
            </button>
            <button
              onClick={handleProcess}
              disabled={isLoading || !inputText.trim()}
              className={`w-full sm:flex-1 flex items-center justify-center px-4 sm:px-6 py-2.5 rounded-lg text-white font-semibold shadow-md transition-all ${isLoading || !inputText.trim()
                  ? 'bg-indigo-300 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'
                }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processant...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Processar i Crear
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
