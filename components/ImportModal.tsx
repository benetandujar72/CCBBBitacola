
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 bg-indigo-600 text-white">
          <h2 className="text-xl font-bold">Importació Intel·ligent</h2>
          <p className="text-indigo-100 text-sm mt-1">Enganxa llistes d'alumnes, matèries i competències. La IA detecta automàticament múltiples grups.</p>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <textarea
            className="w-full h-64 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none text-gray-700 bg-gray-50"
            placeholder={`Exemple de format lliure:

Grup 1r A:
Maria, Joan, Pere.
Matèria: Mates.

Grup 1r B:
Anna, Lluís, Jordi.
Matèria: Mates.

Competències per a tots:
1. Càlcul mental
2. Resolució de problemes`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-gray-600 hover:bg-gray-200 font-medium transition-colors"
          >
            Cancel·lar
          </button>
          <button
            onClick={handleProcess}
            disabled={isLoading || !inputText.trim()}
            className={`flex items-center px-6 py-2.5 rounded-lg text-white font-medium shadow-md transition-all ${
              isLoading || !inputText.trim() 
                ? 'bg-indigo-300 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg transform hover:-translate-y-0.5'
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
              'Processar i Crear'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
