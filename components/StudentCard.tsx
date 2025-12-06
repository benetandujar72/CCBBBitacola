
import React, { useEffect, useState, useMemo } from 'react';
import { Student, Competency, Evaluation, CompetencyLevel, LevelValues } from '../types';
import { generateFeedback } from '../services/geminiService';

interface StudentCardProps {
  student: Student;
  competencies: Competency[];
  subjectName: string;
  evaluations: Evaluation[];
  onUpdateEvaluation: (competencyId: string, level: CompetencyLevel) => void;
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
  answerKeys: Record<string, Record<string, string>>;
}

const StudentCard: React.FC<StudentCardProps> = ({
  student,
  competencies,
  subjectName,
  evaluations,
  onUpdateEvaluation,
  answerKeys,
}) => {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string>('');
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // Detect if subject has Answer Key from props
  const answerKeySubject = Object.keys(answerKeys).find(k => 
    subjectName.toLowerCase().includes(k.toLowerCase())
  );
  const subjectKey = answerKeySubject ? answerKeys[answerKeySubject] : null;

  useEffect(() => {
    setAnimationKey(k => k + 1);
    setAiFeedback('');
    setShowFeedbackModal(false);
  }, [student.id]);

  const getEvaluation = (competencyId: string) => {
    return evaluations.find(e => e.competencyId === competencyId && e.studentId === student.id);
  };

  const handleGenerateFeedback = async () => {
    setLoadingFeedback(true);
    const results = competencies.map(c => {
      const evalItem = getEvaluation(c.id);
      return {
        competency: c.description,
        level: evalItem?.level || 'No avaluat'
      };
    });
    
    const feedback = await generateFeedback(student.name, subjectName, results);
    setAiFeedback(feedback);
    setLoadingFeedback(false);
  };

  // Calculate Average / Score
  const stats = useMemo(() => {
    let total = 0;
    let count = 0;
    let correctCount = 0;
    let testQuestionsCount = 0;

    competencies.forEach(c => {
      const ev = getEvaluation(c.id);
      const isTestItem = subjectKey && c.description.toLowerCase().includes('pregunta');
      
      if (isTestItem) testQuestionsCount++;

      if (ev && ev.level) {
        // Use numericValue if available (for 0/1 tests), otherwise map from Level
        const val = ev.numericValue !== undefined ? ev.numericValue : LevelValues[ev.level];
        total += val;
        if (val === 1 && isTestItem) correctCount++;
        count++;
      }
    });

    return {
      average: count > 0 ? (total / count).toFixed(1) : null,
      correct: correctCount,
      totalTestItems: testQuestionsCount,
      totalAnswered: count
    };
  }, [competencies, evaluations, student.id, subjectKey]);

  // Helper to determine if a category is a Test/Form category
  const isTestCategory = (category: string, comps: Competency[]) => {
    return category.toLowerCase().includes('prova') || 
           category.toLowerCase().includes('test') ||
           category.toLowerCase().includes('resolució') ||
           category.toLowerCase().includes('científic') ||
           comps.some(c => c.description.toLowerCase().includes('pregunta '));
  };

  // Group Competencies and SPLIT into Manual vs Test
  const { manualGroups, testGroups } = useMemo(() => {
    const grouped: Record<string, Competency[]> = {};
    competencies.forEach(c => {
      const cat = c.category || 'General';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(c);
    });

    const manual: [string, Competency[]][] = [];
    const test: [string, Competency[]][] = [];

    Object.entries(grouped).forEach(([cat, comps]) => {
      if (isTestCategory(cat, comps)) {
        test.push([cat, comps]);
      } else {
        manual.push([cat, comps]);
      }
    });

    return { manualGroups: manual, testGroups: test };
  }, [competencies]);

  const getScoreColor = (score: number) => {
    if (score >= 3.5) return 'text-green-600 bg-green-50';
    if (score >= 2.5) return 'text-blue-600 bg-blue-50';
    if (score >= 1.5) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const renderCategorySection = (category: string, comps: Competency[], isTestSection: boolean) => (
    <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 font-bold text-xs uppercase text-gray-500 tracking-wider sticky top-0 z-0">
        {category}
      </div>
      
      {isTestSection ? (
        // --- TEST MODE VIEW (TABLE) ---
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 w-1/3">Pregunta</th>
                <th className="px-4 py-3 text-center">Resposta Alumne</th>
                <th className="px-4 py-3 text-center">Correcta</th>
                <th className="px-4 py-3 text-right">Punts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {comps.map((comp) => {
                const ev = getEvaluation(comp.id);
                const qNumMatch = comp.description.match(/(\d+(\.\d+)?)/);
                const qNum = qNumMatch ? qNumMatch[0] : comp.description;
                const correctAns = subjectKey ? subjectKey[qNum] : '-';
                const isCorrect = ev?.numericValue === 1;
                const hasAnswer = ev?.numericValue !== undefined;

                return (
                  <tr key={comp.id} className={hasAnswer ? (isCorrect ? 'bg-green-50/30' : 'bg-red-50/30') : ''}>
                    <td className="px-4 py-3 font-medium text-gray-700">{comp.description}</td>
                    <td className="px-4 py-3 text-center font-mono text-indigo-600 font-bold">
                      {ev?.studentResponse || '-'}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-gray-500">
                      {correctAns}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {hasAnswer ? (
                        <span className={isCorrect ? 'text-green-600' : 'text-red-500'}>
                          {ev?.numericValue}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        // --- MANUAL EVALUATION VIEW (BUTTONS) ---
        <div className="divide-y divide-gray-50">
          {comps.map((comp) => {
            const currentLevel = getEvaluation(comp.id)?.level;
            
            // SPECIAL CHECK: Is this category requiring 0-1-2 scale?
            // "Competència discursiva" or "Competència lingüística"
            // Works for 'Anglès' because the category strings are in Catalan.
            const isSpecialScale = ['Competència discursiva', 'Competència lingüística'].some(c => category.trim().toLowerCase().includes(c.toLowerCase()));

            return (
              <div key={comp.id} className="px-3 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 text-sm font-medium text-gray-700 leading-snug">
                  {comp.description}
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 min-w-[260px]">
                  
                  {isSpecialScale ? (
                    // --- 0, 1, 2 SCALE BUTTONS ---
                    // Mapping: 0->NP, 1->NA, 2->AS
                    [
                      { val: 0, lvl: CompetencyLevel.NP, label: '0', color: 'bg-gray-600' },
                      { val: 1, lvl: CompetencyLevel.NA, label: '1', color: 'bg-orange-500' },
                      { val: 2, lvl: CompetencyLevel.AS, label: '2', color: 'bg-green-600' }
                    ].map((btn) => {
                       const isSelected = currentLevel === btn.lvl;
                       return (
                         <button
                           key={btn.val}
                           onClick={() => onUpdateEvaluation(comp.id, btn.lvl)}
                           className={`
                             w-12 h-10 rounded-lg flex items-center justify-center font-bold text-sm border transition-all
                             ${isSelected 
                               ? `${btn.color} text-white ring-2 ring-offset-1 ring-${btn.color.replace('bg-', '')}` 
                               : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}
                           `}
                         >
                           {btn.label}
                         </button>
                       )
                    })
                  ) : (
                    // --- STANDARD RUBRIC SCALE BUTTONS ---
                    [CompetencyLevel.NP, CompetencyLevel.NE, CompetencyLevel.NA, CompetencyLevel.AS, CompetencyLevel.AN, CompetencyLevel.AE].map((level) => {
                      const val = LevelValues[level];
                      const isSelected = currentLevel === level;
                      let baseColor = 'bg-gray-50 text-gray-400 border-gray-200';
                      let activeColor = '';
                      if (val === 0) activeColor = 'bg-gray-600 text-white border-gray-700 ring-gray-200';
                      if (val === 0.5) activeColor = 'bg-slate-200 text-slate-700 border-slate-400 ring-slate-200';
                      if (val === 1) activeColor = 'bg-red-100 text-red-600 border-red-300 ring-red-100';
                      if (val === 2) activeColor = 'bg-orange-100 text-orange-600 border-orange-300 ring-orange-100';
                      if (val === 3) activeColor = 'bg-blue-100 text-blue-600 border-blue-300 ring-blue-100';
                      if (val === 4) activeColor = 'bg-green-100 text-green-600 border-green-300 ring-green-100';

                      return (
                        <button
                          key={level}
                          onClick={() => onUpdateEvaluation(comp.id, level)}
                          className={`
                            w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-bold border transition-all
                            ${isSelected ? `${activeColor} ring-2 scale-110 shadow-sm` : baseColor}
                          `}
                        >
                          {val}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div key={animationKey} className="w-full animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex justify-between items-center sticky top-0 z-10 border border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-800 leading-tight">{student.name}</h2>
          <p className="text-xs text-gray-400 truncate max-w-[200px]">{student.email}</p>
        </div>
        <div className="flex items-center gap-2">
           {stats.totalTestItems > 0 && (
             <div className="px-3 py-1 bg-gray-100 rounded-lg text-gray-600 font-bold text-sm border border-gray-200">
               Encerts: {stats.correct}
             </div>
           )}
           {stats.average ? (
             <div className={`px-3 py-1 rounded-lg font-black text-xl ${getScoreColor(Number(stats.average))}`}>
               {stats.average}
             </div>
           ) : (
             <div className="px-3 py-1 bg-gray-100 rounded-lg text-gray-400 font-bold text-sm">--</div>
           )}
           <button 
             onClick={() => setShowFeedbackModal(true)}
             className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md flex items-center justify-center hover:scale-105 transition-transform"
           >
             ✨
           </button>
        </div>
      </div>

      <div className="space-y-6 pb-20">
        {/* RENDER MANUAL CATEGORIES FIRST */}
        {manualGroups.map(([cat, comps]) => renderCategorySection(cat, comps, false))}
        
        {/* SEPARATOR FOR IMPORTED RESULTS */}
        {testGroups.length > 0 && (
          <div className="pt-4 pb-2">
             <div className="flex items-center gap-4">
               <div className="h-px bg-gray-200 flex-1"></div>
               <h3 className="text-gray-400 font-bold text-xs uppercase tracking-widest">Resultats Prova Competencial (Importats)</h3>
               <div className="h-px bg-gray-200 flex-1"></div>
             </div>
          </div>
        )}

        {/* RENDER TEST CATEGORIES LAST */}
        {testGroups.map(([cat, comps]) => renderCategorySection(cat, comps, true))}
      </div>

      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 flex justify-between items-center">
               <h3 className="text-white font-bold flex items-center gap-2">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                 Assistent AI
               </h3>
               <button onClick={() => setShowFeedbackModal(false)} className="text-white/80 hover:text-white">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
            <div className="p-6">
              {loadingFeedback ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              ) : (
                <div className="min-h-[100px]">
                   {aiFeedback ? (
                     <p className="text-gray-700 leading-relaxed italic">"{aiFeedback}"</p>
                   ) : (
                     <div className="text-center text-gray-500 py-4">
                       <p className="mb-4 text-sm">Genera un comentari automàtic basat en les notes actuals.</p>
                       <button 
                         onClick={handleGenerateFeedback}
                         className="px-6 py-2 bg-indigo-600 text-white rounded-full font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
                       >
                         Generar Feedback
                       </button>
                     </div>
                   )}
                </div>
              )}
              {aiFeedback && !loadingFeedback && (
                 <div className="mt-6 flex justify-end">
                   <button 
                     onClick={handleGenerateFeedback}
                     className="text-indigo-600 text-sm font-bold hover:underline"
                   >
                     Regenerar
                   </button>
                 </div>
              )}
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default StudentCard;
