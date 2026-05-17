import React, { useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { analyzeNotebookCode } from '../lib/gemini';
import { Sparkles, Loader2, Link as LinkIcon, Code } from 'lucide-react';

interface AddNotebookFormProps {
  userId: string;
  onSuccess: () => void;
}

export const AddNotebookForm: React.FC<AddNotebookFormProps> = ({ userId, onSuccess }) => {
  const [driveUrl, setDriveUrl] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveUrl) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Truncate snippet for storage to stay within Firestore limits (max 60k in rules)
      const storageSnippet = codeSnippet.substring(0, 50000);

      // Analyze with Gemini
      const analysis = await analyzeNotebookCode(storageSnippet || `Notebook URL: ${driveUrl}`);

      // Save to Firestore
      const notebookData = {
        userId,
        driveUrl,
        contentSnippet: storageSnippet,
        name: (analysis.name || 'Sem Nome').substring(0, 500),
        description: (analysis.description || '').substring(0, 5000),
        category: (analysis.category || 'Geral').substring(0, 200),
        tags: (analysis.tags || []).slice(0, 50),
        createdAt: serverTimestamp(),
        lastAnalyzed: serverTimestamp()
      };

      try {
        await addDoc(collection(db, 'notebooks'), notebookData);
      } catch (fErr) {
        handleFirestoreError(fErr, OperationType.CREATE, 'notebooks');
      }
      
      setDriveUrl('');
      setCodeSnippet('');
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError("Erro ao processar notebook. Verifique o código e tente novamente.");
      // Note: handleFirestoreError is called inside actual writing ops if needed, 
      // but here we catch top level for UI
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-white border border-[#1a1a1a]/10 p-8 rounded-sm shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles size={20} className="text-[#5A5A40]" />
        <h3 className="text-xl italic">Arquivar Novo Notebook</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 font-sans">
        <div>
          <label className="block text-[10px] uppercase tracking-widest font-bold opacity-50 mb-2">Link do Google Drive / Colab</label>
          <div className="relative">
            <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
            <input 
              type="url"
              required
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              placeholder="https://colab.research.google.com/drive/..."
              className="w-full bg-[#F5F5F0] border-none p-3 pl-10 focus:ring-1 focus:ring-[#1a1a1a] outline-none rounded-sm text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest font-bold opacity-50 mb-2">Trecho de Código (Opcional para análise mais precisa)</label>
          <div className="relative">
            <Code size={16} className="absolute left-3 top-3 opacity-30" />
            <textarea 
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              placeholder="Cole aqui a parte principal do seu código ou descrição do que o notebook faz..."
              rows={4}
              className="w-full bg-[#F5F5F0] border-none p-3 pl-10 focus:ring-1 focus:ring-[#1a1a1a] outline-none rounded-sm text-sm resize-none"
            />
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-xs italic">{error}</p>
        )}

        <button 
          type="submit"
          disabled={isAnalyzing}
          className="w-full bg-[#1a1a1a] text-[#F5F5F0] py-3 rounded-sm text-xs uppercase tracking-widest font-bold hover:bg-[#2a2a2a] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Arquivista analisando...
            </>
          ) : (
            'Organizar na Gaveta'
          )}
        </button>
      </form>
    </div>
  );
};
