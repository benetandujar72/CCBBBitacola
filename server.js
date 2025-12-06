import express from 'express';
import cors from 'cors';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Configuración de PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// API Routes

// API Health
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// --- GROUPS ---
app.get('/api/groups', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM groups ORDER BY name');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/groups', async (req, res) => {
    const { id, name } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO groups (id, name) VALUES ($1, $2) RETURNING *',
            [id, name]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SUBJECTS ---
app.get('/api/subjects', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM subjects');
        // Map snake_case to camelCase
        res.json(result.rows.map(s => ({
            id: s.id,
            name: s.name,
            groupId: s.group_id
        })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/subjects', async (req, res) => {
    const { id, name, groupId } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO subjects (id, name, group_id) VALUES ($1, $2, $3) RETURNING *',
            [id, name, groupId]
        );
        const row = result.rows[0];
        res.json({ id: row.id, name: row.name, groupId: row.group_id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- STUDENTS ---
app.get('/api/students', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM students ORDER BY name');
        res.json(result.rows.map(s => ({
            id: s.id, name: s.name, email: s.email, groupId: s.group_id
        })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/students', async (req, res) => {
    const { id, name, email, groupId } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO students (id, name, email, group_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [id, name, email, groupId]
        );
        const row = result.rows[0];
        res.json({ id: row.id, name: row.name, email: row.email, groupId: row.group_id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- COMPETENCIES ---
app.get('/api/competencies', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM competencies');
        res.json(result.rows.map(c => ({
            id: c.id, description: c.description, category: c.category, subjectId: c.subject_id
        })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/competencies', async (req, res) => {
    const { id, description, category, subjectId } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO competencies (id, description, category, subject_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [id, description, category, subjectId]
        );
        const row = result.rows[0];
        res.json({ id: row.id, description: row.description, category: row.category, subjectId: row.subject_id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- EVALUATIONS ---
app.get('/api/evaluations', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM evaluations');
        res.json(result.rows.map(e => ({
            studentId: e.student_id,
            competencyId: e.competency_id,
            level: e.level,
            observation: e.observation,
            numericValue: e.numeric_value ? parseFloat(e.numeric_value) : undefined,
            studentResponse: e.student_response
        })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/evaluations', async (req, res) => {
    const { studentId, competencyId, level, observation, numericValue, studentResponse } = req.body;
    const numVal = numericValue !== undefined ? numericValue : null;

    const query = `
    INSERT INTO evaluations (student_id, competency_id, level, observation, numeric_value, student_response, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (student_id, competency_id)
    DO UPDATE SET 
      level = EXCLUDED.level,
      observation = EXCLUDED.observation, 
      numeric_value = EXCLUDED.numeric_value,
      student_response = EXCLUDED.student_response,
      updated_at = NOW()
    RETURNING *;
  `;

    try {
        const result = await pool.query(query, [studentId, competencyId, level, observation, numVal, studentResponse]);
        const row = result.rows[0];
        res.json({
            studentId: row.student_id,
            competencyId: row.competency_id,
            level: row.level,
            observation: row.observation,
            numericValue: row.numeric_value ? parseFloat(row.numeric_value) : undefined,
            studentResponse: row.student_response
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- AUDIT LOGS ---
app.get('/api/logs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1000');
        res.json(result.rows.map(l => ({
            id: l.id,
            timestamp: l.timestamp,
            userEmail: l.user_email,
            action: l.action,
            details: l.details,
            ip: l.ip
        })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/logs', async (req, res) => {
    const { id, userEmail, action, details, ip } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO audit_logs (id, user_email, action, details, ip) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [id, userEmail, action, details, ip]
        );
        const row = result.rows[0];
        res.json({
            id: row.id, timestamp: row.timestamp, userEmail: row.user_email, action: row.action, details: row.details, ip: row.ip
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- USERS ---
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.json(result.rows.map(u => ({
            name: u.name, email: u.email, picture: u.picture, role: u.role, isBlocked: u.is_blocked, lastLogin: u.last_login
        })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', async (req, res) => {
    const { name, email, picture, role, isBlocked } = req.body;
    const query = `
    INSERT INTO users (email, name, picture, role, is_blocked, last_login)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (email)
    DO UPDATE SET 
      name = EXCLUDED.name,
      picture = EXCLUDED.picture,
      last_login = NOW()
    RETURNING *;
  `;
    try {
        const result = await pool.query(query, [email, name, picture, role, isBlocked || false]);
        const u = result.rows[0];
        res.json({ name: u.name, email: u.email, picture: u.picture, role: u.role, isBlocked: u.is_blocked, lastLogin: u.last_login });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/users/:email', async (req, res) => {
    const { role, isBlocked } = req.body;
    const { email } = req.params;
    try {
        const result = await pool.query(
            'UPDATE users SET role = COALESCE($1, role), is_blocked = COALESCE($2, is_blocked) WHERE email = $3 RETURNING *',
            [role, isBlocked, email]
        );
        const u = result.rows[0];
        if (u) res.json({ name: u.name, email: u.email, picture: u.picture, role: u.role, isBlocked: u.is_blocked });
        else res.status(404).json({ error: 'User not found' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Servir frontend en producción
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get(/.*/, (req, res) => {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
}

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
