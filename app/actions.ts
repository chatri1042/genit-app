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

  const format = String(formData.get('format') ?? 'ugc');
  const type = format === 'image' ? 'image' : 'video';
  const ratio = String(formData.get('ratio') ?? '9:16');
  const duration = Number(formData.get('duration') ?? 15);
  const count = Number(formData.get('count') ?? 1);
  const concept = String(formData.get('concept') ?? '');
  const scriptLang = String(formData.get('script_lang') ?? 'th');
  const brief = {
    name: String(formData.get('bfName') ?? ''),
    price: String(formData.get('bfPrice') ?? ''),
    point: String(formData.get('bfPoint') ?? ''),
    promo: String(formData.get('bfPromo') ?? ''),
  };
  const voiceConfig = { mode: String(formData.get('voice_mode') ?? 'ai'), path: String(formData.get('voice_path') ?? '') || null };
  const settings = {
    subtitles: formData.get('subtitles') === 'on',
    logo: formData.get('logo') === 'on',
    cta: formData.get('cta') === 'on',
  };
  let images: string[] = [];
  try { images = JSON.parse(String(formData.get('images') ?? '[]')); } catch { images = []; }
  const brandId = String(formData.get('brand_id') ?? '') || null;
  const consent = formData.get('consent') === 'on';
  const credits = Number(formData.get('credits_cost') ?? 0);

  // บันทึกไฟล์รูปที่อัพไว้ลงคลัง assets (ใช้ซ้ำได้)
  if (images.length) {
    await supabase.from('assets').insert(
      images.map((url) => ({ user_id: user.id, brand_id: brandId, kind: 'product_image', url })),
    );
  }

  const { error } = await supabase.from('jobs').insert({
    user_id: user.id,
    brand_id: brandId,
    type,
    format,
    ratio,
    duration_sec: type === 'image' ? null : duration,
    count,
    concept,
    script_lang: scriptLang,
    brief,
    voice_config: voiceConfig,
    settings,
    output_urls: images.length ? { inputs: images } : null,
    credits_cost: credits,
    status: 'draft',
    watermarked: true,             // เดโม: ถือเป็นงานฟรี -> trigger ตั้ง expires_at +15 วันให้เอง
    consent_marketing: consent,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/history');
  revalidatePath('/dashboard');
  redirect('/history');
}
