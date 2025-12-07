import React from 'react';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import { Student, Evaluation, Competency, Group, Subject } from '../types';

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
    // Seleccionamos la materia que queremos exportar (por ahora la primera)
    const subject = subjects[0];
    const subjectStudents = students.filter((s) => s.subjectId === subject.id);

    const header = [
        `Resultats simulacre CCBB ${subject.name.toUpperCase()}`,
        ...subjectStudents.map((st) => `${st.groupName} - ${st.name}`)
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
    // @ts-ignore – autoTable está añadido a jsPDF vía import
    (doc as any).autoTable({
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
    window.open(sheetUrl, '_blank');
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
    <div className="flex gap-2">
        <button
            onClick={() =>
                exportPdf(groups, subjects, students, competencies, evaluations)
            }
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
            Exportar PDF
        </button>
        <button
            onClick={() =>
                exportSheets(groups, subjects, students, competencies, evaluations)
            }
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
            Exportar a Google Sheets
        </button>
    </div>
);
