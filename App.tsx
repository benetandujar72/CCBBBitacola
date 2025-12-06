
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ImportModal from './components/ImportModal';
import StudentCard from './components/StudentCard';
import GlobalReport from './components/GlobalReport';
import AdminDashboard from './components/AdminDashboard';
import { Group, Subject, Student, Competency, Evaluation, ImportData, CompetencyLevel, User, AuditLog, SheetConfig, TokenClient, PreviewData } from './types';
import { fetchSheetValues, processSheetData, parseAnswerKeyCSV } from './services/sheetsService';
import { api } from './services/api';

// --- CONFIGURACIÓ ---
const GOOGLE_CLIENT_ID = "360338465758-dh2fdld2geg2ac8r0qigr81kvm8ek857.apps.googleusercontent.com";
const ADMIN_EMAIL = "benet.andujar@insbitacola.cat";

// Helper to decode JWT
const decodeJwt = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT', error);
    return null;
  }
};

const PREDEFINED_SUBJECTS = ['Català', 'Castellà', 'Anglès', 'Matemàtiques', 'Ciències'];
const COMPETENCIES_STRUCTURE = {
  'Castellà': [
    { category: 'Competència discursiva', items: ['Adequació i coherència'] },
    { category: 'Competència lingüística', items: ['Lèxic', 'Ortografia', 'Morfosintaxi', 'Presentació'] },
    { category: 'Prova de Competències (Test)', items: Array.from({ length: 50 }, (_, i) => `Pregunta ${i + 1}`) }
  ],
  'Català': [
    { category: 'Competència discursiva', items: ['Adequació i coherència'] },
    { category: 'Competència lingüística', items: ['Lèxic', 'Ortografia', 'Morfosintaxi', 'Presentació'] },
    { category: 'Prova de Competències (Test)', items: Array.from({ length: 50 }, (_, i) => `Pregunta ${i + 1}`) }
  ],
  'Anglès': [
    { category: 'Competència discursiva', items: ['Adequació i coherència'] },
    { category: 'Competència lingüística', items: ['Lèxic', 'Ortografia', 'Morfosintaxi', 'Presentació'] },
    { category: 'Prova de Competències (Test)', items: Array.from({ length: 50 }, (_, i) => `Pregunta ${i + 1}`) }
  ],
  'Matemàtiques': [
    { category: 'Resolució de Problemes', items: Array.from({ length: 40 }, (_, i) => `Pregunta ${i + 1}`) }
  ],
  'Ciències': [
    { category: 'Coneixement Científic', items: Array.from({ length: 40 }, (_, i) => `Pregunta ${i + 1}`) }
  ]
};

const DEFAULT_ANSWER_KEY: Record<string, Record<string, string>> = {
  'Matemàtiques': { '1': 'c', '2': 'c', '3': 'c', '4': 'b', '5': 'd', '6': 'c', '7': 'd', '8': 'b', '9': 'c', '10': 'd', '11': 'd', '12': 'b', '13': 'b', '14': 'b', '15': 'd', '16': 'a', '17': 'b', '18': 'b', '19': 'c', '20': 'b', '21': 'c', '22': 'c', '23': 'd', '24': 'b', '25': 'a', '26': 'Manual', '27': 'a', '28': 'd', '29': 'a', '30': 'd' },
  'Català': { '1': 'b', '2': 'c', '3': 'a', '4': 'a', '5': 'c', '6': 'b', '7': 'd', '8': 'c', '9': 'b', '10': 'b', '11': 'c', '12': 'b', '13': 'b', '14': 'a', '15': 'c', '16': 'c', '17': 'b', '18': 'a', '19': 'b', '20': 'c', '21': 'd', '22': 'a', '23': 'a', '24': 'd', '25': 'd', '26': 'b', '27': 'b', '28': 'b', '29': 'c', '30': 'b', '31': 'b', '32': 'b', '33': 'b', '34': 'a', '35': 'd', '36': 'c', '37': 'b', '38': 'a', '39': 'a' },
  'Castellà': { '1': 'b', '2': 'c', '3': 'b', '4': 'b', '5': 'b', '6': 'b', '7': 'b', '8': 'b', '9': 'c', '10': 'a', '11': 'a', '12': 'c', '14': 'a', '15': 'b', '16': 'c', '17': 'c', '18': 'd', '19': 'd', '20': 'a', '21': 'd', '22': 'c', '23': 'b', '24': 'c', '26': 'd', '27': 'b', '28': 'a', '29': 'b', '30': 'a', '31': 'c', '32': 'a', '34': 'c', '35': 'b', '36': 'd', '37': 'd', '38': 'b', '39': 'c' },
  'Anglès': { '1': 'b', '2': 'a', '3': 'b', '4': 'b', '5': 'a', '6': 'a', '7': 'b', '8': 'a', '9': 'c', '10': 'a', '11': 'b', '12': 'a', '13': 'c', '14': 'b', '15': 'b', '16': 'a', '17': 'a', '18': 'c', '19': 'b', '20': 'c', '21': 'a', '22': 'b', '23': 'c', '24': 'a', '25': 'b', '26': 'a', '27': 'a', '28': 'b', '29': 'b', '30': 'c', '31': 'a', '32': 'b', '33': 'a', '34': 'a', '35': 'b', '36': 'b', '37': 'c', '38': 'a' },
  'Ciències': { '1': 'd', '2': 'a', '3': 'b', '4.1': 'Sí', '4.2': 'Sí', '4.3': 'Sí', '5': 'c', '6.1': 'Sí', '6.2': 'Sí', '6.3': 'Sí', '7.1': 'Sí', '7.2': 'Sí', '7.3': 'Sí', '8': 'c', '9.1': 'Sí', '9.2': 'Sí', '9.3': 'Sí', '10': 'a', '11': 'b', '12': 'c', '13': 'b', '14': 'c', '15': 'd', '16': 'c', '17': 'b', '18': 'd', '19': 'b', '20': 'b' }
};

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [clientIP, setClientIP] = useState<string>('Unknown IP');
  const [tokenClient, setTokenClient] = useState<TokenClient | null>(null);

  // Data Stores
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [knownUsers, setKnownUsers] = useState<User[]>([]);
  const [sheetConfigs, setSheetConfigs] = useState<SheetConfig[]>([]);
  const [sheetPreview, setSheetPreview] = useState<PreviewData[] | null>(null);
  const [answerKeys, setAnswerKeys] = useState<Record<string, Record<string, string>>>(DEFAULT_ANSWER_KEY);

  // App State
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(false);

  // UI State
  const [showImport, setShowImport] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // Selection State
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [activeStudentIndex, setActiveStudentIndex] = useState(0);

  // Touch State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const groupScrollRef = useRef<HTMLDivElement>(null);
  const subjectScrollRef = useRef<HTMLDivElement>(null);

  // --- INITIAL DATA FETCH ---
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [g, sub, stu, comp, evals, u, l] = await Promise.all([
        api.getGroups(),
        api.getSubjects(),
        api.getStudents(),
        api.getCompetencies(),
        api.getEvaluations(),
        api.getUsers(),
        api.getLogs()
      ]);
      setGroups(g);
      setSubjects(sub);
      setStudents(stu);
      setCompetencies(comp);
      setEvaluations(evals);
      setKnownUsers(u);
      setLogs(l);

      if (g.length > 0 && !activeGroupId) {
        setActiveGroupId(g[0].id);
      }
    } catch (err) {
      console.error("Failed to load initial data", err);
    } finally {
      setLoading(false);
    }
  }, [activeGroupId]);

  useEffect(() => {
    loadData();
    // Fetch IP
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setClientIP(data.ip))
      .catch(() => setClientIP('Hidden'));

    // Local storage only for non-critical UI preferences if needed, or answer keys/configs if not in DB
    const storedSheets = localStorage.getItem('sheetConfigs');
    if (storedSheets) setSheetConfigs(JSON.parse(storedSheets));

    // Check persistent session
    const storedCurrentUser = localStorage.getItem('currentUser');
    if (storedCurrentUser) {
      setUser(JSON.parse(storedCurrentUser));
    }
  }, []); // Run once on mount

  // Sync active subject
  const activeGroupSubjects = subjects.filter(s => s.groupId === activeGroupId);
  useEffect(() => {
    if (activeGroupId && (!activeSubjectId || !activeGroupSubjects.find(s => s.id === activeSubjectId))) {
      if (activeGroupSubjects.length > 0) {
        setActiveSubjectId(activeGroupSubjects[0].id);
      } else {
        setActiveSubjectId(null);
      }
    }
  }, [activeGroupId, activeGroupSubjects, activeSubjectId]);

  // Log Action Wrapper
  const logAction = useCallback(async (action: AuditLog['action'], details: string, overrideUserEmail?: string) => {
    const newLog: AuditLog = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      userEmail: overrideUserEmail || user?.email || 'Anonymous',
      action,
      details,
      ip: clientIP
    };
    try {
      await api.logAction(newLog);
      setLogs(prev => [newLog, ...prev]);
    } catch (e) { console.error("Log failed", e); }
  }, [user, clientIP]);

  // --- GOOGLE AUTH ---
  useEffect(() => {
    if (!user) {
      const initializeGoogleLogin = () => {
        if (window.google) {
          try {
            window.google.accounts.id.initialize({
              client_id: GOOGLE_CLIENT_ID,
              callback: handleCredentialResponse,
              auto_select: false
            });
            const buttonDiv = document.getElementById("googleSignInDiv");
            if (buttonDiv) {
              window.google.accounts.id.renderButton(
                buttonDiv,
                { theme: "outline", size: "large", width: "280", text: "signin_with" }
              );
            }
            const client = window.google.accounts.oauth2.initTokenClient({
              client_id: GOOGLE_CLIENT_ID,
              scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
              callback: () => { },
            });
            setTokenClient(client);
          } catch (e) { console.error("GSI Init Error", e); }
        } else {
          setTimeout(initializeGoogleLogin, 500);
        }
      };
      initializeGoogleLogin();
    }
  }, [user]);

  const handleCredentialResponse = async (response: any) => {
    const payload = decodeJwt(response.credential);
    if (payload) {
      if (payload.hd === 'insbitacola.cat' || payload.email.endsWith('@insbitacola.cat')) {
        const email = payload.email;
        let role: 'admin' | 'user' = 'user';

        // Check against known users from DB
        const existingUser = knownUsers.find(u => u.email === email);
        if (existingUser) {
          if (existingUser.isBlocked) {
            setAuthError("Usuari bloquejat.");
            return;
          }
          role = existingUser.role;
        } else if (email === ADMIN_EMAIL) {
          role = 'admin';
        }

        const currentUser: User = {
          name: payload.name,
          email: email,
          picture: payload.picture,
          role: role,
          lastLogin: new Date().toISOString()
        };

        // Sync user to DB
        try {
          await api.syncUser(currentUser);
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
          setUser(currentUser);
          setAuthError(null);
          logAction('LOGIN', `Login successful as ${role}`, email);
          loadData(); // Refresh data on login to ensure we have latest permissions/data
        } catch (e) {
          console.error("Login sync failed", e);
          setAuthError("Error de connexió al servidor.");
        }
      } else {
        setAuthError("Accés restringit a insbitacola.cat");
      }
    }
  };

  const handleLogout = () => {
    logAction('LOGOUT', 'Logout');
    localStorage.removeItem('currentUser');
    setUser(null);
    setAuthError(null);
    setShowAdmin(false);
  };

  // --- ACTIONS ---

  const handleImport = async (dataList: ImportData[]) => {
    // Process imports sequentially to ensure IDs match locally if needed, 
    // but simplest is to fire create calls.
    // NOTE: This could be slow for large imports. Ideally backend handles bulk import.
    // For now, loop calls.

    setLoading(true);
    try {
      let firstGroupId = null;
      let firstSubjectId = null;

      for (const data of dataList) {
        // Create Group
        const groupId = uuidv4();
        await api.createGroup({ id: groupId, name: data.groupName });
        if (!firstGroupId) firstGroupId = groupId;

        // Create Subject
        const subjectId = uuidv4();
        await api.createSubject({ id: subjectId, name: data.subjectName, groupId });
        if (!firstSubjectId) firstSubjectId = subjectId;

        // Create Students
        for (const name of data.students) {
          await api.createStudent({ id: uuidv4(), name, groupId });
        }

        // Create Competencies
        for (const desc of data.competencies) {
          await api.createCompetency({ id: uuidv4(), description: desc, subjectId });
        }
      }

      logAction('IMPORT', `Imported ${dataList.length} groups`);
      await loadData();
      if (firstGroupId) {
        setActiveGroupId(firstGroupId);
        if (firstSubjectId) setActiveSubjectId(firstSubjectId);
      }

    } catch (e) {
      console.error("Import failed", e);
      alert("Error durant la importació. Comprova la consola.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEvaluation = async (competencyId: string, level: CompetencyLevel) => {
    if (!currentStudent) return;
    const newEval: Evaluation = {
      studentId: currentStudent.id,
      competencyId,
      level,
      // preserve other fields if we had them, but here we only update level in UI usually
    };

    // Optimistic Update
    setEvaluations(prev => {
      const idx = prev.findIndex(e => e.studentId === currentStudent.id && e.competencyId === competencyId);
      if (idx >= 0) {
        const up = [...prev];
        up[idx] = { ...up[idx], level };
        return up;
      }
      return [...prev, newEval];
    });

    try {
      await api.updateEvaluation(newEval);
      logAction('UPDATE_EVAL', `Eval updated for ${currentStudent.name}`);
    } catch (e) {
      console.error("Eval update failed", e);
      // Revert optimistic update? Or just alert.
    }
  };

  // Admin Actions
  const toggleBlockUser = async (email: string) => {
    const userToMod = knownUsers.find(u => u.email === email);
    if (!userToMod) return;
    try {
      await api.updateUser(email, { isBlocked: !userToMod.isBlocked });
      setKnownUsers(prev => prev.map(u => u.email === email ? { ...u, isBlocked: !u.isBlocked } : u));
    } catch (e) { console.error(e); }
  };

  const toggleUserRole = async (email: string) => {
    const userToMod = knownUsers.find(u => u.email === email);
    if (!userToMod) return;
    const newRole = userToMod.role === 'admin' ? 'user' : 'admin';
    try {
      await api.updateUser(email, { role: newRole });
      setKnownUsers(prev => prev.map(u => u.email === email ? { ...u, role: newRole } : u));
      if (user?.email === email) setUser(prev => prev ? ({ ...prev, role: newRole }) : null);
    } catch (e) { console.error(e); }
  };

  const saveSheetConfigs = (configs: SheetConfig[]) => {
    setSheetConfigs(configs);
    localStorage.setItem('sheetConfigs', JSON.stringify(configs));
  };

  // Sheets Sync (Reduced for brevity, similar to original but updating evaluations via API)
  const handleFetchSheets = () => {
    if (!tokenClient) return;
    tokenClient.callback = async (resp: any) => {
      if (resp.error) return;
      const accessToken = resp.access_token;
      const previews: PreviewData[] = [];
      for (const config of sheetConfigs) {
        if (!config.sheetId) continue;
        try {
          const rawValues = await fetchSheetValues(config.sheetId, accessToken);
          previews.push({ subjectName: config.subjectName, rawValues });
        } catch (e) { console.error(e); }
      }
      setSheetPreview(previews);
    };
    tokenClient.requestAccessToken({ prompt: '' });
  };

  const handleConfirmSync = async () => {
    if (!sheetPreview) return;
    setLoading(true);
    let count = 0;
    try {
      for (const preview of sheetPreview) {
        const targetSubjects = subjects.filter(s => s.name.toLowerCase().includes(preview.subjectName.toLowerCase()));
        for (const sub of targetSubjects) {
          const { newEvaluations } = processSheetData(
            preview.rawValues,
            students.filter(s => s.groupId === sub.groupId),
            competencies,
            sub.id,
            sub.name,
            answerKeys
          );

          for (const ev of newEvaluations) {
            await api.updateEvaluation(ev);
            count++;
          }
        }
      }
      alert(`Sincronització completada: ${count} notes.`);
      setSheetPreview(null);
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAnswerKey = (csv: string) => {
    const newKeys = parseAnswerKeyCSV(csv);
    setAnswerKeys(prev => ({ ...prev, ...newKeys }));
    // TODO: Save to DB via API if we implement answer_keys endpoint
    return true;
  };

  // Navigation
  const activeSubject = subjects.find(s => s.id === activeSubjectId);
  const subjectStudents = activeGroupId ? students.filter(s => s.groupId === activeGroupId) : [];
  const currentStudent = subjectStudents[activeStudentIndex];

  const handleNext = () => {
    if (activeStudentIndex < subjectStudents.length - 1) setActiveStudentIndex(p => p + 1);
  };
  const handlePrev = () => {
    if (activeStudentIndex > 0) setActiveStudentIndex(p => p - 1);
  };

  const subjectCompetencies = useMemo(() => {
    if (!activeSubjectId) return [];
    let comps = competencies.filter(c => c.subjectId === activeSubjectId);
    const activeSubName = subjects.find(s => s.id === activeSubjectId)?.name || '';
    const structureKey = Object.keys(COMPETENCIES_STRUCTURE).find(k => activeSubName.includes(k));
    if (structureKey) {
      const allowedCategories = COMPETENCIES_STRUCTURE[structureKey as keyof typeof COMPETENCIES_STRUCTURE].map(s => s.category);
      const allowedItems = COMPETENCIES_STRUCTURE[structureKey as keyof typeof COMPETENCIES_STRUCTURE].flatMap(s => s.items);
      comps = comps.filter(c => {
        if (c.category === 'Competència discursiva' || c.category === 'Competència lingüística') {
          return allowedItems.includes(c.description);
        }
        return allowedCategories.includes(c.category || '');
      });
    }
    return comps;
  }, [activeSubjectId, competencies, subjects]);

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const onTouchMove = (e: React.TouchEvent) => { setTouchEnd(e.targetTouches[0].clientX); };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) handleNext();
    if (distance < -minSwipeDistance) handlePrev();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center">
          <h1 className="text-2xl font-black text-gray-800 mb-2">Avaluació Competencial</h1>
          <p className="text-gray-500 mb-6">Institut Bitacola</p>
          <div id="googleSignInDiv" className="flex justify-center min-h-[44px]"></div>
          {authError && <div className="mt-4 text-red-600 font-bold">{authError}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-slate-800 font-sans flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="bg-white z-30 flex-shrink-0 shadow-sm">
        <div className="max-w-3xl mx-auto flex justify-between items-center px-4 py-2 border-b">
          <div className="font-bold text-indigo-900">Avaluació {loading && <span className="text-xs text-gray-400 ml-2">Carregant...</span>}</div>
          <div className="flex gap-2">
            {user.role === 'admin' && <button onClick={() => setShowAdmin(true)} className="text-sm bg-gray-100 px-3 py-1 rounded">Admin</button>}
            <button onClick={() => setShowReport(true)} className="text-sm bg-indigo-50 text-indigo-700 px-3 py-1 rounded">Informe</button>
            <button onClick={() => setShowImport(true)} className="text-sm bg-gray-100 px-3 py-1 rounded">Import</button>
            <img src={user.picture} alt="User" className="w-8 h-8 rounded-full cursor-pointer" onClick={handleLogout} />
          </div>
        </div>
        {/* GROUPS SCROLL */}
        <div className="max-w-3xl mx-auto px-2 overflow-x-auto hide-scrollbar flex py-2 bg-white">
          {groups.map(g => (
            <button key={g.id} onClick={() => { setActiveGroupId(g.id); setActiveStudentIndex(0); }}
              className={`px-4 py-2 whitespace-nowrap text-sm font-bold ${activeGroupId === g.id ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>
              {g.name}
            </button>
          ))}
        </div>
        {/* SUBJECTS SCROLL */}
        {activeGroupSubjects.length > 0 && (
          <div className="bg-gray-50 py-2 border-t">
            <div className="max-w-3xl mx-auto px-4 overflow-x-auto hide-scrollbar flex gap-2">
              {activeGroupSubjects.map(s => (
                <button key={s.id} onClick={() => setActiveSubjectId(s.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold ${activeSubjectId === s.id ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600'}`}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto bg-gray-50 pb-24 relative" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div className="max-w-3xl mx-auto px-2 py-4">
          {currentStudent && activeSubject ? (
            <StudentCard
              student={currentStudent}
              competencies={subjectCompetencies}
              subjectName={activeSubject.name}
              evaluations={evaluations}
              onUpdateEvaluation={handleUpdateEvaluation}
              onNext={handleNext}
              onPrev={handlePrev}
              isFirst={activeStudentIndex === 0}
              isLast={activeStudentIndex === subjectStudents.length - 1}
              answerKeys={answerKeys}
            />
          ) : (
            <div className="text-center text-gray-400 mt-20">Selecciona grup i matèria</div>
          )}
        </div>
      </main>

      {/* MODALS */}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={handleImport} />}
      {showReport && activeSubject && <GlobalReport onClose={() => setShowReport(false)} students={subjectStudents} competencies={subjectCompetencies} evaluations={evaluations} groupName={`${groups.find(g => g.id === activeGroupId)?.name} - ${activeSubject.name}`} />}
      {showAdmin && <AdminDashboard onClose={() => setShowAdmin(false)} users={knownUsers} logs={logs} onToggleBlockUser={toggleBlockUser} onToggleUserRole={toggleUserRole} currentUserEmail={user.email} groups={groups} subjects={subjects} students={students} competencies={competencies} evaluations={evaluations} sheetConfigs={sheetConfigs} onSaveSheetConfigs={saveSheetConfigs} onSyncSheets={handleFetchSheets} previewData={sheetPreview} onConfirmSync={handleConfirmSync} onCancelPreview={() => setSheetPreview(null)} onUpdateAnswerKeys={handleUpdateAnswerKey} />}
    </div>
  );
};

export default App;
