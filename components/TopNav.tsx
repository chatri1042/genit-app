'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/dashboard', label: 'แดชบอร์ด' },
  { href: '/generate', label: 'สร้างวิดีโอ' },
  { href: '/scripts', label: 'ร่างบท AI' },
  { href: '/brands', label: 'แบรนด์' },
  { href: '/history', label: 'ประวัติงาน' },
  { href: '/pricing', label: 'ราคา' },
];

export default function TopNav({ balance, email }: { balance: number; email: string }) {
  const path = usePathname();
  return (
    <nav className="nav">
      <div className="nav-in">
        <Link href="/dashboard" className="logo">Gen<b>It</b></Link>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={'link' + (path === l.href ? ' active' : '')}>
            {l.label}
          </Link>
        ))}
        <span className="spacer" />
        <span className="credit">{balance} เครดิต</span>
        <span className="muted" style={{ fontSize: 13 }} title={email}>{email}</span>
        <form action="/auth/signout" method="post">
          <button className="btn-ghost" style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', font: 'inherit' }}>ออก</button>
        </form>
      </div>
    </nav>
  );
}
