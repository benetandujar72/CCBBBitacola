import { Group, Student, Subject, Competency, Evaluation, User, AuditLog } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

async function fetchJson(endpoint: string, options: RequestInit = {}) {
    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

export const api = {
    // Groups
    getGroups: () => fetchJson('/groups'),
    createGroup: (group: Group) => fetchJson('/groups', { method: 'POST', body: JSON.stringify(group) }),

    // Subjects
    getSubjects: () => fetchJson('/subjects'),
    createSubject: (subject: Subject) => fetchJson('/subjects', { method: 'POST', body: JSON.stringify(subject) }),

    // Students
    getStudents: () => fetchJson('/students'),
    createStudent: (student: Student) => fetchJson('/students', { method: 'POST', body: JSON.stringify(student) }),

    // Competencies
    getCompetencies: () => fetchJson('/competencies'),
    createCompetency: (comp: Competency) => fetchJson('/competencies', { method: 'POST', body: JSON.stringify(comp) }),

    // Evaluations
    getEvaluations: () => fetchJson('/evaluations'),
    updateEvaluation: (evalItem: Evaluation) => fetchJson('/evaluations', { method: 'POST', body: JSON.stringify(evalItem) }),

    // Users
    getUsers: () => fetchJson('/users'),
    syncUser: (user: User) => fetchJson('/users', { method: 'POST', body: JSON.stringify(user) }),
    updateUser: (email: string, updates: Partial<User>) => fetchJson(`/users/${email}`, { method: 'PUT', body: JSON.stringify(updates) }),

    // Logs
    getLogs: () => fetchJson('/logs'),
    logAction: (log: AuditLog) => fetchJson('/logs', { method: 'POST', body: JSON.stringify(log) }),
};
