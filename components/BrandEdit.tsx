'use client';
import { useState } from 'react';
import { updateBrand, deleteBrand } from '@/app/actions';
import { useLang } from './LanguageProvider';

const PRESETS = ['#EAE41F', '#F4A81D', '#E85D3B', '#E0457B', '#8E44AD', '#2E86DE', '#16A085', '#2C3E50', '#1A1A17'];

export default function BrandEdit({ brand }: { brand: { id: string; name: string; color: string; description: string | null } }) {
  const [color, setColor] = useState(brand.color);
  const [editing, setEditing] = useState(false);
  const { lang } = useLang();
  const T = (th: string, en: string) => (lang === 'th' ? th : en);

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ color: 'var(--ink)', fontWeight: 600, fontSize: 17, margin: 0 }}>{T('รายละเอียดแบรนด์', 'Brand details')}</h2>
        <button type="button" className="btn-ghost" style={{ padding: '6px 14px', borderRadius: 9, cursor: 'pointer', font: 'inherit' }} onClick={() => setEditing(!editing)}>
          {editing ? T('ยกเลิก', 'Cancel') : T('✎ แก้ไข', '✎ Edit')}
        </button>
      </div>

      {!editing ? (
        <p style={{ marginTop: 10, whiteSpace: 'pre-wrap', color: brand.description ? 'var(--ink)' : 'var(--muted)' }}>
          {brand.description || T('ยังไม่มีรายละเอียด — กด “แก้ไข” เพื่อใส่ว่าแบรนด์นี้ขายอะไร มีจุดเด่นอะไร (จะได้ไม่ต้องพิมพ์ซ้ำตอนสร้างวิดีโอ)', 'No details yet — tap “Edit” to describe what this brand sells and its strengths (so you don\'t retype it every time).')}
        </p>
      ) : (
        <form action={updateBrand} style={{ marginTop: 10 }}>
          <input type="hidden" name="id" value={brand.id} />
          <label className="field"><span>{T('ชื่อแบรนด์', 'Brand name')}</span>
            <input type="text" name="name" defaultValue={brand.name} required />
          </label>
          <label className="field"><span>{T('สีแบรนด์', 'Brand color')}</span></label>
          <div className="swatches">
            {PRESETS.map((c) => (
              <button type="button" key={c} className={'sw' + (color === c ? ' active' : '')} style={{ background: c }} onClick={() => setColor(c)} />
            ))}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
          <input type="hidden" name="color" value={color} />
          <label className="field"><span>{T('รายละเอียดแบรนด์ (ขายอะไร จุดเด่น กลุ่มลูกค้า)', 'Brand details (what you sell, strengths, audience)')}</span>
            <textarea name="description" rows={4} defaultValue={brand.description ?? ''} placeholder={T('เช่น ร้านน้ำพริกโฮมเมด รสจัดจ้าน ทำสดใหม่ทุกวัน ส่งทั่วไทย', 'e.g. homemade chili paste, bold flavor, made fresh daily, nationwide shipping')} />
          </label>
          <button className="btn" style={{ marginTop: 16 }}>{T('บันทึกการแก้ไข', 'Save changes')}</button>
        </form>
      )}

      <form action={deleteBrand} style={{ marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 14 }}
        onSubmit={(e) => { if (!confirm(T('ลบแบรนด์ “' + brand.name + '” ใช่ไหม? (งานและรูปที่เคยทำจะยังอยู่ แค่ไม่ผูกกับแบรนด์นี้)', 'Delete brand “' + brand.name + '”? (Existing jobs and photos stay, just unlinked from this brand.)'))) e.preventDefault(); }}>
        <input type="hidden" name="id" value={brand.id} />
        <button className="btn-ghost" style={{ color: '#c0392b', borderColor: '#e2b8b1', padding: '8px 16px', borderRadius: 9, cursor: 'pointer', font: 'inherit' }}>{T('ลบแบรนด์นี้', 'Delete this brand')}</button>
      </form>
    </div>
  );
}
