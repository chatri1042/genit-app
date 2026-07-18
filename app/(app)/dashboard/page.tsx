import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCreditBalance } from '@/lib/credits';
import { getUser } from '@/lib/auth';
import PageChar from '@/components/PageChar';

export const dynamic = 'force-dynamic';

const STATUS_TH: Record<string, string> = { draft: 'ร่าง', queued: 'เข้าคิว', running: 'กำลังสร้าง', done: 'เสร็จแล้ว', failed: 'ล้มเหลว' };

export default async function Dashboard() {
  const supabase = await createClient();
  const user = await getUser();
  const balance = await getCreditBalance(user?.id);
  const [{ data: brands }, { data: jobs }] = await Promise.all([
    supabase.from('brands').select('id').order('created_at'),
    supabase.from('jobs').select('id,format,ratio,status,created_at').order('created_at', { ascending: false }).limit(6),
  ]);

  return (
    <>
      <div className="eyebrow">แดชบอร์ด</div>
      <h1>ภาพรวมของคุณ</h1>

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

      <div style={{ marginTop: 26 }}>
        <Link href="/generate" className="btn btn-lg">✦ สร้างวิดีโอใหม่</Link>
      </div>

      <h2 style={{ marginTop: 34, fontSize: 18, fontWeight: 600 }}>งานล่าสุด</h2>
      {jobs && jobs.length > 0 ? (
        <div className="grid grid-2" style={{ marginTop: 12 }}>
          {jobs.map((j) => (
            <Link key={j.id} href="/history" className="card row" style={{ justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{j.format} · {j.ratio}</div>
                <div className="muted" style={{ fontSize: 13 }}>{new Date(j.created_at).toLocaleString('th-TH')}</div>
              </div>
              <span className="pill">{STATUS_TH[j.status] ?? j.status}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 12 }}>ยังไม่มีงาน — กด “สร้างวิดีโอใหม่” เพื่อเริ่ม</div>
      )}
      <PageChar name="chef" side="left" width={300} />
    </>
  );
}
