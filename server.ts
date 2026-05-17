import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";

let genAI: GoogleGenAI | null = null;
function getGenAI() {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    genAI = new GoogleGenAI(key);
  }
  return genAI;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/analyze", async (req, res) => {
    try {
      const { codeSnippet } = req.body;
      if (!codeSnippet) return res.status(400).json({ error: "Code snippet is required" });

      const truncatedCode = codeSnippet.substring(0, 15000);
      const ai = getGenAI();
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Analise este trecho de código de um notebook do Google Colab e forneça metadados para organização em uma "Gaveta Digital". 
      Retorne um JSON com os campos: name, description, category, tags.
      Código:
      ${truncatedCode}
      `;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
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

      const response = await result.response;
      res.json(JSON.parse(response.text()));
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      res.status(500).json({ 
        error: "Failed to analyze notebook",
        fallback: {
          name: "Notebook sem nome",
          description: "Não foi possível analisar o código automaticamente.",
          category: "Geral",
          tags: []
        }
      });
    }
  });

  app.post("/api/reorganize", async (req, res) => {
    try {
      const { notebooks } = req.body;
      if (!notebooks || !Array.isArray(notebooks)) return res.status(400).json({ error: "Notebooks array is required" });

      const ai = getGenAI();
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Você é um arquivista mestre. O usuário bagunçou as categorias dos notebooks dele.
      Analise a lista abaixo e sugira uma nova estrutura de categorias (Gavetas) que seja limpa, profissional e intuitiva.
      Tente agrupar notebooks semelhantes em categorias como "Projetos de IA", "Análise de Dados", "Automação Web", "Estudos Pessoais", etc.
      Evite ter 20 categorias diferentes; tente consolidar em umas 5-8 se possível.
      
      Lista de notebooks:
      ${JSON.stringify(notebooks.map((n: any) => ({ id: n.id, currentName: n.name, currentCategory: n.category, description: n.description })))}
      
      Retorne um JSON com uma lista de objetos contendo: notebookId e a nova category sugerida. Também sugira um name melhor se o atual parecer confuso.
      `;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
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

      const response = await result.response;
      res.json(JSON.parse(response.text()));
    } catch (error) {
      console.error("Batch Reorganization Error:", error);
      res.status(500).json({ error: "Failed to reorganize categories" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
