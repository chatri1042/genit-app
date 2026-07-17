import { createClient } from '@/lib/supabase/server';
import { createBrand } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function BrandsPage() {
  const supabase = await createClient();
  const { data: brands } = await supabase.from('brands').select('id,name,color,created_at').order('created_at');

  return (
    <>
      <div className="eyebrow">แบรนด์</div>
      <h1 style={{ marginTop: 4 }}>Brand Kit ของคุณ</h1>

      <div className="grid grid-2" style={{ marginTop: 20 }}>
        <div className="card">
          <h2 style={{ color: 'var(--ink)', fontWeight: 600 }}>สร้างแบรนด์ใหม่</h2>
          <form action={createBrand}>
            <label className="field"><span>ชื่อแบรนด์</span>
              <input type="text" name="name" required placeholder="เช่น ครัวคุณยาย" />
            </label>
            <label className="field"><span>สีแบรนด์</span>
              <input type="text" name="color" defaultValue="#EAE41F" />
            </label>
            <button className="btn" style={{ marginTop: 16 }}>บันทึกแบรนด์</button>
          </form>
        </div>

        <div>
          {brands && brands.length > 0 ? (
            <div className="grid">
              {brands.map((b) => (
                <div key={b.id} className="card row" style={{ gap: 14 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, background: b.color, display: 'inline-block', flex: 'none' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{b.name}</div>
                    <div className="muted" style={{ fontSize: 13 }}>สร้างเมื่อ {new Date(b.created_at).toLocaleDateString('th-TH')}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">ยังไม่มีแบรนด์ — สร้างอันแรกทางซ้าย</div>
          )}
        </div>
      </div>
    </>
  );
}
