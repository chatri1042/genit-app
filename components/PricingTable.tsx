'use client';
import { useLang } from './LanguageProvider';

type Pack = { id: string; name: string; price_thb: number; credits: number; bonus_pct: number };

const RECO = 'pro';
const NAME_EN: Record<string, string> = { trial: 'Try it', starter: 'Starter', pro: 'Popular', biz: 'Business' };
const CLIPS: Record<string, { th: string; en: string }> = {
  trial: { th: '~1 คลิป', en: '~1 clip' }, starter: { th: '~5 คลิป', en: '~5 clips' },
  pro: { th: '~9 คลิป', en: '~9 clips' }, biz: { th: '~20 คลิป', en: '~20 clips' },
};
const FEATS: Record<string, { th: string; en: string }[]> = {
  trial: [{ th: 'ได้คลิปจริง 1 ตัว', en: '1 real clip' }, { th: 'ดูตัวอย่างก่อนได้', en: 'Preview first' }, { th: 'เหมาะกับลองของ', en: 'Great for trying' }],
  starter: [{ th: 'ทุกฟอร์แมต', en: 'All formats' }, { th: 'สร้าง Avatar ได้', en: 'AI avatars' }, { th: 'ซับ + โลโก้ + CTA', en: 'Subs + logo + CTA' }],
  pro: [{ th: 'ทุกอย่างในเริ่มต้น', en: 'Everything in Starter' }, { th: 'คลิปพรีเซนเตอร์เยอะขึ้น', en: 'More presenter clips' }, { th: 'Brand Kit หลายแบรนด์', en: 'Multiple brand kits' }, { th: 'คิวเร็วกว่า', en: 'Faster queue' }],
  biz: [{ th: 'ทุกอย่างในยอดนิยม', en: 'Everything in Popular' }, { th: 'เหมาะยิงแอดหลายตัว', en: 'For many ad sets' }, { th: 'A/B test หลายเวอร์ชัน', en: 'A/B test versions' }, { th: 'ซัพพอร์ตเร็ว', en: 'Priority support' }],
};
const GUIDE: { cr: string; t: { th: string; en: string }; s: { th: string; en: string } }[] = [
  { cr: '3', t: { th: 'สร้างรูปอย่างเดียว', en: 'Images only' }, s: { th: 'ต่อ 1 รูป · ถูกสุด ไว้โพส', en: 'per image · cheapest' } },
  { cr: '7', t: { th: 'พรีเซนเตอร์พูด 15 วิ', en: 'Talking presenter 15s' }, s: { th: '30 วิ ≈ 13 เครดิต · ไม่ต้องมีสินค้าก็ได้', en: '30s ≈ 13 cr · product optional' } },
  { cr: '15', t: { th: 'โชว์สินค้า 20 วิ', en: 'Product video 20s' }, s: { th: '30 วิ ≈ 22 เครดิต · ตัดสลับหลายช็อต', en: '30s ≈ 22 cr · multi-shot' } },
  { cr: '1', t: { th: 'ฟังเสียง / พรีวิวภาพ', en: 'Voice / image preview' }, s: { th: 'ลองก่อนจ่ายค่าวิดีโอเต็ม', en: 'Try before full video' } },
];

export default function PricingTable({ packs }: { packs: Pack[] }) {
  const { lang } = useLang();
  const T = (th: string, en: string) => (lang === 'th' ? th : en);
  return (
    <>
      <div className="eyebrow">{T('ราคา', 'Pricing')}</div>
      <h1>{T('เติมเครดิต', 'Top up credits')}</h1>
      <p className="muted">{T('จ่ายเท่าที่ใช้ · ยิ่งแพ็กใหญ่ยิ่งได้โบนัสเครดิตเยอะ · ระบบโชว์เครดิตให้เห็นก่อนกดสร้างทุกครั้ง', 'Pay as you go · bigger packs give more bonus credits · credits always shown before you generate')}</p>

      <div className="tiers">
        {packs.map((p) => (
          <div key={p.id} className={'tier' + (p.id === RECO ? ' reco' : '')}>
            {p.id === RECO && <div className="tbadge">⭐ {T('แนะนำ', 'Best value')}</div>}
            <div className="tname">{lang === 'th' ? p.name : (NAME_EN[p.id] ?? p.name)}</div>
            <div className="tprice">฿{p.price_thb.toLocaleString()}</div>
            <div className="tcr">{p.credits} {T('เครดิต', 'credits')}{p.bonus_pct > 0 ? ` · ${T('โบนัส', 'bonus')} +${p.bonus_pct}%` : ''}</div>
            <div className="pill" style={{ marginTop: 8 }}>{lang === 'th' ? (CLIPS[p.id]?.th ?? '') : (CLIPS[p.id]?.en ?? '')}</div>
            <ul style={{ paddingLeft: 18, marginTop: 12, fontSize: 14, lineHeight: 1.9 }}>
              {(FEATS[p.id] ?? []).map((f, i) => <li key={i}>{lang === 'th' ? f.th : f.en}</li>)}
            </ul>
            <button className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>{T('เลือกแพ็กนี้', 'Choose this pack')}</button>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 36, fontSize: 18, fontWeight: 600 }}>{T('เครดิตใช้ยังไง (คิดตามความยาว)', 'How credits work (by length)')}</h2>
      <div className="cguide">
        {GUIDE.map((g, i) => (
          <div className="cg-item" key={i}><div className="cg-cr">{g.cr}</div><div><div className="cg-t">{lang === 'th' ? g.t.th : g.t.en}</div><div className="cg-s">{lang === 'th' ? g.s.th : g.s.en}</div></div></div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 18 }}>{T('* ปุ่มซื้อยังเป็นตัวอย่าง — ระบบชำระเงิน (PromptPay/บัตร) จะต่อในเฟสถัดไป', '* Buy buttons are still a demo — payment (PromptPay/card) comes in the next phase')}</p>
    </>
  );
}
