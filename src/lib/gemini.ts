export interface NotebookAnalysis {
  name: string;
  description: string;
  category: string;
  tags: string[];
}

export async function analyzeNotebookCode(codeSnippet: string): Promise<NotebookAnalysis> {
  try {
    // MUDANÇA AQUI: chamar a Netlify Function em vez de /api/analyze
    const response = await fetch('/.netlify/functions/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'analyze',
        codeSnippet: codeSnippet.substring(0, 5000) 
      })
    });
    
    if (!response.ok) {
      throw new Error('Analysis failed');
    }
    
    const data = await response.json();
    
    // Se a resposta for um objeto com campo response, use ele
    const result = data.response || data;
    
    return {
      name: result.name || "Notebook sem nome",
      description: result.description || "Não foi possível analisar o código automaticamente.",
      category: result.category || "Geral",
      tags: result.tags || []
    };
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
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
    // MUDANÇA AQUI: chamar a Netlify Function
    const response = await fetch('/.netlify/functions/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'reorganize',
        notebooks 
      })
    });

    if (!response.ok) throw new Error('Reorganization failed');
    
    const data = await response.json();
    const result = data.response || data;
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Batch Reorganization Error:", error);
    return [];
  }
}
