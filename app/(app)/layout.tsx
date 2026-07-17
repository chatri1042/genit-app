import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCreditBalance } from '@/lib/credits';
import TopNav from '@/components/TopNav';

// เลย์เอาต์กลุ่มหน้าที่ต้องล็อกอิน — กันคนไม่ล็อกอินออกไป /login
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const balance = await getCreditBalance();
  return (
    <>
      <TopNav balance={balance} email={user.email ?? user.phone ?? ''} />
      <div className="wrap">{children}</div>
    </>
  );
}
