import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import BrandCreateForm from '@/components/BrandCreateForm';
import PageChar from '@/components/PageChar';

export const dynamic = 'force-dynamic';

export default async function BrandsPage() {
  const supabase = await createClient();
  const { data: brands } = await supabase.from('brands').select('id,name,color,created_at').order('created_at');

  return (
    <>
      <div className="eyebrow">แบรนด์</div>
      <h1>Brand Kit ของคุณ</h1>
      <p className="muted">กดที่แบรนด์เพื่อเข้าไปอัพรูปสินค้าประจำ + ใส่รายละเอียด แล้วเวลาสร้างวิดีโอจะเลือกใช้ได้เลย</p>

      <div className="grid grid-2" style={{ marginTop: 20, alignItems: 'start' }}>
        <div className="card">
          <h2 style={{ color: 'var(--ink)', fontWeight: 600, fontSize: 17 }}>สร้างแบรนด์ใหม่</h2>
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
                    <div className="muted" style={{ fontSize: 13 }}>สร้างเมื่อ {new Date(b.created_at).toLocaleDateString('th-TH')}</div>
                  </div>
                  <span className="muted" style={{ fontSize: 20 }}>›</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty">ยังไม่มีแบรนด์ — สร้างอันแรกทางซ้าย</div>
          )}
        </div>
      </div>
      <PageChar name="fashion" side="right" width={190} />
    </>
  );
}
