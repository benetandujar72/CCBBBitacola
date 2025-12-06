
import { Student, Evaluation, Competency, ValueToLevel, CompetencyLevel } from '../types';

interface GradeResult {
  level: CompetencyLevel | null;
  numericValue?: number;
  studentResponse?: string;
}

export const parseAnswerKeyCSV = (csvText: string): Record<string, Record<string, string>> => {
  const keys: Record<string, Record<string, string>> = {};
  const lines = csvText.split('\n');
  
  // Skip header if present (Materia,Pregunta,Resposta)
  lines.forEach(line => {
    const parts = line.trim().split(',');
    if (parts.length < 3) return;
    
    const subject = parts[0].trim(); // e.g., Matemàtiques
    const question = parts[1].trim(); // e.g., 1 or 4.1
    const answer = parts[2].trim();   // e.g., c or Sí
    
    if (subject.toLowerCase() === 'materia') return; // Header row

    if (!keys[subject]) {
      keys[subject] = {};
    }
    keys[subject][question] = answer;
  });
  
  return keys;
};

/**
 * Fetches data from a Google Sheet via API v4
 */
export const fetchSheetValues = async (sheetId: string, accessToken: string, range: string = 'A1:ZZ200') => {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Error fetching sheet');
    }

    const data = await response.json();
    return data.values; // Array of arrays
  } catch (error) {
    console.error("Error fetching from Google Sheets:", error);
    throw error;
  }
};

/**
 * Calculates the grade based on the cell value and the answer key.
 */
const calculateGrade = (cellValue: any, questionNum: string, subjectKey: Record<string, string> | null): GradeResult | null => {
  let levelCode: CompetencyLevel | null = null;
  let numericValue: number | undefined;
  const studentResponse = String(cellValue).trim();

  // SCENARIO A: Automatic Grading (Test Mode) - Based on Answer Key
  const correctAnswer = subjectKey ? subjectKey[questionNum] : null;

  if (correctAnswer) {
     const cleanResponse = studentResponse.toLowerCase();
     const cleanCorrect = String(correctAnswer).trim().toLowerCase();
     
     // Skip manual grading questions
     if (cleanCorrect === 'manual') {
       return null; 
     }

     if (cleanResponse === cleanCorrect) {
       levelCode = CompetencyLevel.AE; // Visual Green for Correct
       numericValue = 1;
     } else {
       levelCode = CompetencyLevel.NA; // Visual Red for Incorrect
       numericValue = 0;
     }
     return { level: levelCode, numericValue, studentResponse };
  } 
  // SCENARIO B: Numeric Import (Rubric Mode)
  else {
     // Try to parse as rubric score
     let numVal = parseFloat(studentResponse.replace(',', '.'));
     if (!isNaN(numVal)) {
       // Include 0 (NP) in valid levels
       const validLevels = [0, 0.5, 1, 2, 3, 4];
       const nearest = validLevels.reduce((prev, curr) => 
         Math.abs(curr - numVal) < Math.abs(prev - numVal) ? curr : prev
       );
       levelCode = ValueToLevel[nearest];
       numericValue = nearest;
       return { level: levelCode, numericValue };
     }
  }
  return null;
};

/**
 * Processes raw sheet data. Handles two formats:
 * 1. Matrix Mode (Teacher View): Rows = Questions, Columns = Students
 * 2. Form Mode (Response View): Rows = Students, Columns = Questions
 */
export const processSheetData = (
  rawValues: any[][], 
  existingStudents: Student[], 
  existingCompetencies: Competency[],
  targetSubjectId: string,
  targetSubjectName: string,
  answerKeys: Record<string, Record<string, string>>
): { newEvaluations: Evaluation[], logs: string[] } => {
  const newEvaluations: Evaluation[] = [];
  const logs: string[] = [];

  if (!rawValues || rawValues.length < 2) {
    logs.push("Full de càlcul buit o amb format incorrecte.");
    return { newEvaluations, logs };
  }

  // Detect Answer Key from passed state
  const answerKeySubject = Object.keys(answerKeys).find(k => 
    targetSubjectName.toLowerCase().includes(k.toLowerCase())
  );
  const subjectKey = answerKeySubject ? answerKeys[answerKeySubject] : null;

  if (subjectKey) {
    logs.push(`S'ha detectat pauta de correcció per: ${answerKeySubject}`);
  }

  const headerRow = rawValues[0];

  // --- FORMAT DETECTION ---
  // Look for "Adreça electrònica", "Email", or "Dirección de correo" in header row to identify FORM mode
  const emailColIndex = headerRow.findIndex((cell: string) => 
    cell && (typeof cell === 'string') && (
      cell.toLowerCase().includes('adreça electrònica') || 
      cell.toLowerCase().includes('email') || 
      cell.toLowerCase().includes('correu')
    )
  );

  const isFormFormat = emailColIndex !== -1;

  if (isFormFormat) {
    // --- FORM FORMAT (Students in Rows, Questions in Cols) ---
    logs.push("Format detectat: Respostes de Formulari (Alumnes en files).");

    // 1. Map Columns to Competencies
    const colToCompetency = new Map<number, { id: string, qNum: string }>();
    
    headerRow.forEach((cellValue: string, index: number) => {
       if (!cellValue) return;
       const header = String(cellValue).trim();
       
       // CRITICAL FIX: Strict matching logic to avoid "Pregunta 12" matching "Pregunta 1"
       
       const matchedCompetency = existingCompetencies.find(c => {
         if (c.subjectId !== targetSubjectId) return false;
         
         // Extract numbers strictly
         // Matches: "Pregunta 10", "P10", "10", "10.1"
         const hNumMatch = header.match(/(\d+(\.\d+)?)/); 
         const cNumMatch = c.description.match(/(\d+(\.\d+)?)/);
         
         // Strategy 1: Numeric Match (Best for "Pregunta 1" vs "Pregunta 12")
         // We compare the full numeric string exactly.
         if (hNumMatch && cNumMatch) {
            return hNumMatch[0] === cNumMatch[0];
         }

         // Strategy 2: Exact String Match (Fallback for non-numeric headers)
         return c.description.toLowerCase() === header.toLowerCase();
       });
       
       if (matchedCompetency) {
         // Extract Question Number for Answer Key (e.g., "Pregunta 4.1" -> "4.1")
         const questionNumMatch = header.match(/(\d+(\.\d+)?)/);
         const questionNum = questionNumMatch ? questionNumMatch[0] : header;
         
         colToCompetency.set(index, { id: matchedCompetency.id, qNum: questionNum });
       }
    });

    logs.push(`S'han identificat ${colToCompetency.size} columnes de preguntes.`);

    // 2. Iterate Rows (Students)
    for (let i = 1; i < rawValues.length; i++) {
      const row = rawValues[i];
      const email = String(row[emailColIndex] || '').trim().toLowerCase();
      
      if (!email) continue;

      // Find student by email
      const student = existingStudents.find(s => s.email && s.email.toLowerCase() === email);
      
      if (!student) {
        continue;
      }

      // 3. Grade Answers
      colToCompetency.forEach((compData, colIndex) => {
         const cellValue = row[colIndex];
         if (cellValue === undefined || cellValue === '' || cellValue === null) return;

         const gradeData = calculateGrade(cellValue, compData.qNum, subjectKey);
         
         if (gradeData && gradeData.level) {
           newEvaluations.push({
             studentId: student.id,
             competencyId: compData.id,
             level: gradeData.level,
             numericValue: gradeData.numericValue,
             studentResponse: gradeData.studentResponse
           });
         }
      });
    }

  } else {
    // --- MATRIX FORMAT (Teacher Gradebook: Students in Cols, Questions in Rows) ---
    logs.push("Format detectat: Matriu de Docent (Alumnes en columnes).");

    // 1. Identify Header Row (finding Students)
    const studentColMap = new Map<number, string>();
    
    headerRow.forEach((cellValue: any, colIndex: number) => {
      if (!cellValue || typeof cellValue !== 'string') return;
      const cleanHeader = cellValue.toLowerCase().trim();
      
      const matchedStudent = existingStudents.find(s => {
         const sName = s.name.toLowerCase();
         return cleanHeader.includes(sName) || sName.includes(cleanHeader.split('-')[1]?.trim() || '_____');
      });

      if (matchedStudent) {
        studentColMap.set(colIndex, matchedStudent.id);
      }
    });

    logs.push(`S'han detectat ${studentColMap.size} columnes d'alumnes.`);

    // 2. Iterate Rows (Questions)
    for (let i = 1; i < rawValues.length; i++) {
      const row = rawValues[i];
      const firstCol = row[0]; 

      if (!firstCol) continue;
      
      const rowLabelRaw = String(firstCol).trim();
      
      // Use the same Strict Matching logic for Matrix rows
      const matchedCompetency = existingCompetencies.find(c => {
        if (c.subjectId !== targetSubjectId) return false;

        const rNumMatch = rowLabelRaw.match(/(\d+(\.\d+)?)/);
        const cNumMatch = c.description.match(/(\d+(\.\d+)?)/);

        if (rNumMatch && cNumMatch) {
           return rNumMatch[0] === cNumMatch[0];
        }
        return c.description.toLowerCase() === rowLabelRaw.toLowerCase();
      });

      if (matchedCompetency) {
        const questionNumMatch = rowLabelRaw.match(/(\d+(\.\d+)?)/);
        const questionNum = questionNumMatch ? questionNumMatch[0] : rowLabelRaw;

        studentColMap.forEach((studentId, colIndex) => {
          const cellValue = row[colIndex];
          if (cellValue === undefined || cellValue === null || cellValue === '') return;

          const gradeData = calculateGrade(cellValue, questionNum, subjectKey);

          if (gradeData && gradeData.level) {
             newEvaluations.push({
               studentId: studentId,
               competencyId: matchedCompetency.id,
               level: gradeData.level,
               numericValue: gradeData.numericValue
             });
          }
        });
      }
    }
  }

  logs.push(`S'han processat ${newEvaluations.length} respostes/notes.`);
  return { newEvaluations, logs };
};
