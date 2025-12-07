export default function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { header, rows } = req.body;

    try {
        // Generar CSV
        const csvContent = [header, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=informe_ccbb.csv');
        res.status(200).send(csvContent);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creando el archivo' });
    }
}
