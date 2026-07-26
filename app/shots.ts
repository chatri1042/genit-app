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

export type Avatar = { gender?: string; age?: string; ethnicity?: string };
export type ShotInput = {
  shotName: string; shotDesc: string; ratio: string; mood?: string;
  brief?: { point?: string; brand_description?: string };
  productPath?: string | null;   // path ใน bucket uploads (รูปสินค้ารูปแรก)
  presenterPath?: string | null; // path รูปพรีเซนเตอร์ (ถ้าอัพเอง)
  avatar?: Avatar | null;        // ถ้าใช้ Avatar AI (สร้างคนใหม่)
};

const ETH_EN: Record<string, string> = { 'ไทย': 'Thai', 'เอเชียตะวันออก': 'East Asian', 'ลูกครึ่ง': 'mixed-race', 'ตะวันตก': 'Western/Caucasian', 'เอเชียใต้': 'South Asian', 'แอฟริกัน': 'African' };
function personDesc(av?: Avatar | null): string {
  const g = /ชาย|male/i.test(av?.gender || '') ? 'man' : /หญิง|female/i.test(av?.gender || '') ? 'woman' : 'person';
  const eth = ETH_EN[av?.ethnicity || 'ไทย'] || 'Thai';
  const age = /18|วัยรุ่น/.test(av?.age || '') ? 'young adult' : /55|สูงวัย/.test(av?.age || '') ? 'senior' : /40|กลางคน/.test(av?.age || '') ? 'middle-aged' : 'adult';
  return `a ${age} ${eth} ${g}`;
}

// ชนิดของช็อต
function shotKind(name: string): 'cta' | 'presenter_product' | 'presenter' | 'place' | 'product' {
  const n = name || '';
  if (/CTA|cta/i.test(n)) return 'cta';
  if (/พรีเซนเตอร์|presenter/i.test(n) && /สินค้า|product|ใช้|ถือ/i.test(n)) return 'presenter_product';
  if (/พรีเซนเตอร์|presenter|คน/i.test(n)) return 'presenter';
  if (/สถานที่|บรรยากาศ|scene|establishing|place/i.test(n)) return 'place';
  return 'product';
}

function buildPrompt(input: ShotInput, mode: 'i2i' | 't2i'): string {
  const kind = shotKind(input.shotName);
  const who = personDesc(input.avatar);
  let scene = '';
  if (kind === 'cta') scene = 'end-card style hero shot of the product on a clean minimal background, lots of empty space for text, e-commerce look';
  else if (kind === 'presenter_product') scene = `${who}, friendly and smiling, holding and showing the product to the camera, authentic UGC phone-camera style, casual real-life setting`;
  else if (kind === 'presenter') scene = `${who}, friendly and smiling, talking to the camera, authentic UGC selfie phone-camera style, casual real-life setting`;
  else if (kind === 'place') scene = 'a wide establishing shot of the location and atmosphere, no people in focus';
  else scene = 'clean close-up product photography of the product, soft studio lighting, e-commerce hero shot';
  return [
    scene,
    input.shotDesc ? `Extra: ${input.shotDesc}` : '',
    input.brief?.point ? `Product context: ${input.brief.point}` : '',
    input.brief?.brand_description ? `Brand: ${input.brief.brand_description}` : '',
    input.mood ? (MOOD_EN[input.mood] || input.mood) : '',
    mode === 'i2i' ? 'keep the exact product/subject from the reference image identical (same shape, color, pattern, logo)' : '',
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

  const kind = shotKind(input.shotName);
  const [productUrl, presenterUrl] = await Promise.all([
    signUploads(supabase, input.productPath),
    signUploads(supabase, input.presenterPath),
  ]);
  // เลือกวิธี:
  //  - ช็อตคน + มีรูปคนจริง → i2i รูปคน
  //  - ช็อตคน + ใช้ Avatar AI (ไม่มีรูปคน) → t2i สร้างคนใหม่ (ห้ามเอารูปสินค้ามาเป็น ref ไม่งั้นได้แต่รูปสินค้า)
  //  - ช็อตสินค้า/สถานที่/CTA → i2i รูปสินค้า (ถ้ามี) เพื่อคงของจริง
  const wantsPerson = kind === 'presenter' || kind === 'presenter_product';
  let refUrl = '';
  let strength = 0.6;
  if (wantsPerson) {
    if (presenterUrl) { refUrl = presenterUrl; strength = 0.55; }
    else refUrl = ''; // Avatar AI → t2i
  } else {
    refUrl = productUrl || '';
    strength = kind === 'product' ? 0.45 : 0.6; // ช็อตสินค้าคงของจริงไว้เยอะ
  }

  const prompt = buildPrompt(input, refUrl ? 'i2i' : 't2i');
  try {
    let task: FalTask;
    if (refUrl) {
      task = await submitFal(FAL_MODELS.i2i, { image_url: refUrl, prompt, strength, image_size: ratioToImageSize(input.ratio), num_images: 1 }, 'image');
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
