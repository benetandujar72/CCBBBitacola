import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkDb() {
    try {
        const clients = await pool.query('SELECT count(*) FROM students');
        const groups = await pool.query('SELECT count(*) FROM groups');
        console.log('Students count:', clients.rows[0].count);
        console.log('Groups count:', groups.rows[0].count);

        // Check if tables exist
        const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));

    } catch (err) {
        console.error('Error checking DB:', err);
    } finally {
        pool.end();
    }
}
checkDb();
