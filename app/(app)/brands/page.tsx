import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import BrandCreateForm from '@/components/BrandCreateForm';
import PageChar from '@/components/PageChar';
import TL from '@/components/TL';

export const dynamic = 'force-dynamic';

export default async function BrandsPage() {
  const supabase = await createClient();
  const { data: brands } = await supabase.from('brands').select('id,name,color,created_at').order('created_at');

  return (
    <>
      <div className="eyebrow"><TL th="แบรนด์" en="Brands" /></div>
      <h1><TL th="Brand Kit ของคุณ" en="Your Brand Kit" /></h1>
      <p className="muted"><TL th="กดที่แบรนด์เพื่อเข้าไปอัพรูปสินค้าประจำ + ใส่รายละเอียด แล้วเวลาสร้างวิดีโอจะเลือกใช้ได้เลย" en="Tap a brand to add its product photos + details, then pick it when creating a video." /></p>

      <div className="grid grid-2" style={{ marginTop: 20, alignItems: 'start' }}>
        <div className="card">
          <h2 style={{ color: 'var(--ink)', fontWeight: 600, fontSize: 17 }}><TL th="สร้างแบรนด์ใหม่" en="Create a brand" /></h2>
          <BrandCreateForm />
        </div>

        <div>
          {brands && brands.length > 0 ? (
            <div className="grid">
              {brands.map((b) => (
                <Link key={b.id} href={`/brands/${b.id}`} className="card row" style={{ gap: 14, cursor: 'pointer' }}>
                  <span style={{ width: 42, height: 42, borderRadius: 11, background: b.color, display: 'inline-block', flex: 'none' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{b.name}</div>
                    <div className="muted" style={{ fontSize: 13 }}><TL th="สร้างเมื่อ" en="Created" /> {new Date(b.created_at).toLocaleDateString(undefined)}</div>
                  </div>
                  <span className="muted" style={{ fontSize: 20 }}>›</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty"><TL th="ยังไม่มีแบรนด์ — สร้างอันแรกทางซ้าย" en="No brands yet — create your first on the left" /></div>
          )}
        </div>
      </div>
      <PageChar name="fashion" side="right" width={260} />
    </>
  );
}
