import React from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { LogOut, User as UserIcon } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
}

export const Layout: React.FC<LayoutProps> = ({ children, user }) => {
  const handleLogin = () => signInWithPopup(auth, googleProvider);
  const handleLogout = () => signOut(auth);

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1a1a1a] font-serif selection:bg-[#5A5A40] selection:text-white">
      <header className="fixed top-0 w-full bg-[#F5F5F0]/80 backdrop-blur-md border-b border-[#1a1a1a]/10 z-50 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1a1a1a] rounded-sm flex items-center justify-center text-white italic text-xl">G</div>
          <div>
            <h1 className="text-xl font-light tracking-tight">Gaveta <span className="italic">Digital</span></h1>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-40 -mt-1 font-sans font-bold">Personal Archivist</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold font-sans">{user.displayName}</p>
                <p className="text-[10px] opacity-50 font-sans">{user.email}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-[#1a1a1a]/5 rounded-full transition-colors flex items-center gap-2 group"
                title="Sair"
              >
                <LogOut size={18} className="group-hover:text-red-500 transition-colors" />
              </button>
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-[#1a1a1a]/10" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#1a1a1a]/10 flex items-center justify-center">
                  <UserIcon size={16} />
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="text-sm uppercase tracking-widest font-sans font-bold border border-[#1a1a1a] px-5 py-2 hover:bg-[#1a1a1a] hover:text-[#F5F5F0] transition-all"
            >
              Acessar Gaveta
            </button>
          )}
        </div>
      </header>

      <main className="pt-24 min-h-screen">
        {children}
      </main>

      <footer className="p-8 border-t border-[#1a1a1a]/10 text-center opacity-40 text-xs tracking-widest uppercase font-sans font-bold">
        &copy; {new Date().getFullYear()} Gaveta Digital &mdash; IA Archivist
      </footer>
    </div>
  );
};
