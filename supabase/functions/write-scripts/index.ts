// ============================================================
// GenIt Edge Function: write-scripts
// ร่างบทพูด 3 แบบ (hook ต่างกัน) จากบรีฟสินค้า ด้วย Gemini Flash (ฟรี tier)
//
// Deploy:  supabase functions deploy write-scripts
// Secret:  supabase secrets set GOOGLE_AI_API_KEY=xxxx
// เรียก:   POST /functions/v1/write-scripts  (แนบ Authorization: Bearer <user jwt>)
// body: { concept, productInfo, tone, lang: 'th'|'en', count?: number }
// คืน: { scripts: [{ hookLabel, text }] }
// ============================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const MODEL = 'gemini-2.5-flash'; // ฟรี tier, ไทย/EN ดี

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // 1) ตรวจสอบว่าเป็นผู้ใช้ที่ล็อกอิน (กันคนสุ่มยิง function เปลืองโควตา)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'unauthorized' }, 401);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    // 2) อ่านบรีฟ
    const { concept, productInfo, tone = 'เป็นกันเอง', lang = 'th', count = 3 } =
      await req.json();
    if (!productInfo) return json({ error: 'ต้องมี productInfo' }, 400);

    // 3) เรียก Gemini
    const apiKey = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!apiKey) return json({ error: 'ยังไม่ได้ตั้งค่า GOOGLE_AI_API_KEY' }, 500);

    const langName = lang === 'en' ? 'English' : 'ภาษาไทย';
    const prompt =
      `คุณเป็นครีเอทีฟเขียนบทวิดีโอโปรโมทสินค้าสั้น (UGC/โฆษณา) สำหรับร้านค้าออนไลน์\n` +
      `เขียนบทพูด ${count} แบบ ที่ "hook 3 วินาทีแรก" ต่างกันชัดเจน\n` +
      `ภาษา: ${langName} | คอนเซ็ปต์: ${concept ?? 'อิสระ'} | โทน: ${tone}\n` +
      `ข้อมูลสินค้า/โปรโมชัน:\n${productInfo}\n\n` +
      `เงื่อนไข: แต่ละบทยาวประมาณ 15-25 วินาทีเมื่อพูด, พูดลื่น เป็นธรรมชาติ, มี call-to-action ตอนจบ\n` +
      `ตอบเป็น JSON array เท่านั้น รูปแบบ: [{"hookLabel":"ชื่อสั้นของ hook","text":"บทเต็ม"}]`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, responseMimeType: 'application/json' },
        }),
      },
    );
    if (!res.ok) return json({ error: 'gemini error', detail: await res.text() }, 502);

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    let scripts: { hookLabel: string; text: string }[];
    try {
      scripts = JSON.parse(raw);
    } catch {
      scripts = [{ hookLabel: 'บทที่ 1', text: raw }];
    }

    return json({ scripts });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
