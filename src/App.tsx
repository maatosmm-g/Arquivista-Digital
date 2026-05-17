import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db, googleProvider } from './lib/firebase';
import { onAuthStateChanged, User, signInWithPopup } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Layout } from './components/Layout';
import { AddNotebookForm } from './components/AddNotebookForm';
import { NotebookCard } from './components/NotebookCard';
import { SharedView } from './components/SharedView';
import { PublicGallery } from './components/PublicGallery';
import { Search, Layers, Archive as ArchiveIcon, Plus, Edit2, Wand2, Loader2, Share2, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getCategoryColor, getCategoryIcon } from './lib/ui';
import { reorganizeAllCategories } from './lib/gemini';

function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showShareTooltip, setShowShareTooltip] = useState(false);

  const copyGalleryLink = () => {
    if (!user) return;
    const url = `${window.location.origin}/gallery/${user.uid}`;
    navigator.clipboard.writeText(url);
    setShowShareTooltip(true);
    setTimeout(() => setShowShareTooltip(false), 3000);
  };

  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      
      if (u) {
        // Sync user profile
        try {
          const userRef = doc(db, 'users', u.uid);
          await setDoc(userRef, {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            photoURL: u.photoURL,
            lastLoginAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          }, { merge: true });
        } catch (err: any) {
          console.error("Erro ao sincronizar perfil do usuário:", err);
          if (err.message?.includes('apiKey') || err.message?.includes('valid-api-key')) {
            setFirebaseError("A Chave de API do seu Firebase parece ser inválida. Verifique o arquivo firebase-applet-config.json e as configurações no Console do Firebase.");
          }
        }
      }
    }, (error: any) => {
      console.error("Erro no Auth:", error);
      if (error.message?.includes('apiKey') || error.message?.includes('api-key-not-valid')) {
        setFirebaseError("Erro de Configuração: Sua API Key do Firebase não é válida para este projeto. Verifique se o API Key no firebase-applet-config.json pertence ao projeto correto e se não possui restrições de IP/Referrer no Google Cloud Console.");
      } else if (error.message?.includes('unauthorized-domain')) {
        setFirebaseError("Domínio Não Autorizado: Você precisa adicionar este domínio (ais-dev-...) na lista de domínios autorizados do Firebase Console -> Authentication -> Settings.");
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setNotebooks([]);
      return;
    }

    const q = query(
      collection(db, 'notebooks'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setNotebooks(data as any[]);
    });

    return unsubscribe;
  }, [user]);

  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isReorganizing, setIsReorganizing] = useState(false);

  const handleAutoReorganize = async () => {
    if (notebooks.length === 0) return;
    if (!confirm("Deseja que a IA analise todos os seus notebooks e sugira novas categorias e nomes mais limpos? Isso substituirá as categorias atuais.")) return;

    setIsReorganizing(true);
    try {
      const updates = await reorganizeAllCategories(notebooks);
      
      const promises = updates.map(update => {
        const nbRef = doc(db, 'notebooks', update.notebookId);
        return setDoc(nbRef, { 
          category: update.category,
          name: update.name,
          lastAnalyzed: serverTimestamp() 
        }, { merge: true });
      });

      await Promise.all(promises);
      alert("Sua gaveta foi organizada com sucesso!");
    } catch (err) {
      console.error("Erro na auto-organização:", err);
      alert("Ocorreu um erro ao tentar organizar automaticamente.");
    } finally {
      setIsReorganizing(false);
    }
  };

  const handleRenameCategory = async (oldCategory: string) => {
    if (!newCategoryName.trim() || newCategoryName === oldCategory) {
      setRenamingCategory(null);
      return;
    }

    const notebooksToUpdate = notebooks.filter(n => n.category === oldCategory);
    
    try {
      const promises = notebooksToUpdate.map(nb => {
        const nbRef = doc(db, 'notebooks', nb.id);
        return setDoc(nbRef, { 
          category: newCategoryName.trim(),
          lastAnalyzed: serverTimestamp() 
        }, { merge: true });
      });

      await Promise.all(promises);
      setRenamingCategory(null);
      setNewCategoryName('');
      if (selectedCategory === oldCategory) setSelectedCategory(newCategoryName.trim());
    } catch (err) {
      console.error("Erro ao renomear categoria:", err);
      alert("Não foi possível renomear a categoria. Verifique suas permissões.");
    }
  };

  const categories = Array.from(new Set(notebooks.map(n => n.category))).filter(Boolean) as string[];
  const filteredNotebooks = notebooks.filter(n => {
    const nameMatch = n.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const descMatch = n.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSearch = nameMatch || descMatch;
    const matchesCategory = !selectedCategory || n.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="h-screen bg-[#F5F5F0] flex items-center justify-center font-serif italic text-2xl animate-pulse">
        Abrindo sua Gaveta...
      </div>
    );
  }

  return (
    <Layout user={user}>
      {firebaseError && (
        <div className="max-w-7xl mx-auto px-8 pt-8">
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-sm flex items-center gap-4">
            <div className="bg-red-800 text-white p-2 rounded-full">
              <ArchiveIcon size={16} />
            </div>
            <div>
              <p className="font-bold text-sm uppercase tracking-widest">Atenção Arquivista</p>
              <p className="text-sm opacity-80">{firebaseError}</p>
              <p className="text-[10px] mt-1 opacity-60">Se você está no Netlify ou GitHub, verifique se as chaves foram exportadas corretamente no firebase-applet-config.json.</p>
            </div>
          </div>
        </div>
      )}
      {!user ? (
        <section className="max-w-4xl mx-auto py-24 px-8 text-center bg-[#F5F5F0]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-12"
          >
            <div className="w-24 h-24 bg-[#1a1a1a] mx-auto rounded-sm flex items-center justify-center text-[#F5F5F0] text-5xl italic shadow-2xl">
              G
            </div>
            <h2 className="text-7xl font-light leading-tight tracking-tighter">
              Seus códigos, <br />
              <span className="italic">organizados com alma.</span>
            </h2>
            <p className="text-xl opacity-60 font-sans max-w-xl mx-auto leading-relaxed">
              Uma gaveta digital para catalogar e organizar seus notebooks do Google Colab. 
              Gemini AI atua como seu arquivista pessoal, analisando cada script no seu Drive para categorizá-los com perfeição.
            </p>
            <div className="pt-8 flex flex-col items-center gap-4">
              <button 
                onClick={() => signInWithPopup(auth, googleProvider)}
                className="bg-[#1a1a1a] text-[#F5F5F0] px-10 py-5 rounded-full text-sm uppercase tracking-[0.2em] font-bold hover:shadow-[0_0_30px_rgba(0,0,0,0.1)] transition-all"
              >
                Começar a Organizar
              </button>
              <p className="text-[10px] uppercase tracking-widest opacity-30 font-sans font-bold">Totalmente gratuito &mdash; Use sua conta Google</p>
            </div>
          </motion.div>
        </section>
      ) : (
        <div className="max-w-7xl mx-auto px-8 pb-20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
            <div>
              <h2 className="text-5xl italic font-light">Sua Coleção</h2>
              <p className="text-[11px] uppercase tracking-[0.2em] opacity-40 font-sans font-bold mt-2">
                {notebooks.length} Arquivos Catalogados
              </p>
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setIsAdding(!isAdding)}
                className="bg-[#5A5A40] text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group"
              >
                <Plus size={24} className={`transition-transform duration-300 ${isAdding ? 'rotate-45' : ''}`} />
                <span className="text-xs uppercase tracking-widest font-bold px-2">{isAdding ? 'Fechar' : 'Novo Link'}</span>
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {isAdding && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-16"
              >
                <div className="max-w-2xl mx-auto">
                  <AddNotebookForm userId={user.uid} onSuccess={() => setIsAdding(false)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-16">
            {/* Filters Sidebar */}
            <aside className="space-y-10">
              <div className="sticky top-28">
                <div className="mb-8">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-30 block mb-4">Pesquisa</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                    <input 
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Nome, código, função..."
                      className="w-full bg-white border border-[#1a1a1a]/10 p-3 pl-10 rounded-sm text-sm outline-none focus:border-[#1a1a1a] transition-colors shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-30 block mb-4 flex items-center gap-2">
                    <Layers size={12} />
                    Suas Gavetas
                  </label>
                  
                  <div className="mb-4 relative">
                    <button 
                      onClick={copyGalleryLink}
                      className="w-full flex items-center justify-between px-3 py-3 bg-[#1a1a1a] text-white rounded-sm text-[10px] uppercase tracking-widest font-bold hover:bg-[#5A5A40] transition-all shadow-md group"
                    >
                      <div className="flex items-center gap-2">
                        <Globe size={14} className="opacity-50 group-hover:opacity-100" />
                        Link da Vitrine
                      </div>
                      <Share2 size={12} className="opacity-50" />
                    </button>
                    <AnimatePresence>
                      {showShareTooltip && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute -top-10 left-0 right-0 text-center bg-green-600 text-white text-[9px] py-1 rounded-sm shadow-xl z-50 uppercase font-bold"
                        >
                          Link Geral Copiado!
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-px bg-[#1a1a1a]/5 p-1 rounded-sm max-h-[60vh] overflow-y-auto">
                    <button 
                      onClick={handleAutoReorganize}
                      disabled={isReorganizing}
                      className="w-full mb-2 flex items-center justify-center gap-2 px-3 py-4 bg-white border border-[#5A5A40]/20 text-[#5A5A40] rounded-sm text-[10px] uppercase tracking-widest font-bold hover:bg-[#5A5A40] hover:text-white transition-all shadow-sm"
                    >
                      {isReorganizing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                      {isReorganizing ? 'Organizando...' : 'Auto-Organizar com IA'}
                    </button>
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
                      <div key={`${cat}-${idx}`} className="group relative">
                        {renamingCategory === cat ? (
                          <div className="flex items-center gap-2 px-3 py-1">
                            <input 
                              autoFocus
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleRenameCategory(cat)}
                              onBlur={() => handleRenameCategory(cat)}
                              className="text-sm bg-white border border-[#1a1a1a]/20 px-2 py-1 rounded-sm w-full outline-none focus:border-[#5A5A40]"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-between group">
                            <button 
                              onClick={() => setSelectedCategory(cat)}
                              className={`flex-1 text-left px-3 py-2 rounded-sm text-sm font-sans transition-all flex items-center gap-3 ${selectedCategory === cat ? 'bg-[#5A5A40] text-white shadow-md' : 'hover:bg-[#1a1a1a]/5'}`}
                            >
                              <span 
                                className="w-5 h-5 rounded-sm shrink-0 flex items-center justify-center transition-colors" 
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
                            <button 
                              onClick={() => { setRenamingCategory(cat); setNewCategoryName(cat); }}
                              className="absolute right-2 opacity-0 group-hover:opacity-40 hover:!opacity-100 p-1 transition-opacity z-10"
                              title="Renomear categoria"
                            >
                              <Edit2 size={12} className={selectedCategory === cat ? 'text-white' : 'text-[#1a1a1a]'} />
                            </button>
                          </div>
                        )}
                      </div>
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
                    {selectedCategory ? selectedCategory : 'Toda a Coleção'}
                  </h3>
                  <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-30 mt-1">
                    {filteredNotebooks.length} notebooks encontrados
                  </p>
                </div>
                {selectedCategory && (
                  <button 
                    onClick={() => setSelectedCategory(null)}
                    className="text-[10px] uppercase tracking-widest font-bold px-3 py-1 bg-[#1a1a1a] text-white rounded-sm hover:bg-[#5A5A40] transition-colors self-start sm:self-center"
                  >
                    Ver Tudo
                  </button>
                )}
              </div>

              {filteredNotebooks.length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                  <AnimatePresence>
                    {filteredNotebooks.map(nb => (
                      <NotebookCard key={nb.id} notebook={nb} />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="h-64 border-2 border-dashed border-[#1a1a1a]/10 rounded-sm flex flex-col items-center justify-center opacity-30 text-center px-8">
                  <ArchiveIcon size={48} className="mb-4" />
                  <p className="italic text-xl">Gaveta vazia ou nada encontrado.</p>
                  <p className="text-[10px] uppercase tracking-widest font-bold font-sans mt-2">Comece arquivando seus notebooks</p>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/share/:shareId" element={<SharedView />} />
        <Route path="/gallery/:userId" element={<PublicGallery />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
