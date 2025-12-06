-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    picture TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    is_blocked BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Groups Table
CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL
);

-- Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    group_id TEXT REFERENCES groups(id) ON DELETE CASCADE
);

-- Students Table
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    group_id TEXT REFERENCES groups(id) ON DELETE CASCADE
);

-- Competencies Table
CREATE TABLE IF NOT EXISTS competencies (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    description TEXT NOT NULL,
    category TEXT,
    subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE
);

-- Evaluations Table
CREATE TABLE IF NOT EXISTS evaluations (
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    competency_id TEXT REFERENCES competencies(id) ON DELETE CASCADE,
    level TEXT, -- Enum value as string
    observation TEXT,
    numeric_value NUMERIC,
    student_response TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, competency_id)
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_email TEXT,
    action TEXT NOT NULL,
    details TEXT,
    ip TEXT
);

-- Sheet Configs Table
CREATE TABLE IF NOT EXISTS sheet_configs (
    subject_name TEXT PRIMARY KEY,
    sheet_id TEXT NOT NULL
);

-- Answer Keys Table (JSON storage might be simpler, but let's clear relational)
CREATE TABLE IF NOT EXISTS answer_keys (
    subject_name TEXT,
    question_key TEXT,
    answer TEXT,
    PRIMARY KEY (subject_name, question_key)
);
