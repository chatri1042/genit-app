'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useLang } from './LanguageProvider';

const LINKS = [
  { href: '/dashboard', th: 'แดชบอร์ด', en: 'Dashboard' },
  { href: '/generate', th: 'สร้างวิดีโอ', en: 'Create' },
  { href: '/brands', th: 'แบรนด์', en: 'Brands' },
  { href: '/history', th: 'ประวัติงาน', en: 'History' },
  { href: '/pricing', th: 'ราคา', en: 'Pricing' },
];

export default function TopNav({ balance, email }: { balance: number; email: string }) {
  const path = usePathname();
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const L = (th: string, en: string) => (lang === 'th' ? th : en);

  return (
    <nav className="nav">
      <div className="nav-in">
        <Link href="/dashboard" className="logo" onClick={() => setOpen(false)}>Gen<b>It</b></Link>

        {/* เมนูหลัก (เดสก์ท็อป) */}
        <div className="nav-links">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={'link' + (path === l.href ? ' active' : '')}>
              {L(l.th, l.en)}
            </Link>
          ))}
        </div>

        <span className="spacer" />

        {/* ปุ่มภาษา (เดสก์ท็อป) */}
        <div className="langtog nav-desk" style={{ marginRight: 4 }}>
          <button type="button" className={lang === 'th' ? 'active' : ''} onClick={() => setLang('th')}>ไทย</button>
          <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
        </div>

        <span className="credit">{balance} {L('เครดิต', 'cr')}</span>

        <span className="muted nav-desk" style={{ fontSize: 13 }} title={email}>{email}</span>
        <form action="/auth/signout" method="post" className="nav-desk">
          <button className="btn-ghost" style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', font: 'inherit' }}>{L('ออก', 'Sign out')}</button>
        </form>

        {/* ปุ่มแฮมเบอร์เกอร์ (มือถือ) */}
        <button type="button" className="nav-burger" aria-label={L('เมนู', 'Menu')} onClick={() => setOpen((o) => !o)}>
          {open
            ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>}
        </button>
      </div>

      {/* ลิ้นชักเมนู (มือถือ) */}
      {open && (
        <div className="nav-drawer">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={'drawer-link' + (path === l.href ? ' active' : '')} onClick={() => setOpen(false)}>
              {L(l.th, l.en)}
            </Link>
          ))}
          <div className="drawer-row">
            <div className="langtog">
              <button type="button" className={lang === 'th' ? 'active' : ''} onClick={() => setLang('th')}>ไทย</button>
              <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
            </div>
            <form action="/auth/signout" method="post">
              <button className="btn-ghost" style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer', font: 'inherit' }}>{L('ออกจากระบบ', 'Sign out')}</button>
            </form>
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 6 }} title={email}>{email}</div>
        </div>
      )}
    </nav>
  );
}
