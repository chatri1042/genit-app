import { createClient } from '@/lib/supabase/server';
import PageChar from '@/components/PageChar';

export const dynamic = 'force-dynamic';

const RECO = 'pro';
const CLIPS: Record<string, string> = { trial: '~1 คลิป', starter: '~5 คลิป', pro: '~9 คลิป', biz: '~20 คลิป' };
const FEATS: Record<string, string[]> = {
  trial: ['ได้คลิปจริง 1 ตัว', 'ดูตัวอย่างก่อนได้', 'เหมาะกับลองของ'],
  starter: ['ทุกฟอร์แมต', 'สร้าง Avatar ได้', 'ซับ + โลโก้ + CTA'],
  pro: ['ทุกอย่างในเริ่มต้น', 'คลิปพรีเซนเตอร์เยอะขึ้น', 'Brand Kit หลายแบรนด์', 'คิวเร็วกว่า'],
  biz: ['ทุกอย่างในยอดนิยม', 'เหมาะยิงแอดหลายตัว', 'A/B test หลายเวอร์ชัน', 'ซัพพอร์ตเร็ว'],
};

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: packs } = await supabase.from('credit_packs').select('*').eq('active', true).order('sort');

  return (
    <>
      <div className="eyebrow">ราคา</div>
      <h1>เติมเครดิต</h1>
      <p className="muted">จ่ายเท่าที่ใช้ · ยิ่งแพ็กใหญ่ยิ่งได้โบนัสเครดิตเยอะ · ระบบโชว์เครดิตให้เห็นก่อนกดสร้างทุกครั้ง</p>

      <div className="tiers">
        {(packs ?? []).map((p) => (
          <div key={p.id} className={'tier' + (p.id === RECO ? ' reco' : '')}>
            {p.id === RECO && <div className="tbadge">⭐ แนะนำ</div>}
            <div className="tname">{p.name}</div>
            <div className="tprice">฿{p.price_thb.toLocaleString()}</div>
            <div className="tcr">{p.credits} เครดิต{p.bonus_pct > 0 ? ` · โบนัส +${p.bonus_pct}%` : ''}</div>
            <div className="pill" style={{ marginTop: 8 }}>{CLIPS[p.id] ?? ''}</div>
            <ul style={{ paddingLeft: 18, marginTop: 12, fontSize: 14, lineHeight: 1.9 }}>
              {(FEATS[p.id] ?? []).map((f, i) => <li key={i}>{f}</li>)}
            </ul>
            <button className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>เลือกแพ็กนี้</button>
          </div>
        ))}
      </div>
      <h2 style={{ marginTop: 36, fontSize: 18, fontWeight: 600 }}>เครดิตใช้ยังไง (คิดตามความยาว)</h2>
      <div className="cguide">
        <div className="cg-item"><div className="cg-cr">3</div><div><div className="cg-t">สร้างรูปอย่างเดียว</div><div className="cg-s">ต่อ 1 รูป · ถูกสุด ไว้โพส</div></div></div>
        <div className="cg-item"><div className="cg-cr">7</div><div><div className="cg-t">พรีเซนเตอร์พูด 15 วิ</div><div className="cg-s">30 วิ ≈ 13 เครดิต · ไม่ต้องมีสินค้าก็ได้</div></div></div>
        <div className="cg-item"><div className="cg-cr">15</div><div><div className="cg-t">โชว์สินค้า 20 วิ</div><div className="cg-s">30 วิ ≈ 22 เครดิต · ตัดสลับหลายช็อต</div></div></div>
        <div className="cg-item"><div className="cg-cr">1</div><div><div className="cg-t">ฟังเสียง / พรีวิวภาพ</div><div className="cg-s">ลองก่อนจ่ายค่าวิดีโอเต็ม</div></div></div>
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 18 }}>* ปุ่มซื้อยังเป็นตัวอย่าง — ระบบชำระเงิน (PromptPay/บัตร) จะต่อในเฟสถัดไป</p>
      <PageChar name="plant" side="right" width={240} />
    </>
  );
}
