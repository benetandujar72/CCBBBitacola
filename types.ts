
export enum CompetencyLevel {
  NP = 'NP', // 0
  NE = 'NE', // 0.5
  NA = 'NA', // 1
  AS = 'AS', // 2
  AN = 'AN', // 3
  AE = 'AE', // 4
}

export const LevelValues: Record<CompetencyLevel, number> = {
  [CompetencyLevel.NP]: 0,
  [CompetencyLevel.NE]: 0.5,
  [CompetencyLevel.NA]: 1,
  [CompetencyLevel.AS]: 2,
  [CompetencyLevel.AN]: 3,
  [CompetencyLevel.AE]: 4,
};

export const ValueToLevel: Record<number, CompetencyLevel> = {
  0: CompetencyLevel.NP,
  0.5: CompetencyLevel.NE,
  1: CompetencyLevel.NA,
  2: CompetencyLevel.AS,
  3: CompetencyLevel.AN,
  4: CompetencyLevel.AE,
};

export const LevelColors: Record<CompetencyLevel, string> = {
  [CompetencyLevel.NP]: 'bg-gray-200 text-gray-800 border-gray-400 hover:bg-gray-300',
  [CompetencyLevel.NE]: 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200',
  [CompetencyLevel.NA]: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200',
  [CompetencyLevel.AS]: 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200',
  [CompetencyLevel.AN]: 'bg-cyan-100 text-cyan-700 border-cyan-300 hover:bg-cyan-200',
  [CompetencyLevel.AE]: 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200',
};

export const LevelLabels: Record<CompetencyLevel, string> = {
  [CompetencyLevel.NP]: 'No Presentat (0)',
  [CompetencyLevel.NE]: 'Baix (0.5)',
  [CompetencyLevel.NA]: 'No Assolit (1)',
  [CompetencyLevel.AS]: 'Satisfactori (2)',
  [CompetencyLevel.AN]: 'Notable (3)',
  [CompetencyLevel.AE]: 'Excel·lent (4)',
};

export interface User {
  name: string;
  email: string;
  picture: string;
  role: 'admin' | 'user';
  isBlocked?: boolean;
  lastLogin?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userEmail: string;
  action: 'LOGIN' | 'LOGOUT' | 'VIEW_GROUP' | 'UPDATE_EVAL' | 'EXPORT' | 'IMPORT' | 'ADMIN_ACTION' | 'SYNC_SHEETS';
  details: string;
  ip: string;
}

export interface Student {
  id: string;
  name: string;
  email?: string;
  groupId: string;
}

export interface Group {
  id: string;
  name: string;
  groupId?: string; // Backwards compatibility if needed, though ID is primary
}

export interface Competency {
  id: string;
  description: string;
  category?: string; // Added for grouping (e.g., EXPRESSIÓ ESCRITA)
  subjectId: string;
}

export interface Subject {
  id: string;
  name: string;
  groupId: string;
}

export interface Evaluation {
  studentId: string;
  competencyId: string;
  level: CompetencyLevel | null;
  observation?: string;
  numericValue?: number; // 0 or 1 for tests, or 0.5-4 for rubric
  studentResponse?: string; // "a", "b", "Sí", etc.
}

// Data structure for import parsing
export interface ImportData {
  groupName: string;
  subjectName: string;
  students: string[];
  competencies: string[];
}

export interface SheetConfig {
  subjectName: string; // 'Català', 'Castellà', 'Anglès'
  sheetId: string;
}

// Google OAuth Types
export interface TokenClient {
  requestAccessToken: (config?: any) => void;
  callback?: (response: any) => void;
}

export interface PreviewData {
  subjectName: string;
  rawValues: any[][];
}
