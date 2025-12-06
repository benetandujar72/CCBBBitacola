
/**
 * ARXIU DE REFERÈNCIA PER A BACKEND (Node.js)
 * -------------------------------------------
 * 
 * IMPORTANT: Aquest codi està comentat perquè la llibreria 'pg' NO funciona al navegador
 * i farà que l'aplicació deixi de carregar (Error: "Failed to load module script").
 * 
 * Per connectar amb Neon PostgreSQL, has de moure aquest codi a un servidor API (Node.js/Express)
 * o una Serverless Function (Vercel/Netlify).
 * 
 * QUAN TINGUIS EL SERVIDOR, DESCOMENTA EL CODI DE SOTA:
 */

/*
import { Pool } from 'pg';

const CONNECTION_STRING = "postgresql://neondb_owner:npg_WK0ZNzjk1THn@ep-bitter-salad-agg41t0m-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

export const db = new Pool({
  connectionString: CONNECTION_STRING,
  ssl: {
    rejectUnauthorized: false, // Necessari per a Neon
  },
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await db.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executada', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Error en la query', { text, error });
    throw error;
  }
};
*/

// --- MOCK PER EVITAR ERRORS AL NAVEGADOR ---
export const db = {
  query: async (text: string, params?: any[]) => { 
    console.warn("Connexió DB desactivada al client."); 
    return { rows: [], rowCount: 0 }; 
  }
};

export const query = async (text: string, params?: any[]) => { 
  console.warn("Connexió DB desactivada al client."); 
  return { rows: [], rowCount: 0 }; 
};
