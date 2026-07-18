'use server';
// Server Action: ให้ AI ร่างบทพูด 3 แบบ ด้วย Google Gemini (ฟรี tier)
// อ่านคีย์จาก env GOOGLE_AI_API_KEY (ตั้งใน Netlify — เป็นความลับฝั่งเซิร์ฟเวอร์)

const MODEL = 'gemini-2.5-flash';

export type DraftResult = { scripts?: { hook: string; text: string }[]; error?: string };

export async function aiDraftScripts(input: {
  productInfo: string; concept: string; tone: string; lang: 'th' | 'en'; count?: number;
}): Promise<DraftResult> {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) return { error: 'ยังไม่ได้ตั้งค่าคีย์ AI (GOOGLE_AI_API_KEY) ใน Netlify' };
  if (!input.productInfo?.trim()) return { error: 'กรุณากรอกบรีฟสินค้าก่อน (อย่างน้อยชื่อสินค้า/จุดขาย)' };

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
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, responseMimeType: 'application/json' },
        }),
      },
    );
    if (!res.ok) return { error: 'AI ตอบกลับผิดพลาด (' + res.status + ')' };
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    let arr: { hook: string; text: string }[];
    try { arr = JSON.parse(raw); } catch { arr = [{ hook: 'บทที่ 1', text: raw }]; }
    return { scripts: arr.slice(0, count) };
  } catch (e) {
    return { error: 'เชื่อมต่อ AI ไม่สำเร็จ: ' + String(e) };
  }
}
