import React, { useState } from 'react';
import { ExternalLink, Tag, Calendar, Trash2, Share2, Globe, Lock, BarChart2, X, History, MousePointer2, Edit2, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, deleteDoc, updateDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { getCategoryColor, getCategoryIcon } from '../lib/ui';
import { nanoid } from 'nanoid';

interface NotebookCardProps {
  notebook: {
    id: string;
    userId: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    driveUrl: string;
    createdAt: any;
    isPublic?: boolean;
    shareId?: string;
    views?: number;
  };
  isSharedView?: boolean;
}

export const NotebookCard: React.FC<NotebookCardProps> = ({ notebook, isSharedView = false }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(notebook.description);
  const [isSaving, setIsSaving] = useState(false);
  
  const date = notebook.createdAt?.toDate?.()?.toLocaleDateString() || 'Recente';
  const accentColor = getCategoryColor(notebook.category || 'Geral');

  const handleUpdateDescription = async () => {
    if (editedDescription === notebook.description) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const docRef = doc(db, 'notebooks', notebook.id);
      await updateDoc(docRef, {
        description: editedDescription
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao atualizar descrição:", error);
      alert("Erro ao salvar descrição.");
    } finally {
      setIsSaving(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    setShowLogs(true);
    try {
      const q = query(
        collection(db, 'access_logs'),
        where('notebookId', '==', notebook.id),
        orderBy('accessedAt', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      setLogs(snapshot.docs.map(d => d.data()));
    } catch (err) {
      console.error("Erro ao buscar logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const togglePublic = async () => {
    setIsSharing(true);
    try {
      const newIsPublic = !notebook.isPublic;
      const updates: any = { isPublic: newIsPublic };
      
      if (newIsPublic && !notebook.shareId) {
        updates.shareId = nanoid(10);
      }
      
      await updateDoc(doc(db, 'notebooks', notebook.id), updates);
      setShareFeedback(newIsPublic ? "Link público gerado!" : "Link desativado.");
      setTimeout(() => setShareFeedback(null), 3000);
    } catch (error) {
      console.error("Erro ao alternar visibilidade:", error);
    } finally {
      setIsSharing(false);
    }
  };

  const copyShareLink = () => {
    if (!notebook.shareId) return;
    const url = `${window.location.origin}/share/${notebook.shareId}`;
    navigator.clipboard.writeText(url);
    setShareFeedback("Copiado!");
    setTimeout(() => setShareFeedback(null), 2000);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDeleting(true);
    try {
      const docRef = doc(db, 'notebooks', notebook.id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Erro ao excluir notebook:", error);
      try {
        handleFirestoreError(error, OperationType.DELETE, `notebooks/${notebook.id}`);
      } catch {
        alert("Não foi possível excluir o notebook. Verifique suas permissões.");
      }
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -5 }}
        className="bg-white border border-[#1a1a1a]/10 p-7 rounded-sm flex flex-col h-full group relative overflow-hidden transition-shadow hover:shadow-xl"
      >
        {/* Category Accent */}
        <div 
          className="absolute top-0 left-0 w-full h-1" 
          style={{ backgroundColor: accentColor }}
        />
        
        <div className="flex justify-between items-start mb-6">
          <div 
            className="flex items-center gap-2 text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-sm"
            style={{ backgroundColor: `${accentColor}10`, color: accentColor }}
          >
            {getCategoryIcon(notebook.category || 'Geral')}
            {notebook.category || 'Sem Categoria'}
          </div>
          {!isSharedView && (
            <div className="flex gap-2 relative">
              <AnimatePresence>
                {shareFeedback && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute -top-8 right-0 text-[10px] bg-[#1a1a1a] text-white px-2 py-1 rounded-sm whitespace-nowrap z-50 shadow-lg"
                  >
                    {shareFeedback}
                  </motion.div>
                )}
              </AnimatePresence>

              {notebook.isPublic && (
                <button 
                  onClick={copyShareLink}
                  className="p-2 bg-[#F5F5F0] rounded-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-green-500 hover:text-white text-green-600/70"
                  title="Copiar link de acesso"
                >
                  <Share2 size={14} />
                </button>
              )}

              <button 
                onClick={togglePublic}
                disabled={isSharing}
                className={`p-2 bg-[#F5F5F0] rounded-sm opacity-0 group-hover:opacity-100 transition-all ${notebook.isPublic ? 'text-[#5A5A40]' : 'text-gray-400'}`}
                title={notebook.isPublic ? "Link público ativo" : "Tornar público"}
              >
                {notebook.isPublic ? <Globe size={14} /> : <Lock size={14} />}
              </button>

              {showConfirm ? (
                <div className="flex items-center gap-1 bg-red-50 p-1 rounded-sm border border-red-100 z-10 shadow-sm">
                  <button 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-[9px] uppercase tracking-tighter font-bold text-red-600 px-2 py-1 hover:bg-red-600 hover:text-white rounded-sm transition-colors"
                  >
                    {isDeleting ? 'Excluindo...' : 'Confirmar'}
                  </button>
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirm(false); }}
                    disabled={isDeleting}
                    className="text-[9px] uppercase tracking-tighter font-bold text-gray-500 px-2 py-1 hover:bg-gray-200 rounded-sm transition-colors"
                  >
                    Voltar
                  </button>
                </div>
              ) : (
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirm(true); }}
                  className="p-2 bg-[#F5F5F0] rounded-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white text-red-500/70"
                  title="Excluir notebook"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <a 
                href={notebook.driveUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-[#F5F5F0] rounded-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-[#1a1a1a] hover:text-white"
                title="Abrir no Google Drive"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          )}
        </div>

        <div className="flex-grow flex flex-col">
          <h3 className="text-2xl font-light italic mb-4 leading-tight">
            {notebook.name}
          </h3>
          
          <div className="relative group/desc">
            {isEditing ? (
              <div className="mb-8">
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="w-full bg-[#F5F5F0] border border-[#1a1a1a]/10 p-3 rounded-sm text-sm font-sans outline-none focus:border-[#5A5A40] transition-colors resize-none h-32"
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button 
                    onClick={() => { setIsEditing(false); setEditedDescription(notebook.description); }}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    disabled={isSaving}
                  >
                    <X size={16} />
                  </button>
                  <button 
                    onClick={handleUpdateDescription}
                    className="p-2 text-[#5A5A40] hover:text-green-600 transition-colors"
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <p className="font-sans text-sm opacity-60 line-clamp-4 leading-relaxed mb-8">
                  {notebook.description}
                </p>
                {!isSharedView && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="absolute -top-1 -right-1 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm opacity-0 group-hover/desc:opacity-100 transition-all hover:bg-[#5A5A40] hover:text-white"
                    title="Editar descrição"
                  >
                    <Edit2 size={12} />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mt-auto space-y-5">
            <div className="flex flex-wrap gap-2">
              {notebook.tags?.map((tag: string, idx: number) => (
                <span key={`${tag}-${idx}`} className="text-[10px] bg-[#F5F5F0] px-2 py-1 rounded-sm opacity-70 font-sans font-bold flex items-center gap-1 border border-[#1a1a1a]/5 hover:opacity-100 transition-opacity">
                  <Tag size={10} />
                  {tag}
                </span>
              ))}
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-[#1a1a1a]/5">
              <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] font-bold opacity-30">
                <Calendar size={12} />
                Arquivado em {date}
              </div>
              {!isSharedView && notebook.isPublic && (
                <button 
                  onClick={fetchLogs}
                  className="flex items-center gap-1 text-[9px] font-bold text-[#5A5A40] hover:underline"
                >
                  <BarChart2 size={10} />
                  <span>{notebook.views || 0} visualizações</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Logs Modal */}
      <AnimatePresence>
        {showLogs && (
          <div className="fixed inset-0 bg-[#1a1a1a]/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-sm overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-[#1a1a1a]/10 flex justify-between items-center bg-[#F5F5F0]">
                <div>
                  <h4 className="text-xl italic">Registro de Acessos</h4>
                  <p className="text-[9px] uppercase tracking-widest font-bold opacity-40 mt-1">{notebook.name}</p>
                </div>
                <button onClick={() => setShowLogs(false)} className="p-2 hover:bg-[#1a1a1a]/5 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-6 space-y-6">
                {loadingLogs ? (
                  <div className="flex flex-col items-center justify-center py-12 opacity-30 italic">
                    <History size={32} className="animate-spin mb-2" />
                    Buscando registros...
                  </div>
                ) : logs.length > 0 ? (
                  <div className="space-y-4">
                    {logs.map((log, i) => (
                      <div key={i} className="p-4 bg-[#F5F5F0] rounded-sm text-[11px] space-y-2 border border-[#1a1a1a]/5">
                        <div className="flex justify-between items-start">
                          <span className="font-bold uppercase tracking-widest text-[#5A5A40]">
                            {log.accessedAt?.toDate?.()?.toLocaleString() || 'Agora'}
                          </span>
                          <MousePointer2 size={12} className="opacity-20" />
                        </div>
                        <div className="opacity-60 font-sans">
                          <p><strong>Referram:</strong> {log.referrer}</p>
                          <p className="truncate" title={log.userAgent}><strong>Browser:</strong> {log.userAgent}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 opacity-30 italic">
                    Nenhum acesso registrado ainda.
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#F5F5F0] border-t border-[#1a1a1a]/10 text-center">
                <p className="text-[9px] uppercase tracking-widest font-bold opacity-30">Exibindo os últimos 20 acessos</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

