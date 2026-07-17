import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCreditBalance } from '@/lib/credits';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const balance = await getCreditBalance(user?.id);
  const [{ data: brands }, { data: jobs }, { data: packs }] = await Promise.all([
    supabase.from('brands').select('id,name,color').order('created_at'),
    supabase.from('jobs').select('id,type,format,ratio,status,created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('credit_packs').select('id,name,price_thb,credits').eq('active', true).order('sort'),
  ]);

  return (
    <>
      <div className="eyebrow">แดชบอร์ด</div>
      <h1 style={{ marginTop: 4 }}>ภาพรวมของคุณ</h1>

      <div className="grid grid-3" style={{ marginTop: 20 }}>
        <div className="card">
          <h2>เครดิตคงเหลือ</h2>
          <div className="stat">{balance}</div>
          <Link href="/pricing" className="muted" style={{ fontSize: 14 }}>เติมเครดิต →</Link>
        </div>
        <div className="card">
          <h2>แบรนด์</h2>
          <div className="stat">{brands?.length ?? 0}</div>
          <Link href="/brands" className="muted" style={{ fontSize: 14 }}>จัดการแบรนด์ →</Link>
        </div>
        <div className="card">
          <h2>งานทั้งหมด</h2>
          <div className="stat">{jobs?.length ?? 0}</div>
          <Link href="/history" className="muted" style={{ fontSize: 14 }}>ดูประวัติ →</Link>
        </div>
      </div>

      <div style={{ marginTop: 28 }} className="row">
        <Link href="/generate" className="btn">✦ สร้างวิดีโอใหม่</Link>
      </div>

      <h2 style={{ marginTop: 32, fontSize: 18, fontWeight: 600 }}>งานล่าสุด</h2>
      {jobs && jobs.length > 0 ? (
        <div className="grid grid-2" style={{ marginTop: 12 }}>
          {jobs.map((j) => (
            <div key={j.id} className="card row" style={{ justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{j.format} · {j.ratio}</div>
                <div className="muted" style={{ fontSize: 13 }}>{new Date(j.created_at).toLocaleString('th-TH')}</div>
              </div>
              <span className="pill">{j.status}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 12 }}>ยังไม่มีงาน — กด “สร้างวิดีโอใหม่” เพื่อเริ่ม</div>
      )}

      <h2 style={{ marginTop: 32, fontSize: 18, fontWeight: 600 }}>แพ็กราคา (จากฐานข้อมูล)</h2>
      <div className="grid grid-3" style={{ marginTop: 12 }}>
        {(packs ?? []).map((p) => (
          <div key={p.id} className="card">
            <div style={{ fontWeight: 600 }}>{p.name}</div>
            <div className="stat" style={{ fontSize: 24 }}>฿{p.price_thb.toLocaleString()}</div>
            <div className="muted">{p.credits} เครดิต</div>
          </div>
        ))}
      </div>
    </>
  );
}
