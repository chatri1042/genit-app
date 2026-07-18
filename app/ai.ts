'use server';
// Server Action: ให้ AI ร่างบทพูด 3 แบบ ด้วย Google Gemini (ฟรี tier)
// อ่านคีย์จาก env GOOGLE_AI_API_KEY (ตั้งใน Netlify — เป็นความลับฝั่งเซิร์ฟเวอร์)

export type DraftResult = { scripts?: { hook: string; text: string }[]; error?: string };

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
// รายชื่อโมเดลที่อยากใช้ (เรียงตามความชอบ) — จะเลือกอันแรกที่คีย์รองรับจริง
const PREFERRED = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-1.5-flash'];

// ถาม Google ว่าคีย์นี้ใช้โมเดลไหนได้บ้าง แล้วเลือกตัว flash ที่ดีที่สุด (กัน 404 จากชื่อโมเดลไม่ตรง)
async function resolveModel(key: string): Promise<{ model?: string; error?: string }> {
  try {
    const res = await fetch(`${BASE}/models`, { headers: { 'x-goog-api-key': key }, cache: 'no-store' });
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 400 || res.status === 403)
        return { error: `คีย์ AI ใช้ไม่ได้ (${res.status}) — ตรวจว่าคีย์ถูกต้อง และเปิดใช้ Generative Language API แล้ว` };
      return { error: `เชื่อมต่อ Google ไม่สำเร็จ (${res.status}): ${body.slice(0, 120)}` };
    }
    const data = await res.json();
    const usable: string[] = (data?.models ?? [])
      .filter((m: any) => (m?.supportedGenerationMethods ?? []).includes('generateContent'))
      .map((m: any) => String(m?.name ?? '').replace(/^models\//, ''));
    if (!usable.length) return { error: 'คีย์นี้ยังไม่มีสิทธิ์ใช้โมเดลข้อความ — ลองสร้างคีย์ใหม่ที่ aistudio.google.com/apikey' };
    for (const p of PREFERRED) if (usable.includes(p)) return { model: p };
    const flash = usable.find((n) => n.includes('flash')) ?? usable.find((n) => n.includes('gemini'));
    return { model: flash ?? usable[0] };
  } catch (e) {
    return { error: 'เชื่อมต่อ Google ไม่สำเร็จ: ' + String(e) };
  }
}

export async function aiDraftScripts(input: {
  productInfo: string; concept: string; tone: string; lang: 'th' | 'en'; count?: number;
}): Promise<DraftResult> {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) return { error: 'ยังไม่ได้ตั้งค่าคีย์ AI (GOOGLE_AI_API_KEY) ใน Netlify' };
  if (!input.productInfo?.trim()) return { error: 'กรุณากรอกบรีฟสินค้าก่อน (อย่างน้อยชื่อสินค้า/จุดขาย)' };

  const picked = await resolveModel(key);
  if (picked.error) return { error: picked.error };
  const model = picked.model!;

  const count = input.count ?? 3;
  const langName = input.lang === 'en' ? 'English' : 'ภาษาไทย';
  const prompt =
    `คุณเป็นครีเอทีฟเขียนบทวิดีโอโปรโมทสินค้าสั้น (UGC/โฆษณา) สำหรับร้านค้าออนไลน์ไทย\n` +
    `เขียนบทพูด ${count} แบบ ที่ "hook 3 วินาทีแรก" ต่างกันชัดเจน\n` +
    `ภาษา: ${langName} | คอนเซ็ปต์: ${input.concept || 'อิสระ'} | โทน: ${input.tone || 'เป็นกันเอง'}\n` +
    `ข้อมูลสินค้า/โปรโมชัน:\n${input.productInfo}\n\n` +
    `เงื่อนไข: แต่ละบทยาวประมาณ 15-25 วินาทีเมื่อพูด พูดลื่นเป็นธรรมชาติ มี call-to-action ตอนจบ\n` +
    `ตอบเป็น JSON array เท่านั้น: [{"hook":"ชื่อสั้นของ hook","text":"บทเต็ม"}]`;

  try {
    const res = await fetch(`${BASE}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      cache: 'no-store',
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, responseMimeType: 'application/json' },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      let msg = '';
      try { msg = JSON.parse(body)?.error?.message ?? ''; } catch { /* ignore */ }
      return { error: `AI ตอบกลับผิดพลาด (${res.status})${msg ? ': ' + msg.slice(0, 140) : ''}` };
    }
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    let arr: { hook: string; text: string }[];
    try { arr = JSON.parse(raw); } catch { arr = [{ hook: 'บทที่ 1', text: raw }]; }
    if (!Array.isArray(arr) || !arr.length) return { error: 'AI ไม่ได้ส่งบทกลับมา ลองกดใหม่อีกครั้ง' };
    return { scripts: arr.slice(0, count) };
  } catch (e) {
    return { error: 'เชื่อมต่อ AI ไม่สำเร็จ: ' + String(e) };
  }
}
