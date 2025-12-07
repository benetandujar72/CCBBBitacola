import React, { useState } from 'react';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, Evaluation, Competency, Group, Subject } from '../../types';

interface GlobalExportProps {
    groups: Group[];
    subjects: Subject[];
    students: Student[];
    competencies: Competency[];
    evaluations: Evaluation[];
}

/**
 * Componente para exportación global de todos los cursos y materias
 */
export const GlobalExport: React.FC<GlobalExportProps> = ({
    groups,
    subjects,
    students,
    competencies,
    evaluations
}) => {
    const [isExporting, setIsExporting] = useState(false);

    /**
     * Exportar todos los datos a PDF
     */
    const exportAllToPDF = () => {
        setIsExporting(true);
        try {
            const doc = new jsPDF('landscape');
            let yPosition = 20;

            // Título principal
            doc.setFontSize(18);
            doc.text('Informe Global - Tots els Grups i Matèries', 14, yPosition);
            yPosition += 10;

            doc.setFontSize(10);
            doc.text(`Generat el ${new Date().toLocaleDateString('ca-ES')}`, 14, yPosition);
            yPosition += 15;

            // Iterar por cada grupo
            groups.forEach((group, groupIndex) => {
                // Obtener materias del grupo
                const groupSubjects = subjects.filter(s => s.groupId === group.id);

                groupSubjects.forEach((subject, subjectIndex) => {
                    // Añadir nueva página si no es el primer elemento
                    if (groupIndex > 0 || subjectIndex > 0) {
                        doc.addPage();
                        yPosition = 20;
                    }

                    // Título del grupo y materia
                    doc.setFontSize(14);
                    doc.text(`${group.name} - ${subject.name}`, 14, yPosition);
                    yPosition += 10;

                    // Obtener estudiantes del grupo
                    const groupStudents = students.filter(s => s.groupId === group.id);

                    // Obtener competencias de la materia
                    const subjectCompetencies = competencies.filter(c => c.subjectId === subject.id);

                    if (groupStudents.length === 0 || subjectCompetencies.length === 0) {
                        doc.setFontSize(10);
                        doc.text('Sense dades disponibles', 14, yPosition);
                        return;
                    }

                    // Preparar datos para la tabla
                    const tableData: any[] = [];

                    subjectCompetencies.forEach(comp => {
                        const row: any[] = [
                            comp.category || '',
                            comp.description
                        ];

                        groupStudents.forEach(student => {
                            const ev = evaluations.find(
                                e => e.studentId === student.id && e.competencyId === comp.id
                            );
                            row.push(ev?.numericValue?.toString() || '-');
                        });

                        tableData.push(row);
                    });

                    // Crear encabezados
                    const headers = [
                        'Categoria',
                        'Competència',
                        ...groupStudents.map(s => s.name.split(' ')[0]) // Solo primer nombre
                    ];

                    // Añadir tabla
                    autoTable(doc, {
                        head: [headers],
                        body: tableData,
                        startY: yPosition,
                        theme: 'grid',
                        headStyles: {
                            fillColor: [79, 70, 229],
                            fontSize: 8
                        },
                        styles: {
                            fontSize: 7,
                            cellPadding: 2
                        },
                        columnStyles: {
                            0: { cellWidth: 30 },
                            1: { cellWidth: 60 }
                        }
                    });
                });
            });

            doc.save('informe_global_ccbb.pdf');
            alert('PDF generat correctament!');
        } catch (error) {
            console.error('Error generant PDF:', error);
            alert('Error al generar el PDF. Si us plau, torna-ho a intentar.');
        } finally {
            setIsExporting(false);
        }
    };

    /**
     * Exportar todos los datos a CSV
     */
    const exportAllToCSV = async () => {
        setIsExporting(true);
        try {
            const header = ['Grup', 'Matèria', 'Alumne', 'Email', 'Categoria', 'Competència', 'Valor', 'Nivell'];
            const rows: string[][] = [];

            groups.forEach(group => {
                const groupSubjects = subjects.filter(s => s.groupId === group.id);

                groupSubjects.forEach(subject => {
                    const groupStudents = students.filter(s => s.groupId === group.id);
                    const subjectCompetencies = competencies.filter(c => c.subjectId === subject.id);

                    groupStudents.forEach(student => {
                        subjectCompetencies.forEach(comp => {
                            const ev = evaluations.find(
                                e => e.studentId === student.id && e.competencyId === comp.id
                            );

                            rows.push([
                                group.name,
                                subject.name,
                                student.name,
                                student.email || '',
                                comp.category || '',
                                comp.description,
                                ev?.numericValue?.toString() || '',
                                ev?.level || ''
                            ]);
                        });
                    });
                });
            });

            // Generar CSV
            const csvContent = [header, ...rows]
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');

            // Enviar al endpoint
            const response = await fetch('/api/export-sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ header, rows })
            });

            if (!response.ok) {
                throw new Error('Error en la exportació');
            }

            const { sheetUrl } = await response.json();

            // Descargar el archivo
            const link = document.createElement('a');
            link.href = sheetUrl;
            link.download = 'informe_global_ccbb.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            alert('CSV generat correctament!');
        } catch (error) {
            console.error('Error generant CSV:', error);
            alert('Error al generar el CSV. Si us plau, torna-ho a intentar.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex flex-col sm:flex-row gap-2 w-full">
            <button
                onClick={exportAllToPDF}
                disabled={isExporting}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white font-semibold shadow-md transition-all ${isExporting
                        ? 'bg-indigo-300 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'
                    }`}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">Exportar Tot (PDF)</span>
                <span className="sm:hidden">PDF Global</span>
            </button>

            <button
                onClick={exportAllToCSV}
                disabled={isExporting}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white font-semibold shadow-md transition-all ${isExporting
                        ? 'bg-green-300 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 hover:shadow-lg'
                    }`}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">Exportar Tot (CSV)</span>
                <span className="sm:hidden">CSV Global</span>
            </button>
        </div>
    );
};
