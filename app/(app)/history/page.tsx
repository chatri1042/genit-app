import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const STATUS_TH: Record<string, string> = {
  draft: 'ร่าง', queued: 'เข้าคิว', running: 'กำลังสร้าง', done: 'เสร็จแล้ว', failed: 'ล้มเหลว',
};

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id,type,format,ratio,duration_sec,concept,status,watermarked,expires_at,created_at')
    .order('created_at', { ascending: false });

  return (
    <>
      <div className="eyebrow">ประวัติงาน</div>
      <h1 style={{ marginTop: 4 }}>งานทั้งหมดของคุณ</h1>

      {jobs && jobs.length > 0 ? (
        <div className="grid grid-2" style={{ marginTop: 20 }}>
          {jobs.map((j) => (
            <div key={j.id} className="card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 600 }}>{j.format} · {j.ratio}{j.duration_sec ? ` · ${j.duration_sec}วิ` : ''}</div>
                <span className="pill">{STATUS_TH[j.status] ?? j.status}</span>
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                {j.concept} · สร้างเมื่อ {new Date(j.created_at).toLocaleString('th-TH')}
              </div>
              {j.watermarked && j.expires_at && (
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  งานฟรี — เก็บถึง {new Date(j.expires_at).toLocaleDateString('th-TH')}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 20 }}>ยังไม่มีงาน — ไปที่ “สร้างวิดีโอ” เพื่อบันทึกงานแรก</div>
      )}
    </>
  );
}
