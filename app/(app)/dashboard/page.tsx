import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCreditBalance } from '@/lib/credits';
import { getUser } from '@/lib/auth';
import PageChar from '@/components/PageChar';
import TL from '@/components/TL';

export const dynamic = 'force-dynamic';

const STATUS_TH: Record<string, { th: string; en: string }> = {
  draft: { th: 'ร่าง', en: 'Draft' }, queued: { th: 'เข้าคิว', en: 'Queued' }, running: { th: 'กำลังสร้าง', en: 'Running' }, done: { th: 'เสร็จแล้ว', en: 'Done' }, failed: { th: 'ล้มเหลว', en: 'Failed' },
};

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
      <div className="eyebrow"><TL th="แดชบอร์ด" en="Dashboard" /></div>
      <h1><TL th="ภาพรวมของคุณ" en="Your overview" /></h1>

      <div className="grid grid-3" style={{ marginTop: 20 }}>
        <div className="card">
          <h2><TL th="เครดิตคงเหลือ" en="Credits left" /></h2>
          <div className="stat">{balance}</div>
          <Link href="/pricing" className="muted" style={{ fontSize: 14 }}><TL th="เติมเครดิต →" en="Top up →" /></Link>
        </div>
        <div className="card">
          <h2><TL th="แบรนด์" en="Brands" /></h2>
          <div className="stat">{brands?.length ?? 0}</div>
          <Link href="/brands" className="muted" style={{ fontSize: 14 }}><TL th="จัดการแบรนด์ →" en="Manage brands →" /></Link>
        </div>
        <div className="card">
          <h2><TL th="งานทั้งหมด" en="Total jobs" /></h2>
          <div className="stat">{jobs?.length ?? 0}</div>
          <Link href="/history" className="muted" style={{ fontSize: 14 }}><TL th="ดูประวัติ →" en="View history →" /></Link>
        </div>
      </div>

      <div style={{ marginTop: 26 }}>
        <Link href="/generate" className="btn btn-lg">✦ <TL th="สร้างวิดีโอใหม่" en="Create new video" /></Link>
      </div>

      <h2 style={{ marginTop: 34, fontSize: 18, fontWeight: 600 }}><TL th="งานล่าสุด" en="Recent jobs" /></h2>
      {jobs && jobs.length > 0 ? (
        <div className="grid grid-2" style={{ marginTop: 12 }}>
          {jobs.map((j) => (
            <Link key={j.id} href="/history" className="card row" style={{ justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{j.format} · {j.ratio}</div>
                <div className="muted" style={{ fontSize: 13 }}>{new Date(j.created_at).toLocaleString('th-TH')}</div>
              </div>
              <span className="pill">{STATUS_TH[j.status] ? <TL th={STATUS_TH[j.status].th} en={STATUS_TH[j.status].en} /> : j.status}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 12 }}><TL th="ยังไม่มีงาน — กด “สร้างวิดีโอใหม่” เพื่อเริ่ม" en="No jobs yet — tap “Create new video” to start" /></div>
      )}
      <PageChar name="chef" side="left" width={300} />
    </>
  );
}
