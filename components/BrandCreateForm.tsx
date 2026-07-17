'use client';
import { useState } from 'react';
import { createBrand } from '@/app/actions';

const PRESETS = ['#EAE41F', '#F4A81D', '#E85D3B', '#E0457B', '#8E44AD', '#2E86DE', '#16A085', '#2C3E50', '#1A1A17'];

export default function BrandCreateForm() {
  const [color, setColor] = useState('#EAE41F');
  return (
    <form action={createBrand}>
      <label className="field"><span>ชื่อแบรนด์</span>
        <input type="text" name="name" required placeholder="เช่น ครัวคุณยาย" />
      </label>
      <label className="field"><span>สีแบรนด์ (จิ้มเลือกได้เลย)</span></label>
      <div className="swatches">
        {PRESETS.map((c) => (
          <button type="button" key={c} className={'sw' + (color === c ? ' active' : '')} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />
        ))}
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} title="เลือกสีเอง" />
      </div>
      <input type="hidden" name="color" value={color} />
      <button className="btn" style={{ marginTop: 18 }}>บันทึกแบรนด์</button>
    </form>
  );
}
