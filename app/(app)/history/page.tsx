import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import PageChar from '@/components/PageChar';
import TL from '@/components/TL';

export const dynamic = 'force-dynamic';

const STATUS_TH: Record<string, { th: string; en: string }> = {
  draft: { th: 'ร่าง', en: 'Draft' }, queued: { th: 'เข้าคิว', en: 'Queued' }, running: { th: 'กำลังสร้าง', en: 'Running' }, done: { th: 'เสร็จแล้ว', en: 'Done' }, failed: { th: 'ล้มเหลว', en: 'Failed' },
};

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id,type,format,ratio,duration_sec,concept,status,watermarked,expires_at,created_at,output_urls')
    .order('created_at', { ascending: false });

  // ทำ thumbnail (signed URL) ให้งานที่เสร็จแล้ว
  const thumbs: Record<string, { kind: string; url: string } | null> = {};
  for (const j of jobs ?? []) {
    const first = (j.output_urls?.results ?? [])[0];
    if (j.status === 'done' && first?.path) {
      const { data } = await supabase.storage.from('outputs').createSignedUrl(first.path, 3600);
      thumbs[j.id] = data?.signedUrl ? { kind: first.kind, url: data.signedUrl } : null;
    }
  }

  return (
    <>
      <div className="eyebrow"><TL th="ประวัติงาน" en="History" /></div>
      <h1 style={{ marginTop: 4 }}><TL th="งานทั้งหมดของคุณ" en="All your jobs" /></h1>

      {jobs && jobs.length > 0 ? (
        <div className="grid grid-2" style={{ marginTop: 20 }}>
          {jobs.map((j) => {
            const th = thumbs[j.id];
            return (
              <Link key={j.id} href={`/jobs/${j.id}`} className="card" style={{ display: 'block' }}>
                <div className="row" style={{ justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{j.format} · {j.ratio}{j.duration_sec ? ` · ${j.duration_sec}วิ` : ''}</div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                      {j.concept} · {new Date(j.created_at).toLocaleString('th-TH')}
                    </div>
                    {j.watermarked && j.expires_at && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        <TL th="งานฟรี — เก็บถึง" en="Free job — kept until" /> {new Date(j.expires_at).toLocaleDateString(undefined)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <span className={'pill' + (j.status === 'done' ? ' tag-person' : '')}>{STATUS_TH[j.status] ? <TL th={STATUS_TH[j.status].th} en={STATUS_TH[j.status].en} /> : j.status}</span>
                    {th && (th.kind === 'video'
                      ? <video src={th.url} muted style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, background: '#000' }} />
                      : <img src={th.url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} />)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 20 }}><TL th="ยังไม่มีงาน — ไปที่ “สร้างวิดีโอ” เพื่อบันทึกงานแรก" en="No jobs yet — go to “Create video” to save your first" /></div>
      )}
      <PageChar name="repair" side="right" width={300} />
    </>
  );
}
