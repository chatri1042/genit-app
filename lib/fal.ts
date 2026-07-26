// fal.ai client — เจนรูป/วิดีโอจริงผ่าน fal.ai Queue API
// คีย์ FAL_KEY เป็นความลับฝั่งเซิร์ฟเวอร์ (ตั้งใน Netlify) — ห้าม import ไฟล์นี้ฝั่ง client
// ชื่อโมเดลตั้งผ่าน env ได้ (เผื่อ fal เปลี่ยนรุ่น จะได้แก้โดยไม่ต้อง deploy โค้ดใหม่)

const QUEUE = 'https://queue.fal.run';

export const FAL_MODELS = {
  image: process.env.FAL_MODEL_IMAGE || 'fal-ai/flux/schnell',
  i2i: process.env.FAL_MODEL_I2I || 'fal-ai/flux/dev/image-to-image', // เจนภาพโดยอ้างอิงรูปที่อัพ (สินค้า/คน)
  // Nano Banana (Gemini 2.5 Flash Image) — คงสินค้า/ตัวละครเป๊ะ + วางในฉากใหม่ได้
  nano: process.env.FAL_MODEL_NANO || 'fal-ai/nano-banana',
  nanoEdit: process.env.FAL_MODEL_NANO_EDIT || 'fal-ai/nano-banana/edit',
  i2v: process.env.FAL_MODEL_I2V || 'fal-ai/kling-video/v1/standard/image-to-video', // ขยับภาพสินค้า/สถานที่ (ไม่บล็อกหน้า)
  // Seedance 2.0 image-to-video — สวย+เสียงในตัว แต่บล็อกรูปหน้าคนเหมือนจริง (ใช้กับช็อตไม่มีคนเท่านั้น)
  seedance: process.env.FAL_MODEL_SEEDANCE || 'bytedance/seedance-2.0/image-to-video',
  t2v: process.env.FAL_MODEL_T2V || 'fal-ai/ltx-video',
  // เสียงพากย์ไทยจากสคริปต์ (MiniMax รองรับไทย)
  tts: process.env.FAL_MODEL_TTS || 'fal-ai/minimax/speech-02-hd',
  // ทำปากขยับตามไฟล์เสียง — รับรูปหน้าคน + เสียง (ไม่บล็อกหน้า เพราะเป็นงานหลักของมัน)
  fabric: process.env.FAL_MODEL_FABRIC || 'veed/fabric-1.0',
  lipsync: process.env.FAL_MODEL_LIPSYNC || 'fal-ai/sync-lipsync',
  // ต่อคลิปหลายช็อตเป็นวิดีโอเดียว (endpoint เฉพาะทางของ fal — รับลิสต์คลิป + บังคับความละเอียดได้)
  merge: process.env.FAL_MODEL_MERGE || 'fal-ai/ffmpeg-api/merge-videos',
};

export type FalTask = {
  kind: 'image' | 'video' | 'audio';
  model: string;
  request_id: string;
  status_url: string;
  response_url: string;
  done: boolean;
  failed?: boolean;
  result_path?: string | null; // path ใน Supabase 'outputs' หลังดาวน์โหลดเก็บแล้ว
  // ---- ไปป์ไลน์พรีเซนเตอร์พูด (หลายสเต็ปในหนึ่ง task) ----
  pipeline?: 'video' | 'lipsync'; // 'lipsync' = ทำเสียงไทย → ทำปากขยับ
  stage?: 'tts' | 'lipsync';      // สเต็ปปัจจุบันของ pipeline lipsync
  imageUrl?: string;              // รูปเฟรม (ป้อนเข้าตัวทำปากขยับ)
  audioUrl?: string;              // ไฟล์เสียงไทยที่ได้จาก TTS
  errorMsg?: string;              // ข้อความ error จริงจาก fal (ไว้โชว์ให้ผู้ใช้เห็น)
};

function authHeaders(): Record<string, string> {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error('ยังไม่ได้ตั้งค่าคีย์ fal.ai (FAL_KEY) ใน Netlify');
  return { Authorization: `Key ${key}`, 'Content-Type': 'application/json' };
}

// ส่งงานเข้า fal queue — คืน request info ไว้ poll ทีหลัง
export async function submitFal(model: string, input: Record<string, any>, kind: 'image' | 'video' | 'audio'): Promise<FalTask> {
  const res = await fetch(`${QUEUE}/${model}`, {
    method: 'POST',
    headers: authHeaders(),
    cache: 'no-store',
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.text();
    let msg = '';
    try { msg = JSON.parse(body)?.detail ?? JSON.parse(body)?.message ?? ''; } catch { /* ignore */ }
    if (res.status === 401 || res.status === 403) throw new Error('คีย์ fal.ai ไม่ถูกต้อง หรือยังไม่มีเครดิต fal.ai');
    if (res.status === 404) throw new Error(`ไม่พบโมเดล fal.ai "${model}" — แก้ค่า env FAL_MODEL_* ใน Netlify ได้`);
    throw new Error(`fal.ai error (${res.status})${msg ? ': ' + String(msg).slice(0, 140) : ''}`);
  }
  const data = await res.json();
  return {
    kind, model,
    request_id: data.request_id,
    status_url: data.status_url,
    response_url: data.response_url,
    done: false,
  };
}

// เช็คสถานะงานหนึ่งชิ้น — คืน 'pending' | 'done'(+url) | 'failed'(+error จริงจาก fal)
export async function checkFal(task: FalTask): Promise<{ state: 'pending' | 'done' | 'failed'; url?: string; error?: string }> {
  const sres = await fetch(task.status_url, { headers: authHeaders(), cache: 'no-store' });
  if (!sres.ok) return { state: 'pending' }; // ชั่วคราว — ลองใหม่รอบหน้า
  const s = await sres.json();
  const status = String(s?.status ?? '').toUpperCase();
  if (status === 'FAILED' || status === 'ERROR') return { state: 'failed', error: await falErrorDetail(task, s) };
  if (status !== 'COMPLETED') return { state: 'pending' };

  // เสร็จแล้ว — ดึงผลลัพธ์
  const rres = await fetch(task.response_url, { headers: authHeaders(), cache: 'no-store' });
  if (!rres.ok) return { state: 'failed', error: 'ดึงผลลัพธ์ fal.ai ไม่สำเร็จ' };
  const out = await rres.json();
  const url = extractUrl(out, task.kind);
  if (!url) return { state: 'failed', error: 'fal.ai ไม่ได้ส่งไฟล์กลับมา' };
  return { state: 'done', url };
}

// ดึงข้อความ error จริงจาก fal (เผื่อโดนบล็อก/พารามิเตอร์ผิด จะได้รู้สาเหตุ ไม่ใช่ "ไม่สำเร็จ" ลอยๆ)
async function falErrorDetail(task: FalTask, statusPayload: any): Promise<string> {
  let detail = statusPayload?.error || statusPayload?.detail || '';
  try {
    const rres = await fetch(task.response_url, { headers: authHeaders(), cache: 'no-store' });
    const body = await rres.text();
    try {
      const j = JSON.parse(body);
      detail = j?.error || j?.detail || j?.message || (Array.isArray(j?.detail) ? j.detail.map((d: any) => d?.msg).filter(Boolean).join('; ') : '') || detail;
    } catch { detail = detail || body.slice(0, 180); }
  } catch { /* ignore */ }
  const s = typeof detail === 'string' ? detail : JSON.stringify(detail);
  return s ? `fal.ai: ${s.slice(0, 200)}` : 'fal.ai สร้างไม่สำเร็จ';
}

// หา URL ไฟล์จากผลลัพธ์ fal (รูปแบบต่างกันตามโมเดล)
function extractUrl(out: any, kind: 'image' | 'video' | 'audio'): string | null {
  if (!out) return null;
  if (kind === 'video') {
    return out?.video?.url || out?.video_url || out?.videos?.[0]?.url || out?.output?.url || (typeof out?.output === 'string' ? out.output : null) || null;
  }
  if (kind === 'audio') {
    return out?.audio?.url || out?.audio_url || out?.audio?.[0]?.url || out?.output?.url || out?.url || null;
  }
  return out?.images?.[0]?.url || out?.image?.url || out?.images?.[0] || out?.output?.[0] || out?.url || null;
}

// สร้าง prompt ภาษาอังกฤษเชิงบรรยายจากบรีฟ (โมเดลภาพ/วิดีโอเข้าใจอังกฤษดีกว่า) + คงคำไทยของสินค้าไว้
export function buildVisualPrompt(input: {
  brief: { name?: string; price?: string; point?: string; promo?: string; brand_name?: string; brand_description?: string };
  mood?: string | null;
  concept?: string;
  format: string;
  imageText?: { main?: string; sub?: string } | null;
}): string {
  const { brief, mood, format } = input;
  const moodMap: Record<string, string> = {
    'สนุก ตื่นเต้น': 'fun, energetic, vibrant', 'น่าเชื่อถือ': 'clean, trustworthy, premium',
    'เป็นกันเอง': 'friendly, warm, casual', 'หรูหรา': 'luxury, elegant, high-end', 'ตลก': 'playful, quirky, humorous',
  };
  const scene: Record<string, string> = {
    image: 'professional product photography, studio lighting, e-commerce hero shot',
    product: 'cinematic product showcase, rotating hero shot, soft studio lighting',
    food: 'appetizing food photography, close-up, steam and freshness, ASMR-friendly',
    hand: 'close-up of hands presenting the product, soft natural light',
    ugc: 'authentic UGC-style shot of a friendly Thai presenter holding the product, phone-camera look',
  };
  const parts = [
    scene[format] || scene.product,
    brief.name ? `Product: ${brief.name}` : '',
    brief.point ? `Highlight: ${brief.point}` : '',
    brief.brand_description ? `Brand: ${brief.brand_description}` : '',
    mood ? (moodMap[mood] || mood) : '',
    'high detail, sharp focus, commercial quality, no text overlay',
  ].filter(Boolean);
  return parts.join(', ');
}

// map สัดส่วนจอ -> ที่โมเดลภาพ flux เข้าใจ
export function ratioToImageSize(ratio: string): string {
  if (ratio === '9:16') return 'portrait_16_9';
  if (ratio === '16:9') return 'landscape_16_9';
  return 'square_hd';
}
