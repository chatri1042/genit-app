'use server';
// เจนภาพตัวอย่างต่อช็อต (async: submit → client poll) — หักเครดิตหลังสำเร็จเท่านั้น
// ใช้รูปสินค้า/พรีเซนเตอร์ที่อัพเป็นตัวอ้างอิงจริง (image-to-image) เพื่อให้ภาพตรงกับของจริง
import { createClient } from '@/lib/supabase/server';
import { spendCredits, getCreditBalance } from '@/lib/credits';
import { submitFal, checkFal, FAL_MODELS, ratioToImageSize, type FalTask } from '@/lib/fal';

const SHOT_IMG_COST = 3; // เครดิตต่อภาพตัวอย่าง 1 ช็อต

const MOOD_EN: Record<string, string> = {
  'สนุก ตื่นเต้น': 'fun, energetic, vibrant tone', 'น่าเชื่อถือ': 'clean, trustworthy, premium tone',
  'เป็นกันเอง': 'friendly, warm, casual tone', 'หรูหรา': 'luxury, elegant, high-end tone', 'ตลก': 'playful, quirky tone',
};

export type ShotInput = {
  shotName: string; shotDesc: string; ratio: string; mood?: string;
  brief?: { point?: string; brand_description?: string };
  productPath?: string | null;   // path ใน bucket uploads (รูปสินค้ารูปแรก)
  presenterPath?: string | null; // path รูปพรีเซนเตอร์ (ถ้าอัพเอง)
};

// แปลชื่อช็อต (ไทย ที่ระบบสร้าง) เป็นคำบรรยายฉากภาษาอังกฤษ ให้โมเดลภาพเข้าใจตรง
function sceneEN(name: string): { scene: string; wantsPerson: boolean } {
  const n = name || '';
  if (/CTA|cta/i.test(n)) return { scene: 'end-card style hero shot of the product on a clean minimal background, lots of empty space for text, e-commerce look', wantsPerson: false };
  if (/พรีเซนเตอร์|presenter/i.test(n) && /สินค้า|product|ใช้|ถือ/i.test(n)) return { scene: 'a friendly Thai presenter smiling, holding and showing the product to the camera, authentic UGC phone-camera style, casual real-life setting', wantsPerson: true };
  if (/พรีเซนเตอร์|presenter|คน/i.test(n)) return { scene: 'a friendly Thai presenter talking to the camera, authentic UGC selfie phone-camera style, casual real-life setting', wantsPerson: true };
  if (/สถานที่|บรรยากาศ|scene|establishing|place/i.test(n)) return { scene: 'a wide establishing shot of the location and atmosphere, no people in focus', wantsPerson: false };
  return { scene: 'clean close-up product photography of the product, soft studio lighting, e-commerce hero shot', wantsPerson: false };
}

function buildPrompt(input: ShotInput, hasRef: boolean): string {
  const { scene } = sceneEN(input.shotName);
  return [
    scene,
    input.shotDesc ? `Extra: ${input.shotDesc}` : '',
    input.brief?.point ? `Product context: ${input.brief.point}` : '',
    input.brief?.brand_description ? `Brand: ${input.brief.brand_description}` : '',
    input.mood ? (MOOD_EN[input.mood] || input.mood) : '',
    hasRef ? 'keep the exact product/subject from the reference image, do not change its shape, color or logo' : '',
    'commercial quality, high detail, sharp focus, realistic, no text overlay, no watermark',
  ].filter(Boolean).join('. ');
}

async function signUploads(supabase: any, path?: string | null): Promise<string> {
  if (!path) return '';
  const { data } = await supabase.storage.from('uploads').createSignedUrl(path, 3600);
  return data?.signedUrl ?? '';
}

// ส่งงานเจนภาพ 1 ช็อตเข้า fal (เช็คยอดพอก่อน ยังไม่หัก)
export async function startShotImage(input: ShotInput): Promise<{ task?: FalTask; error?: string; needCredits?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'ต้องล็อกอินก่อน' };
  const balance = await getCreditBalance(user.id);
  if (balance < SHOT_IMG_COST) return { needCredits: true, error: `เครดิตไม่พอ (ต้องมีอย่างน้อย ${SHOT_IMG_COST})` };

  // เลือกรูปอ้างอิง: ช็อตคน→ใช้รูปพรีเซนเตอร์ (ถ้ามี), ช็อตสินค้า→ใช้รูปสินค้า
  const { wantsPerson } = sceneEN(input.shotName);
  const [productUrl, presenterUrl] = await Promise.all([
    signUploads(supabase, input.productPath),
    signUploads(supabase, input.presenterPath),
  ]);
  let refUrl = '';
  if (wantsPerson && presenterUrl) refUrl = presenterUrl;
  else if (!wantsPerson && productUrl) refUrl = productUrl;
  else refUrl = productUrl || presenterUrl; // fallback รูปที่มี

  const prompt = buildPrompt(input, !!refUrl);
  try {
    let task: FalTask;
    if (refUrl) {
      // image-to-image: อ้างอิงรูปจริง (strength ต่ำ = คงของเดิมไว้เยอะ)
      task = await submitFal(FAL_MODELS.i2i, { image_url: refUrl, prompt, strength: 0.6, image_size: ratioToImageSize(input.ratio), num_images: 1 }, 'image');
    } else {
      task = await submitFal(FAL_MODELS.image, { prompt, image_size: ratioToImageSize(input.ratio), num_images: 1 }, 'image');
    }
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
