
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ExportReport } from './components/ExportReport';
import { v4 as uuidv4 } from 'uuid';
import ImportModal from './components/ImportModal';
import StudentCard from './components/StudentCard';
import GlobalReport from './components/GlobalReport';
import AdminDashboard from './components/AdminDashboard';
import { Group, Subject, Student, Competency, Evaluation, ImportData, CompetencyLevel, User, AuditLog, SheetConfig, TokenClient, PreviewData } from './types';
import { fetchSheetValues, processSheetData, parseAnswerKeyCSV } from './services/sheetsService';

// --- CONFIGURACIÓ ---
// DEFINEIX EL TEU GOOGLE CLIENT ID AQUÍ SI NO FAS SERVIR .ENV
const GOOGLE_CLIENT_ID = "360338465758-dh2fdld2geg2ac8r0qigr81kvm8ek857.apps.googleusercontent.com";
const ADMIN_EMAIL = "benet.andujar@insbitacola.cat";

// Default Answer Key Data
const DEFAULT_ANSWER_KEY: Record<string, Record<string, string>> = {
  'Matemàtiques': {
    '1': 'c', '2': 'c', '3': 'c', '4': 'b', '5': 'd', '6': 'c', '7': 'd', '8': 'b', '9': 'c', '10': 'd',
    '11': 'd', '12': 'b', '13': 'b', '14': 'b', '15': 'd', '16': 'a', '17': 'b', '18': 'b', '19': 'c', '20': 'b',
    '21': 'c', '22': 'c', '23': 'd', '24': 'b', '25': 'a', '26': 'Manual', '27': 'a', '28': 'd', '29': 'a', '30': 'd'
  },
  'Català': {
    '1': 'b', '2': 'c', '3': 'a', '4': 'a', '5': 'c', '6': 'b', '7': 'd', '8': 'c', '9': 'b', '10': 'b',
    '11': 'c', '12': 'b', '13': 'b', '14': 'a', '15': 'c', '16': 'c', '17': 'b', '18': 'a', '19': 'b', '20': 'c',
    '21': 'd', '22': 'a', '23': 'a', '24': 'd', '25': 'd', '26': 'b', '27': 'b', '28': 'b', '29': 'c', '30': 'b',
    '31': 'b', '32': 'b', '33': 'b', '34': 'a', '35': 'd', '36': 'c', '37': 'b', '38': 'a', '39': 'a'
  },
  'Castellà': {
    '1': 'b', '2': 'c', '3': 'b', '4': 'b', '5': 'b', '6': 'b', '7': 'b', '8': 'b', '9': 'c', '10': 'a',
    '11': 'a', '12': 'c', '14': 'a', '15': 'b', '16': 'c', '17': 'c', '18': 'd', '19': 'd', '20': 'a',
    '21': 'd', '22': 'c', '23': 'b', '24': 'c', '26': 'd', '27': 'b', '28': 'a', '29': 'b', '30': 'a',
    '31': 'c', '32': 'a', '34': 'c', '35': 'b', '36': 'd', '37': 'd', '38': 'b', '39': 'c'
  },
  'Anglès': {
    '1': 'b', '2': 'a', '3': 'b', '4': 'b', '5': 'a', '6': 'a', '7': 'b', '8': 'a', '9': 'c', '10': 'a',
    '11': 'b', '12': 'a', '13': 'c', '14': 'b', '15': 'b', '16': 'a', '17': 'a', '18': 'c', '19': 'b', '20': 'c',
    '21': 'a', '22': 'b', '23': 'c', '24': 'a', '25': 'b', '26': 'a', '27': 'a', '28': 'b', '29': 'b', '30': 'c',
    '31': 'a', '32': 'b', '33': 'a', '34': 'a', '35': 'b', '36': 'b', '37': 'c', '38': 'a'
  },
  'Ciències': {
    '1': 'd', '2': 'a', '3': 'b', '4.1': 'Sí', '4.2': 'Sí', '4.3': 'Sí', '5': 'c',
    '6.1': 'Sí', '6.2': 'Sí', '6.3': 'Sí', '7.1': 'Sí', '7.2': 'Sí', '7.3': 'Sí', '8': 'c',
    '9.1': 'Sí', '9.2': 'Sí', '9.3': 'Sí', '10': 'a', '11': 'b', '12': 'c', '13': 'b',
    '14': 'c', '15': 'd', '16': 'c', '17': 'b', '18': 'd', '19': 'b', '20': 'b'
  }
};

// Simple ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

// --- AUTH UTILS ---
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: () => void;
        };
        oauth2: {
          initTokenClient: (config: any) => TokenClient;
        }
      };
    };
  }
}

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

// --- SEED DATA CONSTANTS ---

const SEED_STUDENTS_RAW = `1A - Arribas Bonilla, Neizan	neizan.arribas@insbitacola.cat
1A - Ballester Altabella, Lola	lola.ballester@insbitacola.cat
1A - Cano Espinal, Abdiel Josue	abdiel.cano@insbitacola.cat
1A - Clarà Cara, Max	max.clara@insbitacola.cat
1A - Cumelles Galvez, Xavier	xavier.cumelles@insbitacola.cat
1A - Cunha Morote, Lucas	lucas.cunha@insbitacola.cat
1A - Del Pino Gerbolés, Olívia	olivia.delpino@insbitacola.cat
1A - Fluja Sánchez, Delia	delia.fluja@insbitacola.cat
1A - Galan del Pino, Sheila	sheila.galan@insbitacola.cat
1A - Giralt Salguero, Aina	aina.giralt@insbitacola.cat
1A - González Fonts, Jan	jan.gonzalez@insbitacola.cat
1A - Ilie , Maria Dayana	dayana.ilie@insbitacola.cat
1A - Navarro Giménez, Vera	vera.navarro@insbitacola.cat
1A - Páez Dueñas, Irene	irene.paez@insbitacola.cat
1A - Quirós Solorzano, Lua	lua.quiros@insbitacola.cat
1A - Rama Morales, Laura	laura.rama@insbitacola.cat
1A - Real Frutos, Albert	albert.real@insbitacola.cat
1A - Rodríguez Lozano, Hugo	hugo.rodriguez@insbitacola.cat
1A - Sanz Riosalido, Lucía	lucia.sanz@insbitacola.cat
1B - Carrillo Garcia, Antonio David	antonio.carrillo@insbitacola.cat
1B - Gómez-Lamadrid Valle, Héctor	hector.gomez@insbitacola.cat
1B - González Baño, Romeo	romeo.gonzalez@insbitacola.cat
1B - Hernández González, Victor	victor.hernandez@insbitacola.cat
1B - Huescar Cerezo, Uxue	uxue.huescar@insbitacola.cat
1B - Jiang , Hang	hang.jiang@insbitacola.cat
1B - Lainez Perez, Júlia	julia.lainez@insbitacola.cat
1B - Moisan Marginean, Karina	karina.moisan@insbitacola.cat
1B - Pardo López, Nayara	nayara.pardo@insbitacola.cat
1B - Pérez Gómez, Hugo	hugo.perez@insbitacola.cat
1B - Ramírez Alunda, Aithana Yanelly	aithana.ramirez@insbitacola.cat
1B - Rodríguez Catena, Alex	alex.rodriguez1@insbitacola.cat
1B - Romera Hidalgo, Ilian	ilian.romera@insbitacola.cat
1B - Sánchez Pozo, Hugo	hugo.sanchez@insbitacola.cat
1B - Sánchez Soto, Daniela	daniela.sanchez@insbitacola.cat
1B - Suazo Colomer, Aisha Nahomi	aisha.suazo@insbitacola.cat
1B - Taus Escriche, Nahla	nahla.taus@insbitacola.cat
1B - Villanova Valbuena, Kiara	kiara.villanova@insbitacola.cat
1C - Álvarez Hernández, Hugo	hugo.alvarez@insbitacola.cat
1C - Cuevas Gálvez, Leire	leire.cuevas@insbitacola.cat
1C - Da Sousa Ruiz, Ona	ona.dasousa@insbitacola.cat
1C - Ferrer Rodríguez, Leo	leo.ferrer@insbitacola.cat
1C - Garcia Velasco, Francisco	francisco.garcia@insbitacola.cat
1C - Herrero Cosialls, Dídac	didac.herrero@insbitacola.cat
1C - Jiménez Gàzquez, Daniela	daniela.jimenez@insbitacola.cat
1C - Liesa Font, Laia	laia.liesa@insbitacola.cat
1C - Mañas Aguilera, Judith	judith.manas@insbitacola.cat
1C - Molón Moreno, Mia	mia.molon@insbitacola.cat
1C - Muñoz Rodriguez, David	david.munoz@insbitacola.cat
1C - Olavide Reina, Thiago	thiago.olavide@insbitacola.cat
1C - Olivé Capel, Emma	emma.olive@insbitacola.cat
1C - Patón González, Alma	alma.paton@insbitacola.cat
1C - Rincon Fernandez, Yorkellis Eliza	yorkellis.rincon@insbitacola.cat
1C - Rodríguez Blanco, Alberto	alberto.rodriguez@insbitacola.cat
1C - Ruzafa Mesa, Eric	eric.ruzafa@insbitacola.cat
1C - Sánchez Fernández, Roma	roma.sanchez@insbitacola.cat
1C - Shahzad , Muhammad Zohaib	muhammad.shahzad@insbitacola.cat`;

// Extended Subjects list including new scientific/math subjects
const PREDEFINED_SUBJECTS = ['Català', 'Castellà', 'Anglès', 'Matemàtiques', 'Ciències'];

// STRICT COMPETENCY STRUCTURE
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

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [clientIP, setClientIP] = useState<string>('Unknown IP');
  const [tokenClient, setTokenClient] = useState<TokenClient | null>(null);

  // Data Stores for Admin
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

  // Refs for scroll containers
  const groupScrollRef = useRef<HTMLDivElement>(null);
  const subjectScrollRef = useRef<HTMLDivElement>(null);

  // --- LOGGING SYSTEM & INIT ---
  useEffect(() => {
    // Fetch IP on mount
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setClientIP(data.ip))
      .catch(() => setClientIP('Hidden'));

    // Load Logs and Users from Storage
    const storedLogs = localStorage.getItem('auditLogs');
    if (storedLogs) setLogs(JSON.parse(storedLogs));

    const storedUsers = localStorage.getItem('knownUsers');
    if (storedUsers) setKnownUsers(JSON.parse(storedUsers));

    const storedSheets = localStorage.getItem('sheetConfigs');
    if (storedSheets) setSheetConfigs(JSON.parse(storedSheets));

    const storedAnswerKeys = localStorage.getItem('answerKeys');
    if (storedAnswerKeys) setAnswerKeys(JSON.parse(storedAnswerKeys));

    // REHYDRATE USER SESSION
    const storedCurrentUser = localStorage.getItem('currentUser');
    if (storedCurrentUser) {
      try {
        const persistedUser = JSON.parse(storedCurrentUser);
        setUser(persistedUser);
        // Check if this persisted user is blocked in knownUsers (fresh check)
        if (storedUsers) {
          const known = JSON.parse(storedUsers).find((u: User) => u.email === persistedUser.email);
          if (known && known.isBlocked) {
            setUser(null);
            setAuthError("Sessió tancada: Usuari bloquejat.");
            localStorage.removeItem('currentUser');
          }
        }
      } catch (e) {
        console.error("Error restoring session", e);
        localStorage.removeItem('currentUser');
      }
    }

  }, []);

  // --- AUTO-RECONCILE COMPETENCIES (Updated to fix missing items) ---
  useEffect(() => {
    if (subjects.length === 0) return;

    setCompetencies(prevComps => {
      const newComps = [...prevComps];
      let hasChanges = false;

      subjects.forEach(sub => {
        // Normalize subject name lookup (e.g. "1r A - Anglès" -> matches "Anglès")
        const structureKey = Object.keys(COMPETENCIES_STRUCTURE).find(k =>
          sub.name.toLowerCase().includes(k.toLowerCase())
        );
        const structure = structureKey ? COMPETENCIES_STRUCTURE[structureKey as keyof typeof COMPETENCIES_STRUCTURE] : null;

        if (structure) {
          structure.forEach(section => {
            section.items.forEach(itemDesc => {
              // Check if competency exists for this subject + description + category
              const exists = newComps.some(c =>
                c.subjectId === sub.id &&
                c.description === itemDesc &&
                c.category === section.category
              );

              if (!exists) {
                newComps.push({
                  id: generateId(),
                  description: itemDesc,
                  category: section.category,
                  subjectId: sub.id
                });
                hasChanges = true;
              }
            });
          });
        }
      });

      if (hasChanges) {
        console.log("Auto-Reconcile: Generated missing competencies.");
        return newComps;
      }
      return prevComps;
    });
  }, [subjects, activeSubjectId]); // Added activeSubjectId to force check on switch

  const logAction = useCallback((action: AuditLog['action'], details: string, overrideUserEmail?: string) => {
    const newLog: AuditLog = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      userEmail: overrideUserEmail || user?.email || 'Anonymous',
      action,
      details,
      ip: clientIP
    };

    setLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 1000); // Keep last 1000 logs
      localStorage.setItem('auditLogs', JSON.stringify(updated));
      return updated;
    });
  }, [user, clientIP]);

  // Google Login Initialization
  useEffect(() => {
    if (!user) {
      const initializeGoogleLogin = () => {
        if (window.google) {
          try {
            // ID Client (Sign In)
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

            // Token Client (For Sheets API Access)
            const client = window.google.accounts.oauth2.initTokenClient({
              client_id: GOOGLE_CLIENT_ID,
              scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
              callback: () => { }, // Overridden in call
            });
            setTokenClient(client);

          } catch (e) {
            console.error("GSI Init Error", e);
          }
        } else {
          setTimeout(initializeGoogleLogin, 500);
        }
      };
      initializeGoogleLogin();
    }
  }, [user]);

  const handleCredentialResponse = (response: any) => {
    const payload = decodeJwt(response.credential);
    if (payload) {
      // DOMAIN RESTRICTION CHECK
      if (payload.hd === 'insbitacola.cat' || payload.email.endsWith('@insbitacola.cat')) {

        const email = payload.email;
        let role: 'admin' | 'user' = 'user';
        const existingUser = knownUsers.find(u => u.email === email);

        if (existingUser) {
          if (existingUser.isBlocked) {
            setAuthError("Aquest usuari ha estat bloquejat per l'administrador.");
            return;
          }
          role = existingUser.role;
        } else {
          if (email === ADMIN_EMAIL) {
            role = 'admin';
          }
        }

        if (email === ADMIN_EMAIL) {
          role = 'admin';
        }

        const currentUser: User = {
          name: payload.name,
          email: email,
          picture: payload.picture,
          role: role,
          lastLogin: new Date().toISOString()
        };

        // Save persistently
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        updateKnownUsers(currentUser);
        setUser(currentUser);
        setAuthError(null);
        logAction('LOGIN', `Inici de sessió exitós com a ${role}`, email);
      } else {
        setAuthError(`L'accés està restringit exclusivament al domini insbitacola.cat.`);
        logAction('LOGIN', `Intent d'accés denegat (domini incorrecte): ${payload.email}`, 'System');
      }
    } else {
      setAuthError("Error en processar la identificació.");
    }
  };

  const updateKnownUsers = (userToUpdate: User) => {
    setKnownUsers((prev: User[]) => {
      const index = prev.findIndex(u => u.email === userToUpdate.email);
      let newUsers: User[];
      if (index !== -1) {
        newUsers = [...prev];
        // Update picture and last login, preserve block status if not explicitly changed here
        newUsers[index] = {
          ...prev[index],
          ...userToUpdate,
          role: userToUpdate.role
        };
      } else {
        newUsers = [...prev, userToUpdate];
      }
      localStorage.setItem('knownUsers', JSON.stringify(newUsers));
      return newUsers;
    });
  };

  const handleLogout = () => {
    if (user) logAction('LOGOUT', 'Tancament de sessió');
    localStorage.removeItem('currentUser'); // Clear persistent session
    setUser(null);
    setAuthError(null);
    setShowAdmin(false);

    setTimeout(() => {
      if (window.google) {
        const buttonDiv = document.getElementById("googleSignInDiv");
        if (buttonDiv) {
          try {
            window.google.accounts.id.renderButton(
              buttonDiv,
              { theme: "outline", size: "large", width: "280", text: "signin_with" }
            );
          } catch (e) { }
        }
      }
    }, 100);
  };

  const toggleBlockUser = (targetEmail: string) => {
    if (user?.role !== 'admin') return;
    setKnownUsers(prev => {
      const updated = prev.map(u => {
        if (u.email === targetEmail) {
          const newState = !u.isBlocked;
          logAction('ADMIN_ACTION', `${newState ? 'Bloquejat' : 'Desbloquejat'} usuari: ${targetEmail}`);
          return { ...u, isBlocked: newState };
        }
        return u;
      });
      localStorage.setItem('knownUsers', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleUserRole = (targetEmail: string) => {
    if (user?.role !== 'admin') return;
    setKnownUsers(prev => {
      const updated = prev.map(u => {
        if (u.email === targetEmail) {
          const newRole: 'admin' | 'user' = u.role === 'admin' ? 'user' : 'admin';
          logAction('ADMIN_ACTION', `Canvi de rol per ${targetEmail}: ${u.role} -> ${newRole}`);
          if (user.email === targetEmail) {
            const updatedUser = { ...user, role: newRole };
            setUser(updatedUser);
            localStorage.setItem('currentUser', JSON.stringify(updatedUser)); // Update persistent session too
            if (newRole === 'user') setShowAdmin(false);
          }
          return { ...u, role: newRole };
        }
        return u;
      });
      localStorage.setItem('knownUsers', JSON.stringify(updated));
      return updated;
    });
  };

  const seedDatabase = () => {
    const newGroups: Group[] = [];
    const newSubjects: Subject[] = [];
    const newStudents: Student[] = [];
    const newCompetencies: Competency[] = [];

    const lines = SEED_STUDENTS_RAW.split('\n');
    const groupMap = new Map<string, string>();

    lines.forEach(line => {
      if (!line.trim()) return;
      const parts = line.split('\t');
      const idInfo = parts[0].split(' - ');

      if (idInfo.length < 2) return;

      const rawGroup = idInfo[0].trim();
      const studentName = idInfo[1].trim();
      const email = parts[1]?.trim() || '';
      const displayGroupName = rawGroup.replace(/(\d)([A-Z])/, '$1r $2');

      let groupId = groupMap.get(displayGroupName);
      if (!groupId) {
        groupId = generateId();
        groupMap.set(displayGroupName, groupId);
        newGroups.push({ id: groupId, name: displayGroupName });
      }

      newStudents.push({
        id: generateId(),
        name: studentName,
        email: email,
        groupId: groupId
      });
    });

    newGroups.forEach(group => {
      PREDEFINED_SUBJECTS.forEach(subjName => {
        const subjectId = generateId();
        newSubjects.push({
          id: subjectId,
          name: subjName,
          groupId: group.id
        });
        const structure = COMPETENCIES_STRUCTURE[subjName as keyof typeof COMPETENCIES_STRUCTURE];
        if (structure) {
          structure.forEach(section => {
            section.items.forEach(itemDesc => {
              newCompetencies.push({
                id: generateId(),
                description: itemDesc,
                category: section.category,
                subjectId: subjectId
              });
            });
          });
        }
      });
    });

    setGroups(newGroups);
    setStudents(newStudents);
    setSubjects(newSubjects);
    setCompetencies(newCompetencies);
    setEvaluations([]);

    if (newGroups.length > 0) {
      setActiveGroupId(newGroups[0].id);
      const firstSub = newSubjects.find(s => s.groupId === newGroups[0].id);
      if (firstSub) setActiveSubjectId(firstSub.id);
    }
  };

  useEffect(() => {
    const savedData = localStorage.getItem('gradeApp_v3');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setGroups(parsed.groups || []);
        setSubjects(parsed.subjects || []);
        setStudents(parsed.students || []);
        setCompetencies(parsed.competencies || []);
        setEvaluations(parsed.evaluations || []);

        if (parsed.groups?.length > 0) {
          setActiveGroupId(parsed.groups[0].id);
          const firstSub = parsed.subjects?.find((s: Subject) => s.groupId === parsed.groups[0].id);
          if (firstSub) setActiveSubjectId(firstSub.id);
        }
      } catch (e) {
        console.error("Failed to load saved data");
        seedDatabase();
      }
    } else {
      seedDatabase();
    }
  }, []);

  useEffect(() => {
    if (groups.length > 0) {
      const data = { groups, subjects, students, competencies, evaluations };
      localStorage.setItem('gradeApp_v3', JSON.stringify(data));
    }
  }, [groups, subjects, students, competencies, evaluations]);

  const activeGroupSubjects = subjects.filter(s => s.groupId === activeGroupId);

  useEffect(() => {
    if (activeGroupId && (!activeSubjectId || !activeGroupSubjects.find(s => s.id === activeSubjectId))) {
      if (activeGroupSubjects.length > 0) {
        setActiveSubjectId(activeGroupSubjects[0].id);
        logAction('VIEW_GROUP', `Ha entrat al grup ${groups.find(g => g.id === activeGroupId)?.name}`);
      } else {
        setActiveSubjectId(null);
      }
    }
  }, [activeGroupId, activeGroupSubjects, activeSubjectId, groups, logAction]);

  const activeSubject = subjects.find(s => s.id === activeSubjectId);

  // FILTER COMPETENCIES STRICTLY BASED ON STRUCTURE FOR KNOWN SUBJECTS
  const subjectCompetencies = useMemo(() => {
    if (!activeSubjectId) return [];

    let comps = competencies.filter(c => c.subjectId === activeSubjectId);

    // Strict filtering to ensure only allowed competencies appear (removing old "zombie" entries)
    const activeSubName = subjects.find(s => s.id === activeSubjectId)?.name || '';
    const structureKey = Object.keys(COMPETENCIES_STRUCTURE).find(k => activeSubName.includes(k));

    if (structureKey) {
      const allowedCategories = COMPETENCIES_STRUCTURE[structureKey as keyof typeof COMPETENCIES_STRUCTURE].map(s => s.category);
      const allowedItems = COMPETENCIES_STRUCTURE[structureKey as keyof typeof COMPETENCIES_STRUCTURE].flatMap(s => s.items);

      comps = comps.filter(c => {
        // Special logic for Manual Categories: Strict Item Match
        if (c.category === 'Competència discursiva' || c.category === 'Competència lingüística') {
          return allowedItems.includes(c.description);
        }
        // For Test/Import categories or others, check category existence
        return allowedCategories.includes(c.category || '');
      });
    }

    return comps;
  }, [activeSubjectId, competencies, subjects]);

  const subjectStudents = activeGroupId
    ? students.filter(s => s.groupId === activeGroupId)
    : [];

  const currentStudent = subjectStudents[activeStudentIndex];

  const handleImport = (dataList: ImportData[]) => {
    const newGroups: Group[] = [];
    const newSubjects: Subject[] = [];
    const newStudents: Student[] = [];
    const newCompetencies: Competency[] = [];
    let firstNewGroupId: string | null = null;
    let firstNewSubjectId: string | null = null;

    dataList.forEach((data, index) => {
      const groupId = generateId();
      const subjectId = generateId();
      if (index === 0) {
        firstNewGroupId = groupId;
        firstNewSubjectId = subjectId;
      }
      newGroups.push({ id: groupId, name: data.groupName });
      newSubjects.push({ id: subjectId, name: data.subjectName, groupId });
      data.students.forEach(name => {
        newStudents.push({ id: generateId(), name, groupId });
      });
      data.competencies.forEach(desc => {
        newCompetencies.push({ id: generateId(), description: desc, subjectId });
      });
    });

    setGroups(prev => [...prev, ...newGroups]);
    setSubjects(prev => [...prev, ...newSubjects]);
    setStudents(prev => [...prev, ...newStudents]);
    setCompetencies(prev => [...prev, ...newCompetencies]);

    logAction('IMPORT', `Ha importat ${newGroups.length} grups nous.`);

    if (firstNewGroupId && firstNewSubjectId) {
      setActiveGroupId(firstNewGroupId);
      setActiveSubjectId(firstNewSubjectId);
      setActiveStudentIndex(0);
    }
  };

  const handleUpdateEvaluation = (competencyId: string, level: CompetencyLevel) => {
    if (!currentStudent) return;
    setEvaluations(prev => {
      const exists = prev.find(e => e.studentId === currentStudent.id && e.competencyId === competencyId);
      if (exists) {
        return prev.map(e => e.studentId === currentStudent.id && e.competencyId === competencyId ? { ...e, level } : e);
      }
      return [...prev, { studentId: currentStudent.id, competencyId, level }];
    });
  };

  const saveSheetConfigs = (configs: SheetConfig[]) => {
    setSheetConfigs(configs);
    localStorage.setItem('sheetConfigs', JSON.stringify(configs));
  };

  const handleFetchSheets = () => {
    if (!tokenClient) {
      alert("Error: No s'ha pogut inicialitzar el client de Google.");
      return;
    }

    tokenClient.callback = async (resp: any) => {
      if (resp.error) {
        alert(`Error d'autorització: ${resp.error}`);
        return;
      }

      const accessToken = resp.access_token;
      logAction('SYNC_SHEETS', 'Obtenint dades per previsualització...');

      const previews: PreviewData[] = [];

      for (const config of sheetConfigs) {
        if (!config.sheetId) continue;
        try {
          const rawValues = await fetchSheetValues(config.sheetId, accessToken);
          previews.push({ subjectName: config.subjectName, rawValues });
        } catch (err) {
          console.error(err);
        }
      }

      setSheetPreview(previews);
    };

    tokenClient.requestAccessToken({ prompt: '' });
  };

  const handleConfirmSync = () => {
    if (!sheetPreview) return;

    let totalNew = 0;

    sheetPreview.forEach(preview => {
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

        if (newEvaluations.length > 0) {
          setEvaluations(prev => {
            const updated = [...prev];
            newEvaluations.forEach(ne => {
              const idx = updated.findIndex(e => e.studentId === ne.studentId && e.competencyId === ne.competencyId);
              if (idx >= 0) updated[idx] = ne;
              else updated.push(ne);
            });
            return updated;
          });
          totalNew += newEvaluations.length;
        }
      }
    });

    logAction('SYNC_SHEETS', `Sincronització confirmada. ${totalNew} notes actualitzades.`);
    alert(`Sincronització completada! ${totalNew} notes importades.`);
    setSheetPreview(null);
  };

  const handleUpdateAnswerKey = (csvText: string) => {
    try {
      const newKeys = parseAnswerKeyCSV(csvText);
      setAnswerKeys(prev => {
        const updated = { ...prev, ...newKeys };
        localStorage.setItem('answerKeys', JSON.stringify(updated));
        return updated;
      });
      logAction('ADMIN_ACTION', 'Actualitzades pautes de correcció');
      return true;
    } catch (e) {
      console.error("Error parsing CSV", e);
      return false;
    }
  };

  const handleNext = useCallback(() => {
    if (activeStudentIndex < subjectStudents.length - 1) {
      setActiveStudentIndex(prev => prev + 1);
    }
  }, [activeStudentIndex, subjectStudents.length]);

  const handlePrev = useCallback(() => {
    if (activeStudentIndex > 0) {
      setActiveStudentIndex(prev => prev - 1);
    }
  }, [activeStudentIndex]);

  // --- TOUCH GESTURES FOR SWIPE NAVIGATION ---
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    }
    if (isRightSwipe) {
      handlePrev();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (user && !showReport && !showImport && !showAdmin) {
        if (e.key === 'ArrowRight') handleNext();
        if (e.key === 'ArrowLeft') handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, showReport, showImport, showAdmin, user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center transform transition-all hover:scale-105">
          <div className="mb-6 inline-block p-4 bg-indigo-50 rounded-full shadow-inner">
            <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
          <h1 className="text-2xl font-black text-gray-800 mb-2">Avaluació Competencial</h1>
          <p className="text-gray-500 mb-6 text-sm font-medium tracking-wide">Institut Bitacola</p>

          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-6 text-indigo-800 text-sm font-semibold flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            Accés exclusiu @insbitacola.cat
          </div>

          <div className="flex flex-col items-center gap-4">
            <div id="googleSignInDiv" className="min-h-[44px]"></div>
            {authError && (
              <div className="w-full p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 flex items-center justify-center font-bold animate-pulse">
                {authError}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-slate-800 font-sans flex flex-col overflow-hidden">
      <header className="bg-white z-30 flex-shrink-0 shadow-sm">
        <div className="border-b border-gray-100 bg-white relative z-20">
          <div className="max-w-3xl mx-auto flex justify-between items-center px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-sm">
                IB
              </div>
              <span className="font-bold text-gray-700 hidden sm:block">Avaluació</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {user.role === 'admin' && (
                <button
                  onClick={() => setShowAdmin(true)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  title="Panell d'Administració"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </button>
              )}
              <button
                onClick={() => { setShowReport(true); logAction('EXPORT', 'Ha obert informe global'); }}
                className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors border border-indigo-100"
                title="Informes"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Importar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              </button>
              {user.role === 'admin' && (
                <button
                  onClick={() => {
                    if (confirm('⚠️ Això esborrarà TOTES les dades i regenerarà els grups, alumnes i matèries. Continuar?')) {
                      localStorage.removeItem('gradeApp_v3');
                      seedDatabase();
                      logAction('ADMIN_ACTION', 'Ha reiniciat les dades del sistema');
                      alert('✅ Dades reiniciades correctament!');
                    }
                  }}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  title="Reiniciar Dades"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
              )}
              <div className="h-6 w-px bg-gray-200 mx-1"></div>
              {user.picture ? (
                <img
                  src={user.picture}
                  alt="User"
                  className="w-8 h-8 rounded-full border border-gray-200 cursor-pointer hover:opacity-80 object-cover"
                  onClick={handleLogout}
                  title="Tancar sessió"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div
                className={`w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-indigo-700 shadow-sm ${user.picture ? 'hidden' : ''}`}
                onClick={handleLogout}
                title="Tancar sessió"
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white border-b border-gray-200 shadow-sm relative z-10">
          <div className="max-w-3xl mx-auto px-2 overflow-x-auto hide-scrollbar flex" ref={groupScrollRef}>
            {groups.map(g => (
              <button
                key={g.id}
                onClick={() => { setActiveGroupId(g.id); setActiveStudentIndex(0); }}
                className={`
                   relative px-6 py-3 text-sm font-bold transition-colors whitespace-nowrap flex-shrink-0 outline-none focus:outline-none select-none
                   ${activeGroupId === g.id
                    ? 'text-indigo-600'
                    : 'text-gray-500 hover:text-gray-800'}
                 `}
              >
                {g.name}
                {activeGroupId === g.id && (
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-indigo-600 rounded-t-full transition-all duration-300" />
                )}
              </button>
            ))}
          </div>
        </div>
        {activeGroupSubjects.length > 0 && (
          <div className="bg-gray-50 border-b border-gray-200 py-3 animate-fade-in">
            <div className="max-w-3xl mx-auto px-4 overflow-x-auto hide-scrollbar flex gap-2 items-center" ref={subjectScrollRef}>
              <span className="text-xs font-bold text-gray-400 uppercase mr-1 flex-shrink-0">Matèria:</span>
              {activeGroupSubjects.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setActiveSubjectId(s.id); setActiveStudentIndex(0); }}
                  className={`
                     whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all border flex-shrink-0 select-none
                     ${activeSubjectId === s.id
                      ? 'bg-white text-indigo-600 border-indigo-200 shadow-sm ring-1 ring-indigo-100 transform scale-105'
                      : 'bg-gray-200/60 text-gray-500 border-transparent hover:bg-white hover:text-gray-700'}
                   `}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main
        className="flex-1 overflow-y-auto bg-gray-50 pb-24 relative"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="max-w-3xl mx-auto px-2 sm:px-4 py-4">
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
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <p>Selecciona un grup i una matèria</p>
            </div>
          )}
        </div>
      </main>

      {currentStudent && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-40 shadow-lg safe-area-bottom">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <button
              onClick={handlePrev}
              disabled={activeStudentIndex === 0}
              className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold disabled:opacity-30 hover:bg-gray-200 flex justify-center items-center transition-colors"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              Ant.
            </button>
            <div className="text-center min-w-[80px]">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Alumne</span>
              <div className="font-black text-gray-800 text-lg leading-none">
                {activeStudentIndex + 1} <span className="text-gray-300 text-base">/</span> {subjectStudents.length}
              </div>
            </div>
            <button
              onClick={handleNext}
              disabled={activeStudentIndex === subjectStudents.length - 1}
              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-30 hover:bg-indigo-700 shadow-md flex justify-center items-center transition-all active:scale-95"
            >
              Seg.
              <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      )}

      {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={handleImport} />}
      {showReport && activeSubject && (
        <GlobalReport
          onClose={() => setShowReport(false)}
          students={subjectStudents}
          competencies={subjectCompetencies}
          evaluations={evaluations}
          groupName={`${groups.find(g => g.id === activeGroupId)?.name} - ${activeSubject.name}`}
        />
      )}
      {showAdmin && user.role === 'admin' && (
        <AdminDashboard
          onClose={() => setShowAdmin(false)}
          users={knownUsers}
          logs={logs}
          onToggleBlockUser={toggleBlockUser}
          onToggleUserRole={toggleUserRole}
          currentUserEmail={user.email}
          groups={groups}
          subjects={subjects}
          students={students}
          competencies={competencies}
          evaluations={evaluations}
          sheetConfigs={sheetConfigs}
          onSaveSheetConfigs={saveSheetConfigs}
          onSyncSheets={handleFetchSheets}
          previewData={sheetPreview}
          onConfirmSync={handleConfirmSync}
          onCancelPreview={() => setSheetPreview(null)}
          onUpdateAnswerKeys={handleUpdateAnswerKey}
        />
      )}
    </div>
  );
};

export default App;
