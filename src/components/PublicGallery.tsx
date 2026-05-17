import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { NotebookCard } from './NotebookCard';
import { Loader2, Search, Layers, Archive as ArchiveIcon } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { nanoid } from 'nanoid';
import { getCategoryColor, getCategoryIcon } from '../lib/ui';

export const PublicGallery: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [ownerInfo, setOwnerInfo] = useState<any>(null);

  useEffect(() => {
    const fetchGallery = async () => {
      if (!userId) return;
      
      try {
        // Fetch owner info
        const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', userId)));
        if (!userSnap.empty) {
          setOwnerInfo(userSnap.docs[0].data());
        }

        // Fetch public notebooks
        const q = query(
          collection(db, 'notebooks'),
          where('userId', '==', userId),
          where('isPublic', '==', true),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setNotebooks(fetched);

        // Log Gallery Access
        const logId = nanoid();
        await setDoc(doc(db, 'access_logs', logId), {
          id: logId,
          targetId: userId,
          type: 'GALLERY_VIEW',
          accessedAt: serverTimestamp(),
          userAgent: navigator.userAgent,
          referrer: document.referrer || 'direto'
        });

      } catch (err) {
        console.error("Erro ao carregar galeria:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
  }, [userId]);

  const categories = Array.from(new Set(notebooks.map(n => n.category || 'Geral'))).sort();
  const filteredNotebooks = notebooks.filter(nb => {
    const matchesSearch = nb.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          nb.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || nb.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center p-8">
        <Loader2 size={48} className="animate-spin text-[#5A5A40] mb-4" />
        <p className="font-serif italic text-xl">Abrindo Gaveta Digital...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      {/* Header */}
      <header className="bg-[#1a1a1a] text-white py-16 px-8 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="grid grid-cols-8 gap-4 p-4 text-xs font-mono">
           {Array.from({length: 40}).map((_, i) => (
             <div key={i} className="opacity-20 translate-y-10 group-hover:translate-y-0 transition-transform">
               {nanoid(12)}
             </div>
           ))}
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="w-16 h-16 bg-white text-[#1a1a1a] mx-auto rounded-sm flex items-center justify-center text-2xl italic shadow-xl mb-6 font-bold">
            G
          </div>
          <h1 className="text-4xl md:text-5xl italic font-light mb-4">
            Catálogo de {ownerInfo?.displayName || 'Arquivos'}
          </h1>
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-50">
            Gaveta Digital • Portfólio de Notebooks e Documentos
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-16">
          {/* Filters */}
          <aside className="space-y-10">
            <div className="sticky top-12">
              <div className="mb-8">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-30 block mb-4">Pesquisa na Gaveta</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                  <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar nos arquivos..."
                    className="w-full bg-white border border-[#1a1a1a]/10 p-3 pl-10 rounded-sm text-sm outline-none focus:border-[#1a1a1a] transition-colors shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-30 block mb-4 flex items-center gap-2">
                  <Layers size={12} />
                  Categorias Públicas
                </label>
                <div className="space-y-px bg-[#1a1a1a]/5 p-1 rounded-sm">
                  <button 
                    onClick={() => setSelectedCategory(null)}
                    className={`block w-full text-left px-3 py-2 rounded-sm text-sm font-sans transition-all flex items-center justify-between ${!selectedCategory ? 'bg-[#5A5A40] text-white shadow-md' : 'hover:bg-[#1a1a1a]/5'}`}
                  >
                    <span>Todas</span>
                    <span className={`text-[10px] font-bold opacity-40 ${!selectedCategory ? 'text-white' : ''}`}>
                      {notebooks.length}
                    </span>
                  </button>
                  {categories.map((cat, idx) => {
                    const count = notebooks.filter(n => n.category === cat).length;
                    const accentColor = getCategoryColor(cat);
                    return (
                      <button 
                        key={idx}
                        onClick={() => setSelectedCategory(cat)}
                        className={`w-full text-left px-3 py-2 rounded-sm text-sm font-sans transition-all flex items-center gap-3 ${selectedCategory === cat ? 'bg-[#5A5A40] text-white shadow-md' : 'hover:bg-[#1a1a1a]/5'}`}
                      >
                        <span 
                          className="w-4 h-4 rounded-sm shrink-0 flex items-center justify-center" 
                          style={{ 
                            backgroundColor: selectedCategory === cat ? 'rgba(255,255,255,0.2)' : `${accentColor}15`,
                            color: selectedCategory === cat ? 'white' : accentColor 
                          }}
                        >
                          {getCategoryIcon(cat)}
                        </span>
                        <span className="truncate flex-1 font-medium">{cat}</span>
                        <span className={`text-[10px] font-bold opacity-40 ${selectedCategory === cat ? 'text-white' : ''}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <section className="space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1a1a1a]/10">
              <div>
                <h3 className="text-3xl font-light italic">
                  {selectedCategory ? selectedCategory : 'Todos os Itens Públicos'}
                </h3>
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-30 mt-1">
                  Exibindo {filteredNotebooks.length} notebooks
                </p>
              </div>
            </div>

            {filteredNotebooks.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                <AnimatePresence>
                  {filteredNotebooks.map(nb => (
                    <NotebookCard key={nb.id} notebook={nb} isSharedView={true} />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-32 bg-white/50 border-2 border-dashed border-[#1a1a1a]/5 rounded-sm">
                <ArchiveIcon size={48} className="mx-auto mb-4 opacity-10" />
                <p className="font-serif italic text-xl opacity-40">Nenhum arquivo público nesta seção.</p>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="py-20 mt-20 border-t border-[#1a1a1a]/10 text-center">
        <p className="text-sm italic opacity-40">Organizado via Gaveta Digital</p>
      </footer>
    </div>
  );
};
