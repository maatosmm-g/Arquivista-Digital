
export interface NotebookAnalysis {
  name: string;
  description: string;
  category: string;
  tags: string[];
}

export async function analyzeNotebookCode(codeSnippet: string): Promise<NotebookAnalysis> {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codeSnippet })
    });
    
    if (!response.ok) {
      const data = await response.json();
      if (data.fallback) return data.fallback;
      throw new Error('Analysis failed');
    }
    
    return await response.json();
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
    const response = await fetch('/api/reorganize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notebooks })
    });

    if (!response.ok) throw new Error('Reorganization failed');
    return await response.json();
  } catch (error) {
    console.error("Batch Reorganization Error:", error);
    return [];
  }
}
