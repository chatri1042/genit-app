'use server';
// เจนภาพตัวอย่างต่อช็อต (async: submit → client poll) — หักเครดิตหลังสำเร็จเท่านั้น
import { createClient } from '@/lib/supabase/server';
import { spendCredits, getCreditBalance } from '@/lib/credits';
import { submitFal, checkFal, FAL_MODELS, ratioToImageSize, type FalTask } from '@/lib/fal';

const SHOT_IMG_COST = 3; // เครดิตต่อภาพตัวอย่าง 1 ช็อต

const MOOD_EN: Record<string, string> = {
  'สนุก ตื่นเต้น': 'fun, energetic, vibrant', 'น่าเชื่อถือ': 'clean, trustworthy, premium',
  'เป็นกันเอง': 'friendly, warm, casual', 'หรูหรา': 'luxury, elegant, high-end', 'ตลก': 'playful, quirky, humorous',
};

export type ShotInput = {
  shotName: string; shotDesc: string; ratio: string; mood?: string;
  brief?: { name?: string; point?: string; brand_description?: string };
  placeDesc?: string;
};

function shotPrompt(i: ShotInput): string {
  return [
    'cinematic still frame, commercial quality, high detail, sharp focus, natural lighting, no text overlay',
    i.shotName ? `Scene: ${i.shotName}` : '',
    i.shotDesc ? `Detail: ${i.shotDesc}` : '',
    i.brief?.name ? `Product: ${i.brief.name}` : '',
    i.brief?.point ? `Highlight: ${i.brief.point}` : '',
    i.brief?.brand_description ? `Brand: ${i.brief.brand_description}` : '',
    i.placeDesc ? `Place: ${i.placeDesc}` : '',
    i.mood ? (MOOD_EN[i.mood] || i.mood) : '',
  ].filter(Boolean).join(', ');
}

// ส่งงานเจนภาพ 1 ช็อตเข้า fal (เช็คยอดพอก่อน ยังไม่หัก)
export async function startShotImage(input: ShotInput): Promise<{ task?: FalTask; error?: string; needCredits?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'ต้องล็อกอินก่อน' };
  const balance = await getCreditBalance(user.id);
  if (balance < SHOT_IMG_COST) return { needCredits: true, error: `เครดิตไม่พอ (ต้องมีอย่างน้อย ${SHOT_IMG_COST})` };
  try {
    const task = await submitFal(FAL_MODELS.image, { prompt: shotPrompt(input), image_size: ratioToImageSize(input.ratio), num_images: 1 }, 'image');
    return { task };
  } catch (e) {
    const msg = String((e as Error).message);
    return { error: msg, needCredits: /คีย์ fal|เครดิต fal/.test(msg) };
  }
}

// เช็คสถานะ 1 ช็อต — เสร็จแล้วดาวน์โหลดเก็บ + หัก 3 เครดิต (หักครั้งเดียวตอนสำเร็จ)
export async function pollShotImage(task: FalTask): Promise<{ state: 'pending' | 'done' | 'failed'; url?: string; path?: string; error?: string; needCredits?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { state: 'failed', error: 'ต้องล็อกอินก่อน' };
  const res = await checkFal(task);
  if (res.state === 'pending') return { state: 'pending' };
  if (res.state === 'failed') return { state: 'failed', error: res.error };
  // เสร็จแล้ว — ดาวน์โหลดเก็บลง outputs
  let path = '';
  try {
    const fileRes = await fetch(res.url!, { cache: 'no-store' });
    const blob = await fileRes.blob();
    path = `${user.id}/shot-${task.request_id}.png`;
    const { error: upErr } = await supabase.storage.from('outputs').upload(path, blob, { contentType: 'image/png', upsert: true });
    if (upErr) return { state: 'failed', error: 'บันทึกภาพไม่สำเร็จ' };
  } catch { return { state: 'failed', error: 'ดาวน์โหลดภาพไม่สำเร็จ' }; }
  // สำเร็จจริง ค่อยหักเครดิต
  try { await spendCredits(SHOT_IMG_COST, 'shot_preview'); }
  catch { return { state: 'failed', needCredits: true, error: 'เครดิตไม่พอ' }; }
  const { data: s } = await supabase.storage.from('outputs').createSignedUrl(path, 3600);
  return { state: 'done', url: s?.signedUrl ?? res.url, path };
}
