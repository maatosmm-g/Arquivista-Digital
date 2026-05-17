import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import { NotebookCard } from './NotebookCard';
import { Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { nanoid } from 'nanoid';

export const SharedView: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [notebook, setNotebook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedNotebook = async () => {
      if (!shareId) return;
      
      try {
        const q = query(
          collection(db, 'notebooks'),
          where('shareId', '==', shareId),
          where('isPublic', '==', true)
        );
        
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          setError("Notebook não encontrado ou link privado.");
          setLoading(false);
          return;
        }

        const data = snapshot.docs[0].data();
        const id = snapshot.docs[0].id;
        setNotebook({ ...data, id });

        // Log access
        const logId = nanoid();
        await setDoc(doc(db, 'access_logs', logId), {
          id: logId,
          notebookId: id,
          accessedAt: serverTimestamp(),
          userAgent: navigator.userAgent,
          referrer: document.referrer || 'direto'
        });

        // Increment views
        await setDoc(doc(db, 'notebooks', id), {
          views: increment(1)
        }, { merge: true });

      } catch (err) {
        console.error("Erro ao buscar notebook compartilhado:", err);
        setError("Ocorreu um erro ao carregar o notebook.");
      } finally {
        setLoading(false);
      }
    };

    fetchSharedNotebook();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center p-8">
        <Loader2 size={48} className="animate-spin text-[#5A5A40] mb-4" />
        <p className="font-serif italic text-xl">Carregando notebook compartilhado...</p>
      </div>
    );
  }

  if (error || !notebook) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle size={64} className="text-red-500 mb-6 opacity-20" />
        <h2 className="text-4xl italic font-light mb-4">Ops!</h2>
        <p className="text-xl opacity-60 font-sans max-w-md mx-auto leading-relaxed">
          {error || "Este link parece ser inválido ou expirou."}
        </p>
        <a 
          href="/" 
          className="mt-8 px-6 py-3 bg-[#1a1a1a] text-white rounded-sm text-xs uppercase tracking-widest font-bold hover:bg-[#5A5A40] transition-colors"
        >
          Voltar para Início
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] py-20 px-8">
      <div className="max-w-xl mx-auto">
        <div className="mb-12 text-center">
          <div className="w-16 h-16 bg-[#1a1a1a] mx-auto rounded-sm flex items-center justify-center text-[#F5F5F0] text-2xl italic shadow-xl mb-6">
            G
          </div>
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-30">Notebook Compartilhado via Gaveta Digital</p>
        </div>
        
        <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
        >
          <NotebookCard notebook={notebook} isSharedView={true} />
        </motion.div>

        <div className="mt-16 pt-16 border-t border-[#1a1a1a]/10 text-center">
          <p className="text-sm italic opacity-60 mb-4">Gostou da organização?</p>
          <a 
            href="/" 
            className="inline-block px-8 py-4 bg-white border border-[#1a1a1a]/20 text-xs uppercase tracking-widest font-bold hover:bg-[#1a1a1a] hover:text-white transition-all shadow-sm"
          >
            Crie sua própria Gaveta Digital
          </a>
        </div>
      </div>
    </div>
  );
};
