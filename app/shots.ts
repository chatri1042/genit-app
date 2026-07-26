'use server';
// เจนภาพตัวอย่างต่อช็อต (async: submit → client poll) — หักเครดิตหลังสำเร็จเท่านั้น
// ใช้รูปสินค้า/พรีเซนเตอร์ที่อัพเป็นตัวอ้างอิงจริง (image-to-image) เพื่อให้ภาพตรงกับของจริง
import { createClient } from '@/lib/supabase/server';
import { spendCredits, getCreditBalance } from '@/lib/credits';
import { submitFal, checkFal, FAL_MODELS, ratioToImageSize, type FalTask } from '@/lib/fal';

const SHOT_IMG_COST = 3; // เครดิตต่อภาพตัวอย่าง 1 ช็อต

// สัดส่วนจอ → ค่า aspect_ratio ที่ Nano Banana (Gemini 2.5 Flash Image) รับ
function ratioToAspect(ratio: string): string {
  if (ratio === '9:16') return '9:16';
  if (ratio === '16:9') return '16:9';
  if (ratio === '4:5') return '4:5';
  if (ratio === '1:1') return '1:1';
  return ratio && /^\d+:\d+$/.test(ratio) ? ratio : '1:1';
}

const MOOD_EN: Record<string, string> = {
  'สนุก ตื่นเต้น': 'fun, energetic, vibrant tone', 'น่าเชื่อถือ': 'clean, trustworthy, premium tone',
  'เป็นกันเอง': 'friendly, warm, casual tone', 'หรูหรา': 'luxury, elegant, high-end tone', 'ตลก': 'playful, quirky tone',
};

export type Avatar = { gender?: string; age?: string; ethnicity?: string };
export type ShotInput = {
  shotName: string; shotDesc: string; ratio: string; mood?: string;
  brief?: { point?: string; brand_description?: string };
  productPath?: string | null;      // path ใน bucket uploads (รูปสินค้ารูปแรก)
  presenterPath?: string | null;    // path รูปพรีเซนเตอร์ (ถ้าอัพเอง, bucket uploads)
  presenterRefPath?: string | null; // path รูปหน้าพรีเซนเตอร์ที่ล็อกไว้ (bucket outputs) — ให้ทุกช็อตเป็นคนเดียวกัน
  avatar?: Avatar | null;           // ถ้าใช้ Avatar AI (สร้างคนใหม่)
};

const ETH_EN: Record<string, string> = { 'ไทย': 'Thai', 'เอเชียตะวันออก': 'East Asian', 'ลูกครึ่ง': 'mixed-race', 'ตะวันตก': 'Western/Caucasian', 'เอเชียใต้': 'South Asian', 'แอฟริกัน': 'African' };
function personDesc(av?: Avatar | null): string {
  const g = /ชาย|male/i.test(av?.gender || '') ? 'man' : /หญิง|female/i.test(av?.gender || '') ? 'woman' : 'person';
  const eth = ETH_EN[av?.ethnicity || 'ไทย'] || 'Thai';
  const age = /18|วัยรุ่น/.test(av?.age || '') ? 'young adult' : /55|สูงวัย/.test(av?.age || '') ? 'senior' : /40|กลางคน/.test(av?.age || '') ? 'middle-aged' : 'adult';
  return `a ${age} ${eth} ${g}`;
}

// ชนิดของช็อต — ดูจากทั้งชื่อและคำบรรยาย (คำบรรยายที่ผู้ใช้พิมพ์ควรมีน้ำหนักกว่าชื่อ default)
// จัดลำดับให้ "มีคน" มาก่อน CTA เพราะถ้าผู้ใช้ระบุพรีเซนเตอร์ในการ์ด CTA ก็ต้องมีคน
function shotKind(text: string): 'cta' | 'presenter_product' | 'presenter' | 'place' | 'product' {
  const n = text || '';
  const hasPerson = /พรีเซนเตอร์|presenter|คน|ผู้หญิง|ผู้ชาย|selfie/i.test(n);
  const hasProduct = /สินค้า|product|ถือ|ใช้|hold/i.test(n);
  if (hasPerson && hasProduct) return 'presenter_product';
  if (hasPerson) return 'presenter';
  if (/CTA|cta/i.test(n)) return 'cta';
  if (/สถานที่|บรรยากาศ|scene|establishing|place/i.test(n)) return 'place';
  return 'product';
}

// เดาบรรยากาศให้เข้ากับหมวดสินค้าจากบรีฟ (ไทย/อังกฤษ) → ฉากอังกฤษที่โมเดลเข้าใจ
function sceneHint(brief?: string): string {
  const s = brief || '';
  if (/หมอน|ที่นอน|เครื่องนอน|ผ้าปู|ผ้าห่ม|pillow|mattress|bed/i.test(s)) return 'in a cozy tidy bedroom with soft natural morning light and styled bedding';
  if (/อาหาร|ขนม|เครื่องดื่ม|กาแฟ|ชา|food|drink|coffee|tea|dessert|bakery/i.test(s)) return 'on a beautiful dining table or cozy cafe setting with warm light';
  if (/ครีม|เซรั่ม|สกินแคร์|บำรุงผิว|เครื่องสำอาง|skincare|serum|cosmetic|lotion|beauty/i.test(s)) return 'on a clean bright vanity or minimal beauty flatlay with soft light';
  if (/เสื้อ|กางเกง|กระเป๋า|รองเท้า|แฟชั่น|เครื่องประดับ|fashion|bag|shoe|clothes|jewelry/i.test(s)) return 'in a stylish modern lifestyle fashion setting';
  if (/ต้นไม้|กระถาง|สวน|plant|garden|pot/i.test(s)) return 'in a bright green plant-filled corner with natural light';
  if (/รีสอร์ท|โรงแรม|คาเฟ่|ร้าน|resort|hotel|cafe|shop|store/i.test(s)) return 'in an inviting, well-designed venue interior';
  return '';
}
// เดาคำนามสินค้า (อังกฤษ) เพื่อบอกโมเดลว่าให้ถือ/โชว์อะไร
function productNoun(brief?: string): string {
  const s = brief || '';
  if (/หมอน|pillow/i.test(s)) return 'ergonomic latex pillow';
  if (/ที่นอน|mattress/i.test(s)) return 'mattress';
  if (/ผ้าปู|ผ้าห่ม|เครื่องนอน|bedding/i.test(s)) return 'bedding set';
  if (/ครีม|โลชั่น|cream|lotion/i.test(s)) return 'skincare cream jar';
  if (/เซรั่ม|serum/i.test(s)) return 'serum bottle';
  if (/กาแฟ|coffee/i.test(s)) return 'cup of coffee';
  if (/อาหาร|ขนม|food|dessert/i.test(s)) return 'plate of food';
  if (/เครื่องดื่ม|drink/i.test(s)) return 'drink';
  if (/กระเป๋า|bag/i.test(s)) return 'handbag';
  if (/รองเท้า|shoe/i.test(s)) return 'pair of shoes';
  if (/เสื้อ|clothes|shirt/i.test(s)) return 'clothing item';
  return 'product';
}

function buildPrompt(input: ShotInput, mode: 'i2i' | 't2i', anchor: 'product' | 'person' | 'none'): string {
  const kind = shotKind(`${input.shotName} ${input.shotDesc || ''}`);
  const who = personDesc(input.avatar);
  const hint = sceneHint(input.brief?.point);
  const noun = productNoun(input.brief?.point);
  const setting = hint || 'a cozy aesthetic real-life setting that suits the product';
  let scene = '';
  if (kind === 'cta') scene = `a premium advertising hero shot of a ${noun} beautifully staged ${setting}, dramatic soft lighting and subtle reflections, minimal composition with empty space for text, high-end e-commerce look`;
  else if (kind === 'presenter_product') scene = `${who}, friendly and smiling, holding a ${noun} and presenting it to the camera ${setting}, authentic UGC phone-camera style`;
  else if (kind === 'presenter') scene = `${who}, friendly and smiling, talking to the camera ${setting}, authentic UGC selfie phone-camera style`;
  else if (kind === 'place') scene = 'a beautiful wide establishing shot of the location and atmosphere, warm cinematic lighting, no people in focus';
  else scene = `a ${noun} beautifully restaged into a completely NEW professional scene ${setting}, new styled background, soft natural lighting, shallow depth of field, premium lifestyle product photography (not a plain catalog photo)`;
  // i2i product: คงชนิด/สีสินค้าไว้ แต่เปลี่ยนฉากใหม่ทั้งหมด
  let keep = '';
  if (mode === 'i2i' && anchor === 'product') keep = 'keep the product the same type, color and pattern as the reference, but completely restage it into the new scene above with new background and lighting';
  else if (mode === 'i2i' && anchor === 'person') keep = 'keep the same person from the reference image (same face and look)';
  return [
    scene,
    input.shotDesc ? `Extra: ${input.shotDesc}` : '',
    input.mood ? (MOOD_EN[input.mood] || input.mood) : '',
    keep,
    'commercial quality, high detail, sharp focus, photorealistic, no text overlay, no watermark',
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

  const kind = shotKind(`${input.shotName} ${input.shotDesc || ''}`);
  const [productUrl, presenterUrl] = await Promise.all([
    signUploads(supabase, input.productPath),
    signUploads(supabase, input.presenterPath),
  ]);
  // หน้าพรีเซนเตอร์ที่ล็อกไว้ (อยู่ bucket outputs) — ใช้เมื่อไม่ได้อัพรูปคนเอง เพื่อให้ทุกช็อตเป็นคนเดียวกัน
  let presenterRefUrl = '';
  if (!presenterUrl && input.presenterRefPath) {
    const { data } = await supabase.storage.from('outputs').createSignedUrl(input.presenterRefPath, 3600);
    presenterRefUrl = data?.signedUrl ?? '';
  }
  const personRef = presenterUrl || presenterRefUrl; // รูปอ้างอิงหน้าคน (อัพเอง หรือหน้า AI ที่ล็อกไว้)
  const who = personDesc(input.avatar);
  const setting = sceneHint(input.brief?.point) || 'a tidy aesthetic setting that suits the product';
  const extra = [input.shotDesc ? `Also: ${input.shotDesc}.` : '', input.mood ? `Mood: ${MOOD_EN[input.mood] || input.mood}.` : ''].filter(Boolean).join(' ');

  // สร้าง prompt (ภาษาธรรมชาติ) + รูปอ้างอิง สำหรับ Nano Banana (คงสินค้า/คนเป๊ะ + วางในฉากใหม่)
  const refs: string[] = [];
  let prompt = '';
  if (kind === 'cta') {
    if (productUrl) refs.push(productUrl);
    prompt = `Create a premium advertising hero shot. Use the exact product from the reference image and keep it identical (same shape, color, pattern, texture and label). Place it ${setting} on a clean premium background with dramatic soft lighting and empty space for text. Photorealistic. ${extra} No text, no watermark.`;
  } else if (kind === 'presenter_product') {
    if (personRef) refs.push(personRef);
    if (productUrl) refs.push(productUrl);
    const person = personRef ? 'the exact same person from the first reference image (keep the same face, hair and look)' : who;
    prompt = `Create a photorealistic UGC phone-camera photo of ${person}, friendly and smiling, naturally holding and presenting the product from the reference image to the camera. Keep the product exactly identical to its reference image (same shape, color, pattern and label). Setting: ${setting}. ${extra} No text, no watermark.`;
  } else if (kind === 'presenter') {
    if (personRef) refs.push(personRef);
    const person = personRef ? 'the exact same person from the reference image (keep the same face, hair and look)' : who;
    prompt = `Create a photorealistic UGC selfie-style phone-camera photo of ${person}, friendly and smiling, talking to the camera. Setting: ${setting}. ${extra} No text, no watermark.`;
  } else if (kind === 'place') {
    prompt = `A beautiful wide establishing photo, ${setting}, warm cinematic lighting, no people in focus. Photorealistic. ${extra} No text, no watermark.`;
  } else { // product
    if (productUrl) refs.push(productUrl);
    prompt = `Create a new professional lifestyle product photograph. Use the exact product shown in the reference image and keep it identical (same shape, color, pattern, texture and label — do not redesign it). Restage it beautifully ${setting}, with soft natural lighting, a tidy styled background and shallow depth of field, premium e-commerce look. Photorealistic. ${extra} No text, no watermark.`;
  }

  const useEdit = refs.length > 0;
  const model = useEdit ? FAL_MODELS.nanoEdit : FAL_MODELS.nano;
  const asp = ratioToAspect(input.ratio);
  // บังคับสัดส่วนภาพให้ตรงกับที่เลือก (ไม่งั้น Nano Banana จะออกมา 1:1 เสมอ)
  const body: Record<string, any> = { prompt: `${prompt} Output image aspect ratio ${asp}.`, num_images: 1, aspect_ratio: asp };
  if (useEdit) body.image_urls = refs;

  try {
    const task = await submitFal(model, body, 'image');
    return { task };
  } catch (e) {
    const msg = String((e as Error).message);
    if (/คีย์ fal|เครดิต fal/.test(msg)) return { error: msg, needCredits: true };
    // fallback → flux (กันพัง ถ้าโมเดล Nano Banana มีปัญหา)
    try {
      const anchor: 'product' | 'person' | 'none' = (kind === 'product' || kind === 'cta') ? 'product' : ((kind === 'presenter' || kind === 'presenter_product') && personRef) ? 'person' : 'none';
      const refUrl = anchor === 'product' ? productUrl : anchor === 'person' ? personRef : '';
      const fluxPrompt = buildPrompt(input, refUrl ? 'i2i' : 't2i', anchor);
      const task = refUrl
        ? await submitFal(FAL_MODELS.i2i, { image_url: refUrl, prompt: fluxPrompt, strength: 0.85, image_size: ratioToImageSize(input.ratio), num_images: 1 }, 'image')
        : await submitFal(FAL_MODELS.image, { prompt: fluxPrompt, image_size: ratioToImageSize(input.ratio), num_images: 1 }, 'image');
      return { task };
    } catch (e2) {
      const m2 = String((e2 as Error).message);
      return { error: m2, needCredits: /คีย์ fal|เครดิต fal/.test(m2) };
    }
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
