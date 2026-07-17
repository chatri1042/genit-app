import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { getCreditBalance } from '@/lib/credits';
import TopNav from '@/components/TopNav';
import { LanguageProvider } from '@/components/LanguageProvider';

// เลย์เอาต์กลุ่มหน้าที่ต้องล็อกอิน
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');
  const balance = await getCreditBalance(user.id);
  return (
    <LanguageProvider>
      <TopNav balance={balance} email={user.email ?? user.phone ?? ''} />
      <div className="wrap">{children}</div>
    </LanguageProvider>
  );
}
