import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Supabase client สำหรับฝั่งเซิร์ฟเวอร์ (Server Components / Route Handlers)
// อ่าน session จาก cookie -> RLS ทำงานตามผู้ใช้ที่ล็อกอิน
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // เรียกจาก Server Component — ปล่อยผ่าน (middleware จะ refresh ให้)
          }
        },
      },
    },
  );
}

// client แบบ service-role: ข้าม RLS ใช้ในงานเบื้องหลัง (เช่น webhook เติมเครดิต)
// ห้ามเรียกจากฝั่ง client เด็ดขาด
import { createClient as createSbClient } from '@supabase/supabase-js';
export function createAdminClient() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
