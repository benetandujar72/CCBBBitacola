import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const adminEmail = 'benet.andujar@insbitacola.cat';

async function setAdmin() {
    try {
        console.log(`Setting admin role for ${adminEmail}...`);

        // Upsert user with admin role (no updated_at column in users table based on initial schema analysis assumption, checking schema now)
        const query = `
      INSERT INTO users (email, name, role, last_login)
      VALUES ($1, 'Admin', 'admin', NOW())
      ON CONFLICT (email)
      DO UPDATE SET role = 'admin', last_login = NOW()
      RETURNING *;
    `;

        const res = await pool.query(query, [adminEmail]);
        console.log('Admin user configured:', res.rows[0]);

    } catch (err) {
        console.error('Error setting admin:', err);
    } finally {
        pool.end();
    }
}

setAdmin();
