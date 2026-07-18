import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { getCreditBalance } from '@/lib/credits';
import { createClient } from '@/lib/supabase/server';
import TopNav from '@/components/TopNav';
import { LanguageProvider } from '@/components/LanguageProvider';

// เลย์เอาต์กลุ่มหน้าที่ต้องล็อกอิน
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // อ่าน session จาก cookie (ไม่ยิงเน็ต) เพื่อได้ uid เร็ว ๆ
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');
  // ยิงพร้อมกัน 2 อย่าง: ตรวจ user จริง (ความปลอดภัย) + ดึงยอดเครดิต — ลด round-trip ข้ามภูมิภาคจาก 2 เหลือ 1 ช่วง
  const [user, balance] = await Promise.all([
    getUser(),
    getCreditBalance(session.user.id),
  ]);
  if (!user) redirect('/login');
  return (
    <LanguageProvider>
      <TopNav balance={balance} email={user.email ?? user.phone ?? ''} />
      <div className="wrap">{children}</div>
    </LanguageProvider>
  );
}
