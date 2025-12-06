
import React, { useState, useMemo } from 'react';
import { Student, Competency, Evaluation, LevelValues, LevelLabels, CompetencyLevel } from '../types';

interface GlobalReportProps {
  onClose: () => void;
  students: Student[];
  competencies: Competency[];
  evaluations: Evaluation[];
  groupName: string;
}

const GlobalReport: React.FC<GlobalReportProps> = ({
  onClose,
  students,
  competencies,
  evaluations,
  groupName,
}) => {
  const [activeTab, setActiveTab] = useState<'students' | 'competencies'>('students');

  // Compute averages
  const studentStats = useMemo(() => {
    return students.map(s => {
      const studentEvals = evaluations.filter(e => e.studentId === s.id && e.level);
      const total = studentEvals.reduce((acc, curr) => acc + (curr.level ? LevelValues[curr.level] : 0), 0);
      const avg = studentEvals.length > 0 ? (total / studentEvals.length).toFixed(1) : '0.0';
      const progress = Math.round((studentEvals.length / competencies.length) * 100);
      return { ...s, avg, progress };
    }).sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg));
  }, [students, evaluations, competencies.length]);

  const competencyStats = useMemo(() => {
    return competencies.map(c => {
      const compEvals = evaluations.filter(e => e.competencyId === c.id && e.level);
      const total = compEvals.reduce((acc, curr) => acc + (curr.level ? LevelValues[curr.level] : 0), 0);
      const avg = compEvals.length > 0 ? (total / compEvals.length).toFixed(1) : '0.0';
      const count = compEvals.length;
      
      // Distribution counts
      const counts = {
        [CompetencyLevel.NP]: 0,
        [CompetencyLevel.NE]: 0,
        [CompetencyLevel.NA]: 0,
        [CompetencyLevel.AS]: 0,
        [CompetencyLevel.AN]: 0,
        [CompetencyLevel.AE]: 0,
      };
      
      compEvals.forEach(e => {
        if (e.level) counts[e.level]++;
      });

      return { ...c, avg, count, distribution: counts };
    }).sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg));
  }, [competencies, evaluations]);

  const globalDistribution = useMemo(() => {
    const counts = {
      [CompetencyLevel.NP]: 0,
      [CompetencyLevel.NE]: 0,
      [CompetencyLevel.NA]: 0,
      [CompetencyLevel.AS]: 0,
      [CompetencyLevel.AN]: 0,
      [CompetencyLevel.AE]: 0,
    };
    let total = 0;

    // Only count evaluations for current students and current competencies
    evaluations.forEach(ev => {
      if (ev.level && students.some(s => s.id === ev.studentId) && competencies.some(c => c.id === ev.competencyId)) {
        counts[ev.level] = (counts[ev.level] || 0) + 1;
        total++;
      }
    });

    return { counts, total };
  }, [evaluations, students, competencies]);

  const globalAverage = useMemo(() => {
     const allVals = evaluations.filter(e => students.find(s => s.id === e.studentId) && competencies.find(c => c.id === e.competencyId) && e.level)
                                .map(e => e.level ? LevelValues[e.level] : 0);
     if (allVals.length === 0) return "0.0";
     const total = allVals.reduce((a, b) => a + b, 0);
     return (total / allVals.length).toFixed(2);
  }, [evaluations, students, competencies]);

  const getScoreColor = (score: number) => {
    if (score >= 3.5) return 'text-green-600 bg-green-50';
    if (score >= 2.5) return 'text-cyan-600 bg-cyan-50';
    if (score >= 1.5) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const downloadGlobalCSV = () => {
    // Define headers
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Grup,Matèria,Alumne,Email,Categoria,Pregunta,Valor (0-4),Nivell\n";

    students.forEach(student => {
      competencies.forEach(comp => {
        const ev = evaluations.find(e => e.studentId === student.id && e.competencyId === comp.id);
        const level = ev?.level ? LevelLabels[ev.level] : "No Avaluat";
        const val = ev?.level ? LevelValues[ev.level] : "";
        const groupNamePart = groupName.split(' - ')[0] || "Unknown Group";
        const subjectNamePart = groupName.split(' - ')[1] || "Unknown Subject";

        // Escape fields for CSV
        const row = [
          `"${groupNamePart}"`,
          `"${subjectNamePart}"`,
          `"${student.name}"`,
          `"${student.email || ''}"`,
          `"${comp.category || ''}"`,
          `"${comp.description}"`,
          `"${val}"`,
          `"${level}"`
        ].join(",");
        csvContent += row + "\n";
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Global_${groupName.replace(/\s/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadStudentCSV = (student: Student) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Informe Alumne: ${student.name}\n`;
    csvContent += `Grup/Materia: ${groupName}\n\n`;
    csvContent += "Categoria,Competència,Nota (0-4),Nivell\n";

    competencies.forEach(comp => {
      const ev = evaluations.find(e => e.studentId === student.id && e.competencyId === comp.id);
      const levelText = ev?.level ? LevelLabels[ev.level] : "No Avaluat";
      const val = ev?.level ? LevelValues[ev.level] : "";
      
      const row = [
        `"${comp.category || 'General'}"`,
        `"${comp.description}"`,
        `"${val}"`,
        `"${levelText}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Informe_${student.name.replace(/\s/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printStudentReport = (student: Student, avg: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const groupedComps: Record<string, Competency[]> = {};
    competencies.forEach(c => {
      const cat = c.category || 'General';
      if (!groupedComps[cat]) groupedComps[cat] = [];
      groupedComps[cat].push(c);
    });

    let htmlContent = `
      <html>
        <head>
          <title>Informe - ${student.name}</title>
          <style>
            body { font-family: 'Helvetica', sans-serif; color: #333; padding: 40px; }
            .header { border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: end; }
            h1 { margin: 0; font-size: 24px; color: #1f2937; }
            h2 { margin: 0; font-size: 16px; color: #6b7280; margin-top: 5px; }
            .score-box { text-align: right; }
            .score { font-size: 32px; font-weight: bold; color: #4f46e5; }
            .score-label { font-size: 12px; text-transform: uppercase; color: #6b7280; }
            .category { margin-top: 25px; page-break-inside: avoid; }
            .cat-title { background: #f3f4f6; padding: 8px 12px; font-weight: bold; font-size: 14px; border-radius: 4px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
            tr:last-child td { border-bottom: none; }
            .level-NP { color: #374151; font-weight: bold; }
            .level-NE { color: #4b5563; font-weight: bold; }
            .level-NA { color: #dc2626; font-weight: bold; }
            .level-AS { color: #d97706; font-weight: bold; }
            .level-AN { color: #0891b2; font-weight: bold; }
            .level-AE { color: #16a34a; font-weight: bold; }
            .footer { margin-top: 50px; font-size: 10px; text-align: center; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>${student.name}</h1>
              <h2>${groupName}</h2>
              <p style="font-size: 12px; color: #6b7280; margin: 5px 0 0 0;">${student.email || ''}</p>
            </div>
            <div class="score-box">
              <div class="score-label">Mitjana Global</div>
              <div class="score">${avg}</div>
            </div>
          </div>
    `;

    Object.keys(groupedComps).forEach(cat => {
      htmlContent += `<div class="category"><div class="cat-title">${cat}</div><table>`;
      groupedComps[cat].forEach(comp => {
        const ev = evaluations.find(e => e.studentId === student.id && e.competencyId === comp.id);
        const levelCode = ev?.level || '---';
        const val = ev?.level ? LevelValues[ev.level] : '';
        
        htmlContent += `
          <tr>
            <td width="80%">${comp.description}</td>
            <td width="10%" style="text-align: center;">${val}</td>
            <td width="10%" style="text-align: right;" class="level-${levelCode}">${levelCode}</td>
          </tr>
        `;
      });
      htmlContent += `</table></div>`;
    });

    htmlContent += `
          <div class="footer">
            Generat el ${new Date().toLocaleDateString('ca-ES')} amb Avaluació Competencial AI
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Informe Global: {groupName}</h2>
            <p className="text-gray-500 text-sm">Resum de rendiment per alumnes i preguntes</p>
          </div>
          <div className="flex items-center gap-4">
             <button 
               onClick={downloadGlobalCSV}
               className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm text-sm font-bold flex items-center"
             >
               <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
               Exportar Tot (CSV)
             </button>

             <div className="text-right px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="text-xs text-gray-500 uppercase font-bold">Mitjana Grup</div>
                <div className={`text-2xl font-black ${getScoreColor(parseFloat(globalAverage)).split(' ')[0]}`}>
                  {globalAverage}
                </div>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('students')}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'students' ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Per Alumne
          </button>
          <button
            onClick={() => setActiveTab('competencies')}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'competencies' ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Per Pregunta (Competència)
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          {activeTab === 'students' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {studentStats.map(student => (
                <div key={student.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="truncate pr-2">
                      <div className="font-bold text-gray-800 text-lg truncate">{student.name}</div>
                      {student.email && <div className="text-xs text-gray-400 truncate">{student.email}</div>}
                      <div className="text-xs text-indigo-500 mt-1 font-medium">Progrés: {student.progress}%</div>
                    </div>
                    <div className={`text-xl font-bold px-3 py-1 rounded-lg flex-shrink-0 ${getScoreColor(parseFloat(student.avg))}`}>
                      {student.avg}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-2 border-t border-gray-100 pt-3">
                    <button 
                      onClick={() => downloadStudentCSV(student)}
                      className="flex-1 flex items-center justify-center py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      title="Descarregar CSV"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      CSV
                    </button>
                    <button 
                      onClick={() => printStudentReport(student, student.avg)}
                      className="flex-1 flex items-center justify-center py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                      title="Imprimir o Guardar com PDF"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                      PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'competencies' && (
            <div className="space-y-6">
               {/* GLOBAL CHART SUMMARY */}
               <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-2">
                 <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                   <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                   Distribució Global del Grup
                 </h3>
                 <div className="flex items-end justify-around h-40 gap-2 sm:gap-4 pb-2">
                   {[CompetencyLevel.NP, CompetencyLevel.NE, CompetencyLevel.NA, CompetencyLevel.AS, CompetencyLevel.AN, CompetencyLevel.AE].map(level => {
                      const count = globalDistribution.counts[level];
                      const percentage = globalDistribution.total > 0 ? (count / globalDistribution.total) * 100 : 0;
                      const colorClass = {
                        [CompetencyLevel.NP]: 'bg-gray-600',
                        [CompetencyLevel.NE]: 'bg-slate-400',
                        [CompetencyLevel.NA]: 'bg-red-400',
                        [CompetencyLevel.AS]: 'bg-amber-400',
                        [CompetencyLevel.AN]: 'bg-cyan-400',
                        [CompetencyLevel.AE]: 'bg-green-400',
                      }[level];

                      return (
                        <div key={level} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                          <div className="mb-1 text-xs font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">{percentage.toFixed(0)}%</div>
                          <div 
                            className={`w-full max-w-[60px] rounded-t-lg transition-all duration-500 ${colorClass} opacity-80 hover:opacity-100 relative`}
                            style={{ height: `${Math.max(percentage, 2)}%` }}
                          >
                          </div>
                          <div className="mt-2 text-xs font-bold text-gray-600 text-center whitespace-nowrap">{LevelLabels[level].split(' ')[0]}</div>
                          <div className="text-[10px] text-gray-400 font-mono">({count})</div>
                        </div>
                      )
                   })}
                 </div>
               </div>

               <div className="space-y-4">
                 <h3 className="text-md font-bold text-gray-500 uppercase tracking-wider ml-1">Detall per Competència</h3>
                 {competencyStats.map((comp, idx) => {
                   const total = comp.count || 1;
                   const pctNP = (comp.distribution[CompetencyLevel.NP] / total) * 100;
                   const pctNE = (comp.distribution[CompetencyLevel.NE] / total) * 100;
                   const pctNA = (comp.distribution[CompetencyLevel.NA] / total) * 100;
                   const pctAS = (comp.distribution[CompetencyLevel.AS] / total) * 100;
                   const pctAN = (comp.distribution[CompetencyLevel.AN] / total) * 100;
                   const pctAE = (comp.distribution[CompetencyLevel.AE] / total) * 100;

                   return (
                     <div key={comp.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-4 mb-3">
                          <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 font-bold text-sm flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            {comp.category && <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">{comp.category}</div>}
                            <div className="font-medium text-gray-800">{comp.description}</div>
                          </div>
                          <div className={`text-xl font-bold px-3 py-1 rounded-lg ${getScoreColor(parseFloat(comp.avg))}`}>
                            {comp.avg}
                          </div>
                        </div>

                        {/* Stacked Bar Chart */}
                        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex">
                          {pctNP > 0 && <div style={{ width: `${pctNP}%` }} className="h-full bg-gray-600" title={`NP: ${comp.distribution[CompetencyLevel.NP]}`}></div>}
                          {pctNE > 0 && <div style={{ width: `${pctNE}%` }} className="h-full bg-slate-400" title={`NE: ${comp.distribution[CompetencyLevel.NE]}`}></div>}
                          {pctNA > 0 && <div style={{ width: `${pctNA}%` }} className="h-full bg-red-400" title={`NA: ${comp.distribution[CompetencyLevel.NA]}`}></div>}
                          {pctAS > 0 && <div style={{ width: `${pctAS}%` }} className="h-full bg-amber-400" title={`AS: ${comp.distribution[CompetencyLevel.AS]}`}></div>}
                          {pctAN > 0 && <div style={{ width: `${pctAN}%` }} className="h-full bg-cyan-400" title={`AN: ${comp.distribution[CompetencyLevel.AN]}`}></div>}
                          {pctAE > 0 && <div style={{ width: `${pctAE}%` }} className="h-full bg-green-400" title={`AE: ${comp.distribution[CompetencyLevel.AE]}`}></div>}
                        </div>
                        
                        <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1 flex-wrap gap-y-1">
                           <span>{comp.count} respostes</span>
                           <span className="flex gap-2 flex-wrap">
                              {comp.distribution[CompetencyLevel.NP] > 0 && <span className="text-gray-600 font-bold">{comp.distribution[CompetencyLevel.NP]} NP</span>}
                              {comp.distribution[CompetencyLevel.NE] > 0 && <span className="text-slate-600 font-bold">{comp.distribution[CompetencyLevel.NE]} NE</span>}
                              {comp.distribution[CompetencyLevel.NA] > 0 && <span className="text-red-600 font-bold">{comp.distribution[CompetencyLevel.NA]} NA</span>}
                              {comp.distribution[CompetencyLevel.AS] > 0 && <span className="text-amber-600 font-bold">{comp.distribution[CompetencyLevel.AS]} AS</span>}
                              {comp.distribution[CompetencyLevel.AN] > 0 && <span className="text-cyan-600 font-bold">{comp.distribution[CompetencyLevel.AN]} AN</span>}
                              {comp.distribution[CompetencyLevel.AE] > 0 && <span className="text-green-600 font-bold">{comp.distribution[CompetencyLevel.AE]} AE</span>}
                           </span>
                        </div>
                     </div>
                   );
                 })}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalReport;
