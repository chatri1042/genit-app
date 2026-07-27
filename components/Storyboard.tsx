'use client';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { startShotImage, pollShotImage, type ShotInput } from '@/app/shots';
import { useLang } from './LanguageProvider';

export const SHOT_IMG_COST = 3;
export type Shot = { id: string; name: string; desc: string; imgPath?: string };

type Subjects = { presenter: boolean; product: boolean; place: boolean };
type ImgState = { url?: string; loading?: boolean; err?: string; needCredits?: boolean; usedRef?: string };

function newId() {
  try { return crypto.randomUUID(); } catch { return 'sid-' + Date.now() + '-' + Math.floor(Math.random() * 1e6); }
}
function recommend(dur: number) { return Math.min(8, Math.max(3, Math.round(dur / 4))); }

export default function Storyboard({
  shots, setShots, ratio, mood, duration, subjects, briefFor, productPath, presenterPath, avatar,
}: {
  shots: Shot[]; setShots: Dispatch<SetStateAction<Shot[]>>;
  ratio: string; mood: string; duration: number; subjects: Subjects;
  briefFor: () => { point?: string; brand_description?: string };
  productPath?: string | null; presenterPath?: string | null;
  avatar?: { gender?: string; age?: string; ethnicity?: string } | null;
}) {
  const { lang } = useLang();
  const T = (th: string, en: string) => (lang === 'th' ? th : en);
  const rec = recommend(duration);
  const [count, setCount] = useState(rec);
  const [imgs, setImgs] = useState<Record<string, ImgState>>({});
  const [lightbox, setLightbox] = useState<string | null>(null); // รูปที่กดดูใหญ่
  const [avatarRef, setAvatarRef] = useState<string | null>(null); // path หน้าพรีเซนเตอร์ที่ล็อกไว้ (bucket outputs)
  const avatarRefPromise = useRef<Promise<string | null> | null>(null); // กันเจนหน้าซ้ำตอนหลายช็อตยิงพร้อมกัน
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
  // ใช้ functional update เสมอ — กันช็อตที่เจนพร้อมกันเขียนทับ imgPath ของกันเอง (stale closure)
  function patchShot(id: string, patch: Partial<Shot>) {
    setShots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function setImg(id: string, patch: ImgState) { setImgs((p) => ({ ...p, [id]: { ...p[id], ...patch } })); }

  function move(i: number, d: number) {
    setShots((prev) => {
      const j = i + d; if (j < 0 || j >= prev.length) return prev;
      const s = [...prev]; [s[i], s[j]] = [s[j], s[i]]; return s;
    });
  }
  function del(id: string) { setShots((prev) => prev.filter((s) => s.id !== id)); }
  function addShot() { setShots((prev) => [...prev, { id: newId(), name: T('ช็อตใหม่', 'New shot'), desc: '' }]); }

  // ช็อตนี้มี "คน" ไหม (ดูทั้งชื่อและคำบรรยาย)
  function isPersonShot(shot: Shot) {
    return /พรีเซนเตอร์|presenter|คน|ผู้หญิง|ผู้ชาย|selfie|ถือสินค้า|ใช้สินค้า/i.test(`${shot.name} ${shot.desc}`);
  }
  // poll แบบรอผลจนเสร็จ แล้วคืน path (ใช้ตอนล็อกหน้าพรีเซนเตอร์)
  function pollToPath(task: any): Promise<string | null> {
    return new Promise((resolve) => {
      const tick = async () => {
        try {
          const r = await pollShotImage(task);
          if (!alive.current) return resolve(null);
          if (r.state === 'pending') { setTimeout(tick, 2500); return; }
          resolve(r.state === 'done' ? (r.path ?? null) : null);
        } catch { resolve(null); }
      };
      setTimeout(tick, 2500);
    });
  }
  // ล็อกหน้าพรีเซนเตอร์ AI ไว้ 1 รูป (ครั้งเดียว) แล้วให้ทุกช็อตที่มีคนอ้างอิงหน้านี้ → คนเดียวกันทุกช็อต
  function getAvatarRef(): Promise<string | null> {
    if (presenterPath) return Promise.resolve(null); // อัพรูปคนเองแล้ว → ช็อตอ้างอิงรูปนั้นตรงๆ
    if (!avatar) return Promise.resolve(null);
    if (avatarRef) return Promise.resolve(avatarRef);
    if (avatarRefPromise.current) return avatarRefPromise.current;
    avatarRefPromise.current = (async () => {
      const input: ShotInput = {
        shotName: 'presenter portrait',
        shotDesc: 'clean well-lit upper-body portrait, neutral friendly pose, looking straight at camera, simple soft background',
        ratio, mood, brief: briefFor(), avatar,
      };
      const r = await startShotImage(input);
      if (!alive.current || r.error || !r.task) { avatarRefPromise.current = null; return null; }
      const path = await pollToPath(r.task);
      if (path) setAvatarRef(path); else avatarRefPromise.current = null;
      return path;
    })();
    return avatarRefPromise.current;
  }

  async function genShot(shot: Shot) {
    setImg(shot.id, { loading: true, err: undefined, needCredits: false, url: undefined });
    // ช็อตที่มีคน + ใช้ Avatar AI → ล็อก/ดึงหน้าพรีเซนเตอร์ก่อน เพื่อให้เป็นคนเดียวกัน
    let presenterRefPath: string | null = null;
    if (isPersonShot(shot) && !presenterPath && avatar) {
      presenterRefPath = await getAvatarRef();
      if (!alive.current) return;
    }
    const input: ShotInput = {
      shotName: shot.name, shotDesc: shot.desc, ratio, mood,
      brief: briefFor(),
      productPath: productPath ?? null,
      presenterPath: presenterPath ?? null,
      presenterRefPath,
      avatar: avatar ?? null,
    };
    const r = await startShotImage(input);
    if (!alive.current) return;
    if (r.error || !r.task) { setImg(shot.id, { loading: false, err: r.error || T('เริ่มไม่สำเร็จ', 'Could not start'), needCredits: r.needCredits }); return; }
    setImg(shot.id, { usedRef: r.usedRef });
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
          {!!avatar && !presenterPath && !avatarRef && shots.some(isPersonShot) && (
            <p className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
              {T(`* ครั้งแรกจะล็อกหน้าพรีเซนเตอร์ AI ไว้ 1 รูป (+${SHOT_IMG_COST} เครดิต) เพื่อให้ทุกช็อตที่มีคนเป็น "คนเดียวกัน"`,
                 `* First run locks one AI presenter face (+${SHOT_IMG_COST} cr) so every person shot is the same character`)}
            </p>
          )}

          {shots.map((s, i) => {
            const im = imgs[s.id] || {};
            return (
              <div className="shot" key={s.id} style={{ alignItems: 'flex-start' }}>
                <div className="shot-num">{i + 1}</div>
                <div className="shot-thumb" style={{ width: 92, height: 92, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: im.url ? 'zoom-in' : 'default' }} onClick={() => im.url && setLightbox(im.url)} title={im.url ? T('กดดูรูปใหญ่', 'Click to enlarge') : ''}>
                  {im.url ? <img src={im.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : im.loading ? <span className="spinner" style={{ width: 22, height: 22 }} />
                    : <span className="muted" style={{ fontSize: 22 }}>🎞️</span>}
                  {im.url && <span style={{ position: 'absolute', bottom: 3, right: 3, background: 'rgba(0,0,0,.55)', color: '#fff', borderRadius: 6, fontSize: 11, padding: '1px 5px' }}>⤢</span>}
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
                  {im.usedRef && (im.url || im.loading) && (
                    <p style={{ fontSize: 12, marginTop: 4, color: im.usedRef.includes('ไม่มีรูปอ้างอิง') ? '#B4451A' : 'var(--muted)' }}>
                      {T('อ้างอิงจาก: ', 'Reference used: ')}{im.usedRef}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          <button type="button" className="btn-ghost" style={{ padding: '6px 14px', borderRadius: 8, cursor: 'pointer', font: 'inherit', fontSize: 13, marginTop: 8 }} onClick={addShot}>+ {T('เพิ่มช็อต', 'Add shot')}</button>
        </>
      )}

      {/* ดูรูปใหญ่ (lightbox) */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.82)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out' }}>
          <img src={lightbox} alt="" style={{ maxWidth: '92vw', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 10px 50px rgba(0,0,0,.5)' }} />
          <button type="button" onClick={() => setLightbox(null)} style={{ position: 'fixed', top: 18, right: 22, background: '#fff', border: 'none', borderRadius: '50%', width: 40, height: 40, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
      )}
    </div>
  );
}
