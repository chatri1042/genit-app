'use server';
// Server Action: ให้ AI ร่างบทพูด 3 แบบ ด้วย Google Gemini (ฟรี tier)
// อ่านคีย์จาก env GOOGLE_AI_API_KEY (ตั้งใน Netlify — เป็นความลับฝั่งเซิร์ฟเวอร์)

export type DraftResult = { scripts?: { hook: string; text: string }[]; error?: string; usedModel?: string };

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

// ให้คะแนนโมเดลเพื่อจัดลำดับ: ชอบ flash (ถูก/เร็ว/ฟรี), เวอร์ชันใหม่, ตัว stable
function scoreModel(name: string): number {
  const n = name.toLowerCase();
  let s = 0;
  if (n.includes('flash-latest')) s += 5000;           // alias ที่ Google ดูแลให้ชี้รุ่นปัจจุบันเสมอ
  if (n.includes('flash')) s += 1000;                   // flash = free-tier friendly
  const ver = n.match(/gemini-(\d+(?:\.\d+)?)/);        // ดึงเลขเวอร์ชัน เช่น 2.5, 3.0
  if (ver) s += Math.round(parseFloat(ver[1]) * 100);   // เวอร์ชันใหม่กว่า = คะแนนสูงกว่า
  if (n.includes('lite')) s -= 30;                       // lite คุณภาพต่ำกว่านิดหน่อย → รอง
  if (n.includes('preview') || n.includes('exp')) s -= 200; // ชอบ stable มากกว่า preview
  if (n.includes('thinking')) s -= 300;                  // ไม่ต้องใช้ thinking สำหรับงานนี้
  if (n.includes('pro')) s += 40;                        // pro ไว้เป็นตัวสำรอง
  if (n.includes('image') || n.includes('vision') || n.includes('tts') || n.includes('embedding')) s -= 5000; // ไม่ใช่โมเดลข้อความ
  return s;
}

async function listModels(key: string): Promise<{ models?: string[]; error?: string }> {
  try {
    const res = await fetch(`${BASE}/models`, { headers: { 'x-goog-api-key': key }, cache: 'no-store' });
    if (!res.ok) {
      if (res.status === 400 || res.status === 403)
        return { error: `คีย์ AI ใช้ไม่ได้ (${res.status}) — ตรวจว่าคีย์ถูกต้อง และเปิดใช้ Generative Language API แล้ว` };
      const body = await res.text();
      return { error: `เชื่อมต่อ Google ไม่สำเร็จ (${res.status}): ${body.slice(0, 120)}` };
    }
    const data = await res.json();
    const usable: string[] = (data?.models ?? [])
      .filter((m: any) => (m?.supportedGenerationMethods ?? []).includes('generateContent'))
      .map((m: any) => String(m?.name ?? '').replace(/^models\//, ''))
      .filter((n: string) => n.startsWith('gemini') && scoreModel(n) > 0)
      .sort((a: string, b: string) => scoreModel(b) - scoreModel(a));
    return { models: usable };
  } catch (e) {
    return { error: 'เชื่อมต่อ Google ไม่สำเร็จ: ' + String(e) };
  }
}

function buildPrompt(input: { productInfo: string; concept: string; tone: string; lang: 'th' | 'en'; count: number }) {
  const langName = input.lang === 'en' ? 'English' : 'ภาษาไทย';
  return (
    `คุณเป็นครีเอทีฟเขียนบทวิดีโอโปรโมทสินค้าสั้น (UGC/โฆษณา) สำหรับร้านค้าออนไลน์ไทย\n` +
    `เขียนบทพูด ${input.count} แบบ ที่ "hook 3 วินาทีแรก" ต่างกันชัดเจน\n` +
    `ภาษา: ${langName} | คอนเซ็ปต์: ${input.concept || 'อิสระ'} | โทน: ${input.tone || 'เป็นกันเอง'}\n` +
    `ข้อมูลสินค้า/โปรโมชัน:\n${input.productInfo}\n\n` +
    `เงื่อนไข: แต่ละบทยาวประมาณ 15-25 วินาทีเมื่อพูด พูดลื่นเป็นธรรมชาติ มี call-to-action ตอนจบ\n` +
    `ตอบเป็น JSON array เท่านั้น: [{"hook":"ชื่อสั้นของ hook","text":"บทเต็ม"}]`
  );
}

// เรียก generateContent กับโมเดลหนึ่งตัว: คืน scripts, สั่ง "ลองตัวถัดไป", หรือ error ที่ควรหยุด
async function tryModel(key: string, model: string, prompt: string, count: number):
  Promise<{ scripts?: { hook: string; text: string }[]; skip?: boolean; error?: string }> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      cache: 'no-store',
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, responseMimeType: 'application/json' },
      }),
    });
  } catch (e) {
    return { skip: true }; // เน็ตพลาดชั่วคราว → ลองตัวถัดไป
  }
  if (!res.ok) {
    const body = await res.text();
    let msg = '';
    try { msg = JSON.parse(body)?.error?.message ?? ''; } catch { /* ignore */ }
    const low = (msg + ' ' + res.status).toLowerCase();
    // โมเดลตัวนี้ใช้ไม่ได้ (เลิกให้ใช้/ไม่พบ) → ลองตัวถัดไป
    if (res.status === 404 || low.includes('no longer available') || low.includes('not found') || low.includes('not supported'))
      return { skip: true };
    // rate limit → หยุดและบอกให้รอ
    if (res.status === 429) return { error: 'AI ใช้เกินโควตาฟรีชั่วคราว — รอสักครู่แล้วลองใหม่ครับ' };
    // คีย์/สิทธิ์มีปัญหา → หยุดและบอกเลย
    if (res.status === 400 || res.status === 403)
      return { error: `คีย์ AI มีปัญหา (${res.status})${msg ? ': ' + msg.slice(0, 120) : ''}` };
    return { skip: true };
  }
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
  let arr: { hook: string; text: string }[];
  try { arr = JSON.parse(raw); } catch { arr = [{ hook: 'บทที่ 1', text: raw }]; }
  if (!Array.isArray(arr) || !arr.length) return { skip: true };
  return { scripts: arr.slice(0, count) };
}

export async function aiDraftScripts(input: {
  productInfo: string; concept: string; tone: string; lang: 'th' | 'en'; count?: number;
}): Promise<DraftResult> {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) return { error: 'ยังไม่ได้ตั้งค่าคีย์ AI (GOOGLE_AI_API_KEY) ใน Netlify' };
  if (!input.productInfo?.trim()) return { error: 'กรุณากรอกบรีฟสินค้าก่อน (อย่างน้อยชื่อสินค้า/จุดขาย)' };

  const count = input.count ?? 3;
  const { models, error } = await listModels(key);
  if (error) return { error };
  if (!models || !models.length)
    return { error: 'คีย์นี้ยังไม่มีสิทธิ์ใช้โมเดลข้อความ — ลองสร้างคีย์ใหม่ที่ aistudio.google.com/apikey' };

  const prompt = buildPrompt({ ...input, count });
  let lastErr = '';
  // ลองไล่โมเดลที่ใช้ได้จริง ตัวแรกที่ตอบสำเร็จเอาเลย (สูงสุด 6 ตัว กันช้า)
  for (const model of models.slice(0, 6)) {
    const r = await tryModel(key, model, prompt, count);
    if (r.scripts) return { scripts: r.scripts, usedModel: model };
    if (r.error) { lastErr = r.error; break; } // hard error → หยุด
    // r.skip → ลองตัวถัดไป
  }
  return { error: lastErr || 'ไม่พบโมเดล AI ที่ใช้งานได้กับคีย์นี้ — ลองสร้างคีย์ใหม่ หรือแจ้งผมได้ครับ' };
}
