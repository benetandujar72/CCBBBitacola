import React from 'react';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Student, Evaluation, Competency, Group, Subject } from '../../types';

/**
 * Construye la tabla de datos a exportar.
 * Devuelve la cabecera (primer elemento) y las filas.
 */
function buildTableData(
    groups: Group[],
    subjects: Subject[],
    students: Student[],
    competencies: Competency[],
    evaluations: Evaluation[]
) {
    // Seleccionamos la primera materia disponible
    const subject = subjects[0];
    if (!subject) return { header: ['Sin datos'], rows: [] };

    // Filtramos estudiantes del primer grupo
    const firstGroup = groups[0];
    if (!firstGroup) return { header: ['Sin grupos'], rows: [] };

    const subjectStudents = students.filter((s) => s.groupId === firstGroup.id);

    const header = [
        `Resultats simulacre CCBB ${subject.name.toUpperCase()}`,
        ...subjectStudents.map((st) => {
            const group = groups.find(g => g.id === st.groupId);
            return `${group?.name || ''} - ${st.name}`;
        })
    ];

    const rows: (string | number)[][] = [];
    const comps = competencies
        .filter((c) => c.subjectId === subject.id)
        .sort((a, b) => a.description.localeCompare(b.description));

    comps.forEach((comp) => {
        const row: (string | number)[] = [comp.description];
        subjectStudents.forEach((st) => {
            const ev = evaluations.find(
                (e) => e.studentId === st.id && e.competencyId === comp.id
            );
            row.push(ev?.numericValue ?? '');
        });
        rows.push(row);
    });

    return { header, rows };
}

/** Exportar a PDF */
export const exportPdf = (
    groups: Group[],
    subjects: Subject[],
    students: Student[],
    competencies: Competency[],
    evaluations: Evaluation[]
) => {
    const { header, rows } = buildTableData(
        groups,
        subjects,
        students,
        competencies,
        evaluations
    );

    const doc = new jsPDF('landscape');
    doc.setFontSize(14);
    doc.text('Informe de resultados – CCBB', 14, 20);

    autoTable(doc, {
        head: [header],
        body: rows,
        startY: 30,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 8, cellPadding: 2 }
    });

    doc.save('informe_ccbb.pdf');
};

/** Exportar a Google Sheets (requiere endpoint /api/export-sheet) */
export const exportSheets = async (
    groups: Group[],
    subjects: Subject[],
    students: Student[],
    competencies: Competency[],
    evaluations: Evaluation[]
) => {
    const { header, rows } = buildTableData(
        groups,
        subjects,
        students,
        competencies,
        evaluations
    );

    try {
        const response = await fetch('/api/export-sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ header, rows })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Export to Sheets failed: ${err}`);
        }

        const { sheetUrl } = await response.json();

        // Descargar el archivo CSV directamente
        const link = document.createElement('a');
        link.href = sheetUrl;
        link.download = 'informe_ccbb.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        alert('Archivo CSV descargado correctamente');
    } catch (error) {
        console.error('Error exportando a CSV:', error);
        alert('Error al exportar el archivo. Por favor, inténtalo de nuevo.');
    }
};

interface Props {
    groups: Group[];
    subjects: Subject[];
    students: Student[];
    competencies: Competency[];
    evaluations: Evaluation[];
}

export const ExportReport: React.FC<Props> = ({
    groups,
    subjects,
    students,
    competencies,
    evaluations
}) => (
    <div className="flex gap-1">
        <button
            onClick={() =>
                exportPdf(groups, subjects, students, competencies, evaluations)
            }
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
            title="Exportar Grup Actual (PDF)"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
        </button>
        <button
            onClick={() =>
                exportSheets(groups, subjects, students, competencies, evaluations)
            }
            className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
            title="Exportar Grup Actual (Excel/CSV)"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
        </button>
    </div>
);
