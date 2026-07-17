'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  return (
    <nav className="nav">
      <div className="nav-in">
        <Link href="/dashboard" className="logo">Gen<b>It</b></Link>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={'link' + (path === l.href ? ' active' : '')}>
            {lang === 'th' ? l.th : l.en}
          </Link>
        ))}
        <span className="spacer" />
        <div className="langtog" style={{ marginRight: 4 }}>
          <button type="button" className={lang === 'th' ? 'active' : ''} onClick={() => setLang('th')}>ไทย</button>
          <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
        </div>
        <span className="credit">{balance} {lang === 'th' ? 'เครดิต' : 'cr'}</span>
        <span className="muted" style={{ fontSize: 13 }} title={email}>{email}</span>
        <form action="/auth/signout" method="post">
          <button className="btn-ghost" style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', font: 'inherit' }}>{lang === 'th' ? 'ออก' : 'Sign out'}</button>
        </form>
      </div>
    </nav>
  );
}
