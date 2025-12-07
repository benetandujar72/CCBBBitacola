
import { GoogleGenAI, Type } from "@google/genai";
import { ImportData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const parseRawInputToData = async (rawText: string): Promise<ImportData[] | null> => {
  try {
    const model = "gemini-2.5-flash";
    const prompt = `
      Analitza el següent text proporcionat per un docent. 
      El text pot contenir informació d'un sol grup o de MÚLTIPLES grups diferents (ex: 1r A, 1r B, etc.).
      
      Per a CADA grup que detectis en el text, extreu:
      1. Nom del grup (ex: 1r ESO A)
      2. Matèria (ex: Matemàtiques)
      3. Llista d'alumnes d'aquell grup
      4. Llista de competències o criteris. Si són comuns per a tots, repeteix-los per a cada grup. Si no en trobes, inventa'n 3 de generals.

      Retorna una LLISTA (Array) d'objectes JSON, un per a cada grup classe detectat.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: [
        { role: "user", parts: [{ text: prompt }] },
        { role: "user", parts: [{ text: `Text del docent:\n${rawText}` }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              groupName: { type: Type.STRING, description: "Nom del grup o classe" },
              subjectName: { type: Type.STRING, description: "Nom de la matèria o assignatura" },
              students: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Llista de noms d'alumnes"
              },
              competencies: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Llista de criteris o competències a avaluar"
              }
            },
            required: ["groupName", "subjectName", "students", "competencies"]
          }
        }
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      // Ensure we always return an array, even if the model returns a single object by mistake (though schema enforces array)
      return Array.isArray(parsed) ? parsed : [parsed];
    }
    return null;
  } catch (error) {
    console.error("Error parsing input with Gemini:", error);
    throw new Error("No s'ha pogut processar el text. Torna-ho a provar.");
  }
};

export const generateFeedback = async (
  studentName: string,
  subject: string,
  results: { competency: string; level: string }[]
): Promise<string> => {
  try {
    const model = "gemini-2.5-flash";
    const prompt = `
      Ets un assistent per a docents. Genera un comentari de retroacció (feedback) per a l'alumne ${studentName} 
      de la matèria ${subject}.
      Utilitza un to constructiu, motivador i professional en Català.
      Basat en els següents resultats (escala 0-4):
      ${JSON.stringify(results)}
      
      0 = No Presentat / Zero (NP)
      0.5 = Molt Baix / Insuficient (NE)
      1 = No Assolit (NA)
      2 = Assoliment Satisfactori (AS)
      3 = Assoliment Notable (AN)
      4 = Assoliment Excel·lent (AE)

      Màxim 50 paraules.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "";
  } catch (error) {
    console.error("Error generating feedback:", error);
    return "No s'ha pogut generar el feedback automàtic.";
  }
};
