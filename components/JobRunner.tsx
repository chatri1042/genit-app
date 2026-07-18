'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { startGeneration, pollJob, type GenState } from '@/app/gen';
import { useLang } from './LanguageProvider';

export default function JobRunner({ jobId, initialStatus, isImage }: { jobId: string; initialStatus: string; isImage: boolean }) {
  const { lang } = useLang();
  const T = (th: string, en: string) => (lang === 'th' ? th : en);
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
            {state.status === 'queued' ? T('กำลังเริ่ม…', 'Starting…') : T('AI กำลังสร้าง…', 'AI is generating…')}
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {typeof state.done === 'number' && state.total ? T(`เสร็จ ${state.done}/${state.total} ชิ้น · `, `${state.done}/${state.total} done · `) : ''}
            {isImage ? T('รูปมักเสร็จใน ~10-30 วิ', 'Images usually take ~10-30s') : T('วิดีโอใช้เวลา ~1-3 นาที', 'Videos take ~1-3 min')} — {T('เปิดหน้านี้ค้างไว้ได้เลย', 'you can keep this page open')}
          </div>
        </div>
      )}

      {state.needCredits && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 30 }}>💳</div>
          <div style={{ fontWeight: 700, marginTop: 8 }}>{T('เครดิตไม่พอ', 'Not enough credits')}</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>{state.error}</div>
          <Link href="/pricing" className="btn btn-lg" style={{ marginTop: 14, display: 'inline-block' }}>{T('เติมเครดิต →', 'Top up →')}</Link>
        </div>
      )}

      {state.status === 'failed' && !state.needCredits && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 30 }}>⚠️</div>
          <div style={{ fontWeight: 700, marginTop: 8 }}>{T('สร้างไม่สำเร็จ', 'Generation failed')}</div>
          <div className="muted" style={{ fontSize: 13.5, marginTop: 4, maxWidth: 460, marginInline: 'auto' }}>{state.error ?? T('เกิดข้อผิดพลาด', 'An error occurred')}</div>
          <button className="btn" style={{ marginTop: 14 }} onClick={retry}>{T('ลองใหม่', 'Try again')}</button>
        </div>
      )}

      {state.results && state.results.length > 0 && (
        <>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>
            {state.status === 'done' ? T('✓ เสร็จแล้ว', '✓ Done') : T('ผลลัพธ์', 'Results')} ({state.results.length} {T('ชิ้น', 'pcs')})
          </div>
          <div className="result-grid">
            {state.results.map((r, i) => (
              <div key={i} className="result-item">
                {r.kind === 'video'
                  ? <video src={r.url} controls playsInline style={{ width: '100%', borderRadius: 12, background: '#000' }} />
                  : <img src={r.url} alt="" style={{ width: '100%', borderRadius: 12 }} />}
                <a href={r.url} download className="btn-ghost" style={{ display: 'block', textAlign: 'center', marginTop: 8, padding: '8px 0', borderRadius: 8, fontSize: 14 }}>
                  {T('ดาวน์โหลด', 'Download')}{r.kind === 'video' ? T('วิดีโอ', ' video') : T('รูป', ' image')}
                </a>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
