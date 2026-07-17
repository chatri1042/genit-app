'use server';
// Server Actions — เขียนข้อมูลจริงลง Supabase (RLS คุมสิทธิ์ตามผู้ใช้ที่ล็อกอิน)
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function createBrand(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const name = String(formData.get('name') ?? '').trim();
  const color = String(formData.get('color') ?? '#EAE41F');
  if (!name) return;

  const { error } = await supabase.from('brands').insert({
    user_id: user.id, name, color, font: 'Kanit',
  });
  if (error) throw new Error(error.message);
  revalidatePath('/brands');
  revalidatePath('/dashboard');
}

export async function createJobDraft(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const type = String(formData.get('type') ?? 'video');
  const format = String(formData.get('format') ?? 'ugc');
  const ratio = String(formData.get('ratio') ?? '9:16');
  const duration = Number(formData.get('duration') ?? 15);
  const concept = String(formData.get('concept') ?? '');
  const brief = {
    name: String(formData.get('bfName') ?? ''),
    price: String(formData.get('bfPrice') ?? ''),
    point: String(formData.get('bfPoint') ?? ''),
    promo: String(formData.get('bfPromo') ?? ''),
  };
  const brandId = String(formData.get('brand_id') ?? '') || null;
  const consent = formData.get('consent') === 'on';

  const { error } = await supabase.from('jobs').insert({
    user_id: user.id,
    brand_id: brandId,
    type,
    format,
    ratio,
    duration_sec: duration,
    concept,
    brief,
    status: 'draft',
    watermarked: true,             // เดโม: ถือเป็นงานฟรี -> trigger ตั้ง expires_at +15 วันให้เอง
    consent_marketing: consent,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/history');
  revalidatePath('/dashboard');
  redirect('/history');
}
