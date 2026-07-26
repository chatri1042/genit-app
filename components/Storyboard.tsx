'use client';
import { useEffect, useRef, useState } from 'react';
import { startShotImage, pollShotImage, type ShotInput } from '@/app/shots';
import { useLang } from './LanguageProvider';

export const SHOT_IMG_COST = 3;
export type Shot = { id: string; name: string; desc: string; imgPath?: string };

type Subjects = { presenter: boolean; product: boolean; place: boolean };
type ImgState = { url?: string; loading?: boolean; err?: string; needCredits?: boolean };

function newId() {
  try { return crypto.randomUUID(); } catch { return 'sid-' + Date.now() + '-' + Math.floor(Math.random() * 1e6); }
}
function recommend(dur: number) { return Math.min(8, Math.max(3, Math.round(dur / 4))); }

export default function Storyboard({
  shots, setShots, ratio, mood, duration, subjects, placeDesc, briefFor,
}: {
  shots: Shot[]; setShots: (s: Shot[]) => void;
  ratio: string; mood: string; duration: number; subjects: Subjects; placeDesc: string;
  briefFor: () => { name?: string; point?: string; brand_description?: string };
}) {
  const { lang } = useLang();
  const T = (th: string, en: string) => (lang === 'th' ? th : en);
  const rec = recommend(duration);
  const [count, setCount] = useState(rec);
  const [imgs, setImgs] = useState<Record<string, ImgState>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; Object.values(timers.current).forEach(clearTimeout); }, []);

  // ปรับค่าแนะนำเมื่อความยาวเปลี่ยน (ถ้ายังไม่วางช็อต)
  useEffect(() => { if (!shots.length) setCount(recommend(duration)); }, [duration, shots.length]);

  function baseNames(): string[] {
    const b: string[] = [];
    if (subjects.presenter) b.push(T('พรีเซนเตอร์เปิดเรื่อง', 'Presenter intro'));
    if (subjects.place) b.push(T('ภาพสถานที่ / บรรยากาศ', 'Establishing / scene'));
    if (subjects.product) b.push(T('โชว์สินค้าใกล้ๆ', 'Product close-up'));
    if (subjects.presenter && subjects.product) b.push(T('พรีเซนเตอร์ถือ / ใช้สินค้า', 'Presenter uses product'));
    if (!b.length) b.push(T('ภาพเปิด', 'Opening shot'));
    return b;
  }
  function plan() {
    const base = baseNames();
    const target = Math.max(2, count);
    const body: Shot[] = [];
    for (let i = 0; i < target - 1; i++) {
      const n = base[i % base.length] + (i >= base.length ? ` (${Math.floor(i / base.length) + 1})` : '');
      body.push({ id: newId(), name: n, desc: '' });
    }
    body.push({ id: newId(), name: T('การ์ด CTA ปิดท้าย', 'Closing CTA card'), desc: '' });
    setImgs({});
    setShots(body);
  }
  function patchShot(id: string, patch: Partial<Shot>) {
    setShots(shots.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function setImg(id: string, patch: ImgState) { setImgs((p) => ({ ...p, [id]: { ...p[id], ...patch } })); }

  function move(i: number, d: number) {
    const j = i + d; if (j < 0 || j >= shots.length) return;
    const s = [...shots]; [s[i], s[j]] = [s[j], s[i]]; setShots(s);
  }
  function del(id: string) { setShots(shots.filter((s) => s.id !== id)); }
  function addShot() { setShots([...shots, { id: newId(), name: T('ช็อตใหม่', 'New shot'), desc: '' }]); }

  async function genShot(shot: Shot) {
    setImg(shot.id, { loading: true, err: undefined, needCredits: false, url: undefined });
    const input: ShotInput = {
      shotName: shot.name, shotDesc: shot.desc, ratio, mood,
      brief: briefFor(), placeDesc: subjects.place ? placeDesc : undefined,
    };
    const r = await startShotImage(input);
    if (!alive.current) return;
    if (r.error || !r.task) { setImg(shot.id, { loading: false, err: r.error || T('เริ่มไม่สำเร็จ', 'Could not start'), needCredits: r.needCredits }); return; }
    poll(shot.id, r.task);
  }
  function poll(id: string, task: any) {
    timers.current[id] = setTimeout(async () => {
      const r = await pollShotImage(task);
      if (!alive.current) return;
      if (r.state === 'pending') { poll(id, task); return; }
      if (r.state === 'failed') { setImg(id, { loading: false, err: r.error || T('สร้างไม่สำเร็จ', 'Failed'), needCredits: r.needCredits }); return; }
      setImg(id, { loading: false, url: r.url, err: undefined });
      patchShot(id, { imgPath: r.path });
    }, 2500);
  }
  function genAll() {
    shots.forEach((s) => { if (!imgs[s.id]?.url && !imgs[s.id]?.loading) genShot(s); });
  }

  const anyLoading = shots.some((s) => imgs[s.id]?.loading);
  const pendingCount = shots.filter((s) => !imgs[s.id]?.url).length;

  return (
    <div style={{ marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 19, fontWeight: 700 }}>🎬 {T('ลำดับช็อต (สตอรีบอร์ด)', 'Shot list (storyboard)')} <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>{T('· ดูภาพให้ชัวร์ก่อนเจนวิดีโอ', '· preview before video')}</span></div>
      </div>

      {/* เลือกจำนวนช็อต + คำแนะนำ */}
      <div className="row" style={{ gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>{T('จำนวนช็อต', 'Number of shots')}</span>
        <div className="stepper">
          <button type="button" onClick={() => setCount(Math.max(2, count - 1))}>−</button>
          <span className="sval">{count}</span>
          <button type="button" onClick={() => setCount(Math.min(12, count + 1))}>+</button>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>{T(`แนะนำ ${rec} ช็อต สำหรับ ${duration} วิ (~4 วิ/ช็อต)`, `Recommended ${rec} shots for ${duration}s (~4s each)`)}</span>
        <button type="button" className="btn-ghost" style={{ padding: '8px 16px', borderRadius: 9, cursor: 'pointer', font: 'inherit', fontWeight: 600 }} onClick={plan}>
          {shots.length ? T('วางลำดับใหม่', 'Re-plan') : T('✦ วางลำดับช็อตให้', '✦ Plan shots')}
        </button>
      </div>

      {shots.length > 0 && (
        <>
          <div className="row" style={{ gap: 12, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="btn" style={{ padding: '10px 18px' }} onClick={genAll} disabled={anyLoading || pendingCount === 0}>
              {anyLoading ? T('กำลังเจนภาพ…', 'Generating…') : T(`✦ เจนภาพตัวอย่าง ${pendingCount} ช็อต`, `✦ Preview ${pendingCount} shots`)}
            </button>
            <span className="muted" style={{ fontSize: 13 }}>{T(`ภาพตัวอย่าง ${SHOT_IMG_COST} เครดิต/ช็อต · รวม ~${pendingCount * SHOT_IMG_COST} เครดิต`, `${SHOT_IMG_COST} cr/shot · ~${pendingCount * SHOT_IMG_COST} cr total`)}</span>
          </div>

          {shots.map((s, i) => {
            const im = imgs[s.id] || {};
            return (
              <div className="shot" key={s.id} style={{ alignItems: 'flex-start' }}>
                <div className="shot-num">{i + 1}</div>
                <div className="shot-thumb" style={{ width: 92, height: 92, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {im.url ? <img src={im.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : im.loading ? <span className="spinner" style={{ width: 22, height: 22 }} />
                    : <span className="muted" style={{ fontSize: 22 }}>🎞️</span>}
                </div>
                <div className="shot-body">
                  <input type="text" value={s.name} onChange={(e) => patchShot(s.id, { name: e.target.value })} />
                  <input type="text" value={s.desc} placeholder={T('อยากให้ช็อตนี้เป็นอะไร', 'What should this shot show?')} style={{ marginTop: 4 }} onChange={(e) => patchShot(s.id, { desc: e.target.value })} />
                  <div className="shot-acts" style={{ alignItems: 'center' }}>
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === shots.length - 1}>↓</button>
                    <button type="button" disabled={shots.length <= 2} onClick={() => del(s.id)}>{T('ลบ', 'Delete')}</button>
                    <button type="button" onClick={() => genShot(s)} disabled={im.loading} style={{ fontWeight: 600 }}>
                      {im.loading ? T('กำลังเจน…', 'Generating…') : im.url ? T(`↻ รีเจน (${SHOT_IMG_COST})`, `↻ Regen (${SHOT_IMG_COST})`) : T(`✦ เจนภาพ (${SHOT_IMG_COST})`, `✦ Preview (${SHOT_IMG_COST})`)}
                    </button>
                    <span className="muted" style={{ fontSize: 12 }}>{SHOT_IMG_COST} {T('เครดิต', 'cr')}</span>
                  </div>
                  {im.err && <p className="err" style={{ fontSize: 13, marginTop: 4 }}>{im.err}{im.needCredits ? ' — ' + T('เติมเครดิต / เติม fal.ai ก่อน', 'top up credits / fund fal.ai') : ''}</p>}
                </div>
              </div>
            );
          })}
          <button type="button" className="btn-ghost" style={{ padding: '6px 14px', borderRadius: 8, cursor: 'pointer', font: 'inherit', fontSize: 13, marginTop: 8 }} onClick={addShot}>+ {T('เพิ่มช็อต', 'Add shot')}</button>
        </>
      )}
    </div>
  );
}
