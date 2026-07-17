'use client';
import { createContext, useContext, useEffect, useState } from 'react';

type L = 'th' | 'en';
const Ctx = createContext<{ lang: L; setLang: (l: L) => void }>({ lang: 'th', setLang: () => {} });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<L>('th');
  useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('genit_lang')) as L | null;
    if (saved === 'th' || saved === 'en') setLangState(saved);
  }, []);
  const setLang = (l: L) => { setLangState(l); try { localStorage.setItem('genit_lang', l); } catch {} };
  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);
