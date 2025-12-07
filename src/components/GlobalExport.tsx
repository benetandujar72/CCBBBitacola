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
        <div className="flex gap-1">
            <button
                onClick={exportAllToPDF}
                disabled={isExporting}
                className={`p-2 rounded-full transition-colors ${isExporting ? 'text-gray-400 cursor-not-allowed' : 'text-indigo-600 hover:bg-indigo-50'
                    }`}
                title="Exportar TOTALITAT del centre en PDF (Lent)"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            </button>

            <button
                onClick={exportAllToCSV}
                disabled={isExporting}
                className={`p-2 rounded-full transition-colors ${isExporting ? 'text-gray-400 cursor-not-allowed' : 'text-green-600 hover:bg-green-50'
                    }`}
                title="Exportar TOTALITAT del centre en CSV/Excel"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
            </button>
        </div>
    );
};
