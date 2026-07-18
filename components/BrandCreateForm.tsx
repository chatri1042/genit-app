'use client';
import { useState } from 'react';
import { createBrand } from '@/app/actions';
import { useLang } from './LanguageProvider';

const PRESETS = ['#EAE41F', '#F4A81D', '#E85D3B', '#E0457B', '#8E44AD', '#2E86DE', '#16A085', '#2C3E50', '#1A1A17'];

export default function BrandCreateForm() {
  const [color, setColor] = useState('#EAE41F');
  const { lang } = useLang();
  const T = (th: string, en: string) => (lang === 'th' ? th : en);
  return (
    <form action={createBrand}>
      <label className="field"><span>{T('ชื่อแบรนด์', 'Brand name')}</span>
        <input type="text" name="name" required placeholder={T('เช่น ครัวคุณยาย', 'e.g. Grandma\'s Kitchen')} />
      </label>
      <label className="field"><span>{T('สีแบรนด์ (จิ้มเลือกได้เลย)', 'Brand color (tap to pick)')}</span></label>
      <div className="swatches">
        {PRESETS.map((c) => (
          <button type="button" key={c} className={'sw' + (color === c ? ' active' : '')} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />
        ))}
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} title={T('เลือกสีเอง', 'Custom color')} />
      </div>
      <input type="hidden" name="color" value={color} />
      <label className="field"><span>{T('รายละเอียดแบรนด์ (ขายอะไร จุดเด่น กลุ่มลูกค้า)', 'Brand details (what you sell, strengths, audience)')}</span>
        <textarea name="description" rows={3} placeholder={T('เช่น ร้านน้ำพริกโฮมเมด รสจัดจ้าน ทำสดใหม่ทุกวัน ส่งทั่วไทย กลุ่มลูกค้าชอบของกินเล่น', 'e.g. homemade chili paste, bold flavor, made fresh daily, nationwide shipping')} />
      </label>
      <button className="btn" style={{ marginTop: 18 }}>{T('บันทึกแบรนด์', 'Save brand')}</button>
    </form>
  );
}
