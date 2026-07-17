'use client';
import { useState } from 'react';
import { updateBrand, deleteBrand } from '@/app/actions';

const PRESETS = ['#EAE41F', '#F4A81D', '#E85D3B', '#E0457B', '#8E44AD', '#2E86DE', '#16A085', '#2C3E50', '#1A1A17'];

export default function BrandEdit({ brand }: { brand: { id: string; name: string; color: string; description: string | null } }) {
  const [color, setColor] = useState(brand.color);
  const [editing, setEditing] = useState(false);

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ color: 'var(--ink)', fontWeight: 600, fontSize: 17, margin: 0 }}>รายละเอียดแบรนด์</h2>
        <button type="button" className="btn-ghost" style={{ padding: '6px 14px', borderRadius: 9, cursor: 'pointer', font: 'inherit' }} onClick={() => setEditing(!editing)}>
          {editing ? 'ยกเลิก' : '✎ แก้ไข'}
        </button>
      </div>

      {!editing ? (
        <p style={{ marginTop: 10, whiteSpace: 'pre-wrap', color: brand.description ? 'var(--ink)' : 'var(--muted)' }}>
          {brand.description || 'ยังไม่มีรายละเอียด — กด “แก้ไข” เพื่อใส่ว่าแบรนด์นี้ขายอะไร มีจุดเด่นอะไร (จะได้ไม่ต้องพิมพ์ซ้ำตอนสร้างวิดีโอ)'}
        </p>
      ) : (
        <form action={updateBrand} style={{ marginTop: 10 }}>
          <input type="hidden" name="id" value={brand.id} />
          <label className="field"><span>ชื่อแบรนด์</span>
            <input type="text" name="name" defaultValue={brand.name} required />
          </label>
          <label className="field"><span>สีแบรนด์</span></label>
          <div className="swatches">
            {PRESETS.map((c) => (
              <button type="button" key={c} className={'sw' + (color === c ? ' active' : '')} style={{ background: c }} onClick={() => setColor(c)} />
            ))}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
          <input type="hidden" name="color" value={color} />
          <label className="field"><span>รายละเอียดแบรนด์ (ขายอะไร จุดเด่น กลุ่มลูกค้า)</span>
            <textarea name="description" rows={4} defaultValue={brand.description ?? ''} placeholder="เช่น ร้านน้ำพริกโฮมเมด รสจัดจ้าน ทำสดใหม่ทุกวัน ส่งทั่วไทย" />
          </label>
          <button className="btn" style={{ marginTop: 16 }}>บันทึกการแก้ไข</button>
        </form>
      )}

      <form action={deleteBrand} style={{ marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 14 }}
        onSubmit={(e) => { if (!confirm('ลบแบรนด์ “' + brand.name + '” ใช่ไหม? (งานและรูปที่เคยทำจะยังอยู่ แค่ไม่ผูกกับแบรนด์นี้)')) e.preventDefault(); }}>
        <input type="hidden" name="id" value={brand.id} />
        <button className="btn-ghost" style={{ color: '#c0392b', borderColor: '#e2b8b1', padding: '8px 16px', borderRadius: 9, cursor: 'pointer', font: 'inherit' }}>ลบแบรนด์นี้</button>
      </form>
    </div>
  );
}
