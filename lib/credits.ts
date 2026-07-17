import { createClient } from './supabase/server';

// ยอดเครดิตคงเหลือ (คำนวณจาก ledger ผ่านฟังก์ชันใน DB)
// ส่ง uid มาได้ถ้ารู้แล้ว เพื่อลดการเรียก getUser ซ้ำ (เร็วขึ้น)
export async function getCreditBalance(uid?: string): Promise<number> {
  const supabase = await createClient();
  let userId = uid;
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    userId = user.id;
  }
  const { data, error } = await supabase.rpc('credit_balance', { uid: userId });
  if (error) return 0;
  return data ?? 0;
}

// หักเครดิตแบบปลอดภัย (เช็กยอดพอก่อน) — เรียกฟังก์ชัน spend_credits ใน DB
// reason: 'video' | 'image' | 'avatar' | 'voice_preview' ...
export async function spendCredits(
  amount: number,
  reason: string,
  refType?: 'job' | 'purchase',
  refId?: string,
): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('spend_credits', {
    amount,
    why: reason,
    rtype: refType ?? null,
    rid: refId ?? null,
  });
  if (error) throw error; // เช่น 'insufficient credits: have X, need Y'
  return data as number; // ยอดคงเหลือหลังหัก
}

// เติมเครดิต (เรียกจากฝั่งเซิร์ฟเวอร์เท่านั้น เช่นหลัง Stripe จ่ายสำเร็จ)
// ใช้ admin client เพราะ ledger insert ถูกล็อกด้วย RLS
export async function grantCredits(
  userId: string,
  amount: number,
  reason: 'purchase' | 'free_trial' | 'refund',
  refType?: 'purchase' | 'job',
  refId?: string,
) {
  const { createAdminClient } = await import('./supabase/server');
  const admin = createAdminClient();
  const { error } = await admin.from('credit_ledger').insert({
    user_id: userId,
    delta: amount,
    reason,
    ref_type: refType ?? null,
    ref_id: refId ?? null,
  });
  if (error) throw error;
}
