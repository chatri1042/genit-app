'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { startGeneration, pollJob, type GenState } from '@/app/gen';

export default function JobRunner({ jobId, initialStatus, isImage }: { jobId: string; initialStatus: string; isImage: boolean }) {
  const [state, setState] = useState<GenState>({ status: initialStatus as any });
  const started = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    async function kick() {
      if (started.current) return;
      started.current = true;
      const first = initialStatus === 'queued' ? await startGeneration(jobId) : await pollJob(jobId);
      if (!alive) return;
      setState(first);
      if (first.status === 'running') schedule();
    }
    function schedule() {
      timer.current = setTimeout(async () => {
        const s = await pollJob(jobId);
        if (!alive) return;
        setState(s);
        if (s.status === 'running') schedule();
      }, 4000);
    }
    kick();
    return () => { alive = false; if (timer.current) clearTimeout(timer.current); };
  }, [jobId, initialStatus]);

  async function retry() {
    started.current = false;
    setState({ status: 'queued' });
    const s = await startGeneration(jobId);
    setState(s);
    if (s.status === 'running') {
      timer.current = setTimeout(function loop() {
        pollJob(jobId).then((r) => { setState(r); if (r.status === 'running') timer.current = setTimeout(loop, 4000); });
      }, 4000);
    }
  }

  const busy = state.status === 'running' || state.status === 'queued';

  return (
    <div className="card" style={{ marginTop: 20 }}>
      {busy && !state.needCredits && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div className="spinner" />
          <div style={{ fontWeight: 600, marginTop: 12 }}>
            {state.status === 'queued' ? 'กำลังเริ่ม…' : 'AI กำลังสร้าง…'}
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {typeof state.done === 'number' && state.total ? `เสร็จ ${state.done}/${state.total} ชิ้น · ` : ''}
            {isImage ? 'รูปมักเสร็จใน ~10-30 วิ' : 'วิดีโอใช้เวลา ~1-3 นาที'} — เปิดหน้านี้ค้างไว้ได้เลย
          </div>
        </div>
      )}

      {state.needCredits && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 30 }}>💳</div>
          <div style={{ fontWeight: 700, marginTop: 8 }}>เครดิตไม่พอ</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>{state.error}</div>
          <Link href="/pricing" className="btn btn-lg" style={{ marginTop: 14, display: 'inline-block' }}>เติมเครดิต →</Link>
        </div>
      )}

      {state.status === 'failed' && !state.needCredits && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 30 }}>⚠️</div>
          <div style={{ fontWeight: 700, marginTop: 8 }}>สร้างไม่สำเร็จ</div>
          <div className="muted" style={{ fontSize: 13.5, marginTop: 4, maxWidth: 460, marginInline: 'auto' }}>{state.error ?? 'เกิดข้อผิดพลาด'}</div>
          <button className="btn" style={{ marginTop: 14 }} onClick={retry}>ลองใหม่</button>
        </div>
      )}

      {state.results && state.results.length > 0 && (
        <>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>
            {state.status === 'done' ? '✓ เสร็จแล้ว' : 'ผลลัพธ์'} ({state.results.length} ชิ้น)
          </div>
          <div className="result-grid">
            {state.results.map((r, i) => (
              <div key={i} className="result-item">
                {r.kind === 'video'
                  ? <video src={r.url} controls playsInline style={{ width: '100%', borderRadius: 12, background: '#000' }} />
                  : <img src={r.url} alt="" style={{ width: '100%', borderRadius: 12 }} />}
                <a href={r.url} download className="btn-ghost" style={{ display: 'block', textAlign: 'center', marginTop: 8, padding: '8px 0', borderRadius: 8, fontSize: 14 }}>
                  ดาวน์โหลด{r.kind === 'video' ? 'วิดีโอ' : 'รูป'}
                </a>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
