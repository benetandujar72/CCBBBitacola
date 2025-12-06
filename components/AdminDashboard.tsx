
import React, { useState, useMemo } from 'react';
import { User, AuditLog, Group, Subject, Student, Competency, Evaluation, LevelLabels, LevelValues, SheetConfig, PreviewData } from '../types';
import { testConnection } from '../services/database';

interface AdminDashboardProps {
  onClose: () => void;
  users: User[];
  logs: AuditLog[];
  onToggleBlockUser: (email: string) => void;
  onToggleUserRole: (email: string) => void; 
  currentUserEmail: string; 
  groups: Group[];
  subjects: Subject[];
  students: Student[];
  competencies: Competency[];
  evaluations: Evaluation[];
  sheetConfigs?: SheetConfig[];
  onSaveSheetConfigs?: (configs: SheetConfig[]) => void;
  onSyncSheets?: () => void;
  previewData?: PreviewData[] | null;
  onConfirmSync?: () => void;
  onCancelPreview?: () => void;
  onUpdateAnswerKeys?: (csvText: string) => boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  onClose, users, logs, onToggleBlockUser, onToggleUserRole, currentUserEmail,
  groups, subjects, students, competencies, evaluations,
  sheetConfigs = [], onSaveSheetConfigs, onSyncSheets,
  previewData, onConfirmSync, onCancelPreview, onUpdateAnswerKeys
}) => {
  const [activeTab, setActiveTab] = useState<'data' | 'users' | 'logs' | 'database'>('data');
  const [filterEmail, setFilterEmail] = useState('');
  const [csvAnswerKey, setCsvAnswerKey] = useState('');
  const [answerKeyStatus, setAnswerKeyStatus] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'error', msg: string }>({ status: 'idle', msg: '' });
  
  // Sheet Config State (local)
  const [configs, setConfigs] = useState<SheetConfig[]>(
    ['Català', 'Castellà', 'Anglès', 'Matemàtiques', 'Ciències'].map(sub => ({
      subjectName: sub,
      sheetId: sheetConfigs.find(c => c.subjectName === sub)?.sheetId || ''
    }))
  );

  const handleConfigChange = (subject: string, id: string) => {
    const newConfigs = configs.map(c => c.subjectName === subject ? { ...c, sheetId: id } : c);
    setConfigs(newConfigs);
    if (onSaveSheetConfigs) onSaveSheetConfigs(newConfigs);
  };

  const handleSaveAnswerKeys = () => {
    if (!onUpdateAnswerKeys || !csvAnswerKey.trim()) return;
    const success = onUpdateAnswerKeys(csvAnswerKey);
    if (success) {
      setAnswerKeyStatus("Pautes actualitzades correctament!");
      setCsvAnswerKey('');
      setTimeout(() => setAnswerKeyStatus(null), 3000);
    } else {
      setAnswerKeyStatus("Error al processar el CSV. Revisa el format.");
    }
  };

  const handleTestDb = async () => {
    setDbStatus({ status: 'loading', msg: 'Connectant amb Neon PostgreSQL...' });
    try {
      const res = await testConnection();
      if (res.success) {
        setDbStatus({ status: 'success', msg: `Connexió exitosa! Server Time: ${res.timestamp}` });
      } else {
        setDbStatus({ status: 'error', msg: `Error de connexió: ${res.error}` });
      }
    } catch (e: any) {
      setDbStatus({ status: 'error', msg: `Error crític: ${e.message}` });
    }
  };

  const filteredLogs = useMemo(() => {
    let result = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (filterEmail) {
      result = result.filter(log => log.userEmail.toLowerCase().includes(filterEmail.toLowerCase()));
    }
    return result;
  }, [logs, filterEmail]);

  const filteredUsers = useMemo(() => {
    if (!filterEmail) return users;
    return users.filter(u => u.email.toLowerCase().includes(filterEmail.toLowerCase()));
  }, [users, filterEmail]);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('ca-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const downloadFullDataCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Grup,Materia,Alumne,Email,Categoria,Competencia,Nota_Numerica,Nivell_Text\n";

    evaluations.forEach(ev => {
      const student = students.find(s => s.id === ev.studentId);
      const comp = competencies.find(c => c.id === ev.competencyId);
      const subject = subjects.find(s => s.id === comp?.subjectId);
      const group = groups.find(g => g.id === subject?.groupId);
      
      if (student && comp && subject && group && ev.level) {
        const row = [
          `"${group.name}"`,
          `"${subject.name}"`,
          `"${student.name}"`,
          `"${student.email || ''}"`,
          `"${comp.category || 'General'}"`,
          `"${comp.description.replace(/"/g, '""')}"`, 
          `"${LevelValues[ev.level]}"`,
          `"${LevelLabels[ev.level]}"`
        ].join(",");
        csvContent += row + "\n";
      }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Dades_Academiques_Completes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-gray-700 relative">
        
        {/* PREVIEW MODAL */}
        {previewData && (
          <div className="absolute inset-0 bg-white z-50 flex flex-col">
            <div className="p-6 bg-indigo-600 text-white flex justify-between items-center shadow-md">
              <h3 className="text-xl font-bold">Previsualització de Dades</h3>
              <button onClick={onCancelPreview} className="hover:bg-indigo-700 p-2 rounded">Tancar</button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-gray-50 space-y-8">
              {previewData.map((sheet, idx) => (
                <div key={idx} className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 border-b font-bold text-gray-700">
                    {sheet.subjectName} (Primeres 5 files)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          {sheet.rawValues[0]?.slice(0, 10).map((head: string, hIdx: number) => (
                            <th key={hIdx} className="px-2 py-2 border text-left truncate max-w-[100px]">{head}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sheet.rawValues.slice(1, 6).map((row, rIdx) => (
                          <tr key={rIdx}>
                            {row.slice(0, 10).map((cell: any, cIdx: number) => (
                              <td key={cIdx} className="px-2 py-2 border truncate max-w-[100px]">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t bg-gray-100 flex justify-end gap-4">
              <button onClick={onCancelPreview} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded">Cancel·lar</button>
              <button onClick={onConfirmSync} className="px-6 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700">Confirmar i Importar</button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-6 bg-gray-800 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Administració
            </h2>
            <p className="text-gray-400 text-sm mt-1">Gestió global del sistema i exportació</p>
          </div>
          
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full text-gray-300 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-gray-100 p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex space-x-2 bg-white p-1 rounded-lg shadow-sm border border-gray-200 w-full sm:w-auto overflow-x-auto">
             <button
              onClick={() => setActiveTab('data')}
              className={`flex-1 sm:flex-none px-4 lg:px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'data' ? 'bg-gray-800 text-white shadow' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
              Dades
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`flex-1 sm:flex-none px-4 lg:px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'database' ? 'bg-gray-800 text-white shadow' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
              Base de Dades
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 sm:flex-none px-4 lg:px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'users' ? 'bg-gray-800 text-white shadow' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              Usuaris
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex-1 sm:flex-none px-4 lg:px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'logs' ? 'bg-gray-800 text-white shadow' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
              Logs
            </button>
          </div>
          
          {(activeTab === 'users' || activeTab === 'logs') && (
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Filtrar per email..."
                className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                value={filterEmail}
                onChange={(e) => setFilterEmail(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-50 p-6">
          
          {/* PESTANYA BASE DE DADES (NOVA) */}
          {activeTab === 'database' && (
             <div className="max-w-3xl mx-auto space-y-6">
               <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 mb-4">
                       <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800">Estat de la Base de Dades (Neon PostgreSQL)</h3>
                    <p className="text-gray-500 mt-2">
                       Aquesta eina verifica que el backend (<code className="bg-gray-100 px-1 rounded text-xs">/api/query</code>) es pot comunicar correctament amb la base de dades.
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mb-6">
                     <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-600">Estat Connexió:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          dbStatus.status === 'success' ? 'bg-green-100 text-green-700' :
                          dbStatus.status === 'error' ? 'bg-red-100 text-red-700' :
                          dbStatus.status === 'loading' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-500'
                        }`}>
                           {dbStatus.status === 'idle' ? 'NO INICIAT' : dbStatus.status}
                        </span>
                     </div>
                     {dbStatus.msg && (
                       <div className={`mt-4 p-3 rounded-lg text-sm font-mono border ${
                         dbStatus.status === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 
                         dbStatus.status === 'error' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-yellow-50 text-yellow-800 border-yellow-200'
                       }`}>
                         {dbStatus.msg}
                       </div>
                     )}
                  </div>

                  <button 
                    onClick={handleTestDb}
                    disabled={dbStatus.status === 'loading'}
                    className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 ${
                      dbStatus.status === 'loading' ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {dbStatus.status === 'loading' ? 'Connectant...' : 'Provar Connexió Live'}
                  </button>
               </div>
             </div>
          )}

          {/* PESTANYA DADES ACADÈMIQUES */}
          {activeTab === 'data' && (
            <div className="space-y-6">
               
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Secció Configuració Sheets */}
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                   <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                      <div className="p-2 bg-green-100 rounded-lg">
                         <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <div>
                         <h3 className="text-lg font-bold text-gray-800">Connexió Google Sheets</h3>
                         <p className="text-sm text-gray-500">Introdueix els IDs dels fulls de càlcul.</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 gap-3 mb-6">
                     {configs.map(config => (
                       <div key={config.subjectName} className="flex items-center gap-2">
                          <label className="w-28 font-bold text-gray-600 text-sm">{config.subjectName}:</label>
                          <input 
                            type="text" 
                            className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-xs"
                            placeholder={`ID del full`}
                            value={config.sheetId}
                            onChange={(e) => handleConfigChange(config.subjectName, e.target.value)}
                          />
                       </div>
                     ))}
                   </div>

                   <div className="flex justify-end">
                      <button 
                        onClick={onSyncSheets}
                        disabled={!onSyncSheets}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow transition-all active:scale-95 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Sincronitzar
                      </button>
                   </div>
                 </div>

                 {/* Secció Configuració Pautes */}
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                   <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                      <div className="p-2 bg-orange-100 rounded-lg">
                         <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                      </div>
                      <div>
                         <h3 className="text-lg font-bold text-gray-800">Configuració Pautes Correcció</h3>
                         <p className="text-sm text-gray-500">Enganxa el CSV (Materia,Pregunta,Resposta) per actualitzar el solucionari.</p>
                      </div>
                   </div>
                   
                   <textarea
                     className="flex-1 w-full border border-gray-300 rounded-lg p-3 font-mono text-xs focus:ring-2 focus:ring-orange-500 mb-4 resize-none"
                     rows={6}
                     placeholder={`Exemple:\nMatemàtiques,1,c\nMatemàtiques,2,a\nCatalà,1,b`}
                     value={csvAnswerKey}
                     onChange={(e) => setCsvAnswerKey(e.target.value)}
                   />

                   <div className="flex justify-between items-center">
                      <span className={`text-xs font-bold ${answerKeyStatus?.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                        {answerKeyStatus}
                      </span>
                      <button 
                        onClick={handleSaveAnswerKeys}
                        disabled={!csvAnswerKey}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shadow transition-all active:scale-95 text-sm disabled:opacity-50"
                      >
                        Actualitzar Pautes
                      </button>
                   </div>
                 </div>
               </div>

               {/* Secció Resum i Exportació */}
               <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center text-center">
                  <div className="p-4 bg-blue-50 rounded-full mb-4">
                    <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Exportació de Dades Acadèmiques</h3>
                  <p className="text-gray-500 max-w-lg mb-6">
                    Genera un fitxer CSV complet amb totes les avaluacions (manuals i importades de Sheets).
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4 w-full max-w-3xl mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                       <div className="text-xs font-bold text-gray-400 uppercase">Alumnes</div>
                       <div className="text-xl font-black text-gray-800">{students.length}</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                       <div className="text-xs font-bold text-gray-400 uppercase">Matèries</div>
                       <div className="text-xl font-black text-gray-800">{subjects.length}</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                       <div className="text-xs font-bold text-gray-400 uppercase">Notes</div>
                       <div className="text-xl font-black text-indigo-600">{evaluations.length}</div>
                    </div>
                  </div>

                  <button 
                     onClick={downloadFullDataCSV}
                     className="px-8 py-3 bg-gray-800 hover:bg-gray-900 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center"
                   >
                     Descarregar Tot (CSV)
                  </button>
               </div>
            </div>
          )}

          {/* PESTANYA LOGS */}
          {activeTab === 'logs' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-bold text-gray-700">Registre Tècnic (Auditoria)</h3>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Usuari</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Acció</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Detalls</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">IP</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {log.userEmail}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                         <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${log.action === 'LOGIN' ? 'bg-green-100 text-green-800' : ''}
                          ${log.action === 'LOGOUT' ? 'bg-red-100 text-red-800' : ''}
                          ${log.action === 'SYNC_SHEETS' ? 'bg-indigo-100 text-indigo-800' : ''}
                          ${!['LOGIN', 'LOGOUT', 'SYNC_SHEETS'].includes(log.action) ? 'bg-gray-100 text-gray-800' : ''}
                        `}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {log.details}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">
                        {log.ip}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PESTANYA USUARIS */}
          {activeTab === 'users' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map(user => (
                <div key={user.email} className={`bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between ${user.isBlocked ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                   <div className="flex items-start gap-3 mb-4">
                     {user.picture ? (
                        <img 
                          src={user.picture} 
                          alt={user.name} 
                          className="w-10 h-10 rounded-full object-cover" 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                     ) : null}
                     <div className={`w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-200 ${user.picture ? 'hidden' : ''}`}>
                        {user.name.charAt(0).toUpperCase()}
                     </div>
                     
                     <div className="overflow-hidden">
                       <div className="flex items-center gap-2">
                         <h3 className="font-bold text-gray-800 truncate">{user.name}</h3>
                         {user.role === 'admin' && (
                           <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded">ADMIN</span>
                         )}
                       </div>
                       <p className="text-xs text-gray-500 truncate">{user.email}</p>
                       <p className="text-xs text-gray-400 mt-1">Últim accés: {user.lastLogin ? formatDate(user.lastLogin) : 'N/A'}</p>
                     </div>
                   </div>
                   
                   <div className="flex flex-col gap-2 border-t pt-3 border-gray-100">
                      
                      {/* Block/Unblock Button */}
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-bold uppercase ${user.role === 'admin' ? 'text-purple-600' : 'text-gray-500'}`}>
                          {user.role === 'admin' ? 'Rol: Administrador' : 'Rol: Docent'}
                        </span>
                        <button
                          onClick={() => onToggleBlockUser(user.email)}
                          disabled={user.email === currentUserEmail} // Prevent blocking self
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                            user.isBlocked 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                          } ${user.email === currentUserEmail ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {user.isBlocked ? 'Desbloquejar' : 'Bloquejar Accés'}
                        </button>
                      </div>

                      {/* Role Toggle Button */}
                      <button 
                        onClick={() => onToggleUserRole(user.email)}
                        disabled={user.email === currentUserEmail} // Prevent demoting self
                        className={`w-full text-xs font-bold py-2 rounded-lg transition-colors ${
                           user.role === 'admin'
                           ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                           : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                        } ${user.email === currentUserEmail ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                         {user.role === 'admin' ? 'Degradar a Docent' : 'Promocionar a Admin'}
                      </button>

                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
