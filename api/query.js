
import pg from 'pg';
const { Pool } = pg;

// Utilitza la variable d'entorn en producció.
// Per facilitat en aquest entorn de prova, incloem un fallback (però és recomanable moure-ho a ENV vars a Vercel).
const CONNECTION_STRING = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_WK0ZNzjk1THn@ep-bitter-salad-agg41t0m-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require";

const pool = new Pool({
  connectionString: CONNECTION_STRING,
  ssl: {
    rejectUnauthorized: false, 
  },
});

export default async function handler(req, res) {
  // Configuración de CORS per permetre peticions des del Frontend
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Mètode no permès. Utilitza POST.' });
  }

  try {
    const { text, params } = req.body;
    
    if (!text) {
        return res.status(400).json({ error: 'Falta la consulta SQL (text).' });
    }

    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    // Retornem resultats en format JSON estàndard de 'pg'
    res.status(200).json({
      rows: result.rows,
      rowCount: result.rowCount,
      duration,
      command: result.command
    });

  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: error.message });
  }
}
