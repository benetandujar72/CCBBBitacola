
/**
 * SERVEI DE BASE DE DADES (CLIENT SIDE)
 * -------------------------------------
 * Aquest servei connecta amb el Backend (Serverless Function) situat a /api/query.
 * No connecta directament a Postgres, sinó que fa una petició HTTP segura.
 */

export interface QueryResult {
  rows: any[];
  rowCount: number;
  command?: string;
  duration?: number;
}

export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
  try {
    // En producció (Vercel), '/api/query' resol automàticament a la funció serverless.
    const response = await fetch('/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, params }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Error del servidor: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error executant query remota:', error);
    throw error;
  }
};

// Funció de utilitat per provar la connexió
export const testConnection = async () => {
  try {
    const res = await query('SELECT NOW() as now');
    return { success: true, timestamp: res.rows[0].now };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};
