import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface NotebookAnalysis {
  name: string;
  description: string;
  category: string;
  tags: string[];
}

export async function analyzeNotebookCode(codeSnippet: string): Promise<NotebookAnalysis> {
  // Truncate snippet to avoid context issues or extreme costs, keeping first 15k characters
  const truncatedCode = codeSnippet.substring(0, 15000);

  try {
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analise este trecho de código de um notebook do Google Colab e forneça metadados para organização em uma "Gaveta Digital". 
      Retorne um JSON com os campos: name, description, category, tags.
      Código:
      ${truncatedCode}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Nome curto e claro para o notebook" },
            description: { type: Type.STRING, description: "Descrição do que o código faz" },
            category: { type: Type.STRING, description: "Categoria principal (ex: Machine Learning, Data Viz, Automação)" },
            tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Tags relevantes" }
          },
          required: ["name", "description", "category", "tags"]
        }
      }
    });

    const result = await model;
    const text = result.text || '{}';
    return JSON.parse(text) as NotebookAnalysis;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Return fallback metadata if AI fails
    return {
      name: "Notebook sem nome",
      description: "Não foi possível analisar o código automaticamente.",
      category: "Geral",
      tags: []
    };
  }
}

export interface BatchReorganizationUpdate {
  notebookId: string;
  category: string;
  name: string;
}

export async function reorganizeAllCategories(notebooks: { id: string, name: string, description: string, category: string }[]): Promise<BatchReorganizationUpdate[]> {
  try {
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Você é um arquivista mestre. O usuário bagunçou as categorias dos notebooks dele.
      Analise a lista abaixo e sugira uma nova estrutura de categorias (Gavetas) que seja limpa, profissional e intuitiva.
      Tente agrupar notebooks semelhantes em categorias como "Projetos de IA", "Análise de Dados", "Automação Web", "Estudos Pessoais", etc.
      Evite ter 20 categorias diferentes; tente consolidar em umas 5-8 se possível.
      
      Lista de notebooks:
      ${JSON.stringify(notebooks.map(n => ({ id: n.id, currentName: n.name, currentCategory: n.category, description: n.description })))}
      
      Retorne um JSON com uma lista de objetos contendo: notebookId e a nova category sugerida. Também sugira um name melhor se o atual parecer confuso.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              notebookId: { type: Type.STRING },
              category: { type: Type.STRING },
              name: { type: Type.STRING }
            },
            required: ["notebookId", "category", "name"]
          }
        }
      }
    });

    const result = await model;
    return JSON.parse(result.text || '[]') as BatchReorganizationUpdate[];
  } catch (error) {
    console.error("Batch Reorganization Error:", error);
    return [];
  }
}
