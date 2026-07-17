'use client';
// หน้าเดโม: บรีฟสินค้า -> เรียก Edge Function write-scripts -> โชว์บท 3 แบบ
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ScriptsPage() {
  const [productInfo, setProductInfo] = useState('');
  const [concept, setConcept] = useState('flash_sale');
  const [lang, setLang] = useState<'th' | 'en'>('th');
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState<{ hookLabel: string; text: string }[]>([]);
  const [err, setErr] = useState('');

  async function generate() {
    setLoading(true);
    setErr('');
    setScripts([]);
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke('write-scripts', {
      body: { productInfo, concept, lang, count: 3 },
    });
    setLoading(false);
    if (error) return setErr(error.message);
    if (data?.error) return setErr(data.error);
    setScripts(data.scripts ?? []);
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
      <h1 style={{ fontWeight: 600 }}>ร่างบทด้วย AI (Gemini Flash)</h1>
      <textarea
        value={productInfo}
        onChange={(e) => setProductInfo(e.target.value)}
        placeholder="บรีฟสินค้า: ชื่อ / ราคา / จุดขาย / โปรถึงวันไหน"
        rows={5}
        style={{ width: '100%', padding: 12, marginTop: 12, fontFamily: 'inherit', fontSize: 15 }}
      />
      <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
        <select value={concept} onChange={(e) => setConcept(e.target.value)}>
          <option value="flash_sale">ลดพิเศษ / Flash sale</option>
          <option value="review">รีวิว / บอกต่อ</option>
          <option value="new_arrival">สินค้าใหม่</option>
          <option value="how_to">วิธีใช้ / ตอบข้อสงสัย</option>
        </select>
        <select value={lang} onChange={(e) => setLang(e.target.value as 'th' | 'en')}>
          <option value="th">บทภาษาไทย</option>
          <option value="en">บทภาษาอังกฤษ</option>
        </select>
        <button
          onClick={generate}
          disabled={loading || !productInfo}
          style={{
            background: 'var(--yellow)', border: 'none', padding: '10px 20px',
            borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {loading ? 'กำลังคิด...' : 'ร่างบท 3 แบบ'}
        </button>
      </div>

      {err && <p style={{ color: '#c0392b' }}>ผิดพลาด: {err}</p>}

      <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
        {scripts.map((s, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
            <strong>{s.hookLabel}</strong>
            <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{s.text}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
