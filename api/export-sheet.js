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

        // Crear un data URL para descarga
        const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);

        // Devolver JSON con la URL como espera el frontend
        res.status(200).json({
            sheetUrl: dataUrl,
            message: 'CSV generado correctamente'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creando el archivo' });
    }
}
