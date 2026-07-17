'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createJobDraft } from '@/app/actions';

const FORMATS = [
  { id: 'ugc', icon: '🎤', th: 'พรีเซนเตอร์พูด', desc: 'มีคนถือ/พูดถึงสินค้า (UGC)' },
  { id: 'hand', icon: '🤳', th: 'มือถือสินค้า', desc: 'โชว์สินค้าในมือ ไม่เห็นหน้า' },
  { id: 'food', icon: '🍜', th: 'อาหาร', desc: 'เมนู/ร้านอาหาร น่ากิน' },
  { id: 'product', icon: '📦', th: 'โชว์สินค้า', desc: 'สินค้าเดี่ยว หลายมุม' },
  { id: 'image', icon: '🖼️', th: 'สร้างรูปอย่างเดียว', desc: 'ภาพนิ่งโปรโมท ไม่ทำวิดีโอ' },
];
const RATIOS = [
  { id: '9:16', th: 'แนวตั้ง 9:16', w: 250 },
  { id: '1:1', th: 'จัตุรัส 1:1', w: 320 },
  { id: '16:9', th: 'แนวนอน 16:9', w: 360 },
];
const CONCEPTS = [
  { id: 'sale', th: 'ลดราคา' }, { id: 'opening', th: 'โปรเปิดร้าน' },
  { id: 'review', th: 'รีวิวสินค้า' }, { id: 'intro', th: 'แนะนำสินค้า' },
  { id: 'ba', th: 'เปรียบเทียบก่อน-หลัง' }, { id: 'launch', th: 'เปิดตัวสินค้าใหม่' },
  { id: 'clearance', th: 'Clearance Sale' }, { id: 'flash', th: 'Flash Sale' },
  { id: 'other', th: '+ อื่นๆ (พิมพ์เอง)' },
];

type Brand = { id: string; name: string };
type Asset = { path: string; url: string };

export default function GenerateForm({ brands }: { brands: Brand[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [format, setFormat] = useState('ugc');
  const [ratio, setRatio] = useState('9:16');
  const [duration, setDuration] = useState(15);
  const [count, setCount] = useState(1);
  const [concept, setConcept] = useState('sale');
  const [conceptText, setConceptText] = useState('');
  const [scriptLang, setScriptLang] = useState<'th' | 'en'>('th');
  const [voiceMode, setVoiceMode] = useState('ai');
  const [voicePath, setVoicePath] = useState('');
  const [voiceLabel, setVoiceLabel] = useState('');
  const [brandId, setBrandId] = useState('');
  const [useBrandImgs, setUseBrandImgs] = useState(true);
  const [brandAssets, setBrandAssets] = useState<Asset[]>([]);
  const [pickedAssets, setPickedAssets] = useState<string[]>([]);
  const [brandDesc, setBrandDesc] = useState('');
  const [subtitles, setSubtitles] = useState(true);
  const [logo, setLogo] = useState(true);
  const [cta, setCta] = useState(false);
  const [consent, setConsent] = useState(false);
  const [images, setImages] = useState<{ path: string; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const isImage = format === 'image';
  const rInfo = RATIOS.find((r) => r.id === ratio)!;

  // ---- โหลดรูปที่บันทึกไว้ในแบรนด์ ----
  useEffect(() => {
    if (!brandId) { setBrandAssets([]); setPickedAssets([]); setBrandDesc(''); return; }
    (async () => {
      const { data: bd } = await supabase.from('brands').select('description').eq('id', brandId).single();
      setBrandDesc(bd?.description ?? '');
      const { data } = await supabase.from('assets').select('url').eq('brand_id', brandId).eq('kind', 'product_image').order('created_at', { ascending: false });
      const paths = (data ?? []).map((a) => a.url);
      if (!paths.length) { setBrandAssets([]); return; }
      const { data: signed } = await supabase.storage.from('uploads').createSignedUrls(paths, 3600);
      setBrandAssets(paths.map((p, i) => ({ path: p, url: signed?.[i]?.signedUrl ?? '' })));
    })();
  }, [brandId, supabase]);

  const credits = useMemo(() => {
    if (isImage) return Math.max(1, count) * 3;
    const rate = format === 'ugc' ? 0.5 : 0.75;
    return Math.max(3, Math.ceil(duration * rate));
  }, [format, duration, count, isImage]);

  const firstPreview = images[0]?.preview
    || (useBrandImgs && pickedAssets.length ? brandAssets.find((a) => a.path === pickedAssets[0])?.url : '')
    || '';

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true); setErr('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErr('ต้องล็อกอินก่อน'); setUploading(false); return; }
    for (const file of files) {
      const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from('uploads').upload(path, file);
      if (error) { setErr('อัพรูปไม่สำเร็จ: ' + error.message); continue; }
      setImages((prev) => [...prev, { path, preview: URL.createObjectURL(file) }]);
    }
    setUploading(false); e.target.value = '';
  }

  async function onVoiceFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); setErr('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }
    const path = `${user.id}/voice-${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from('uploads').upload(path, file);
    if (error) setErr('อัพเสียงไม่สำเร็จ: ' + error.message);
    else { setVoicePath(path); setVoiceLabel('อัพโหลด: ' + file.name); }
    setUploading(false); e.target.value = '';
  }

  // ---- อัดเสียง ----
  const [recOn, setRecOn] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function toggleRec() {
    if (recOn) {
      recRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (ev) => chunksRef.current.push(ev.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecOn(false);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const path = `${user.id}/voice-${crypto.randomUUID()}.webm`;
        setUploading(true);
        const { error } = await supabase.storage.from('uploads').upload(path, blob);
        setUploading(false);
        if (error) setErr('บันทึกเสียงไม่สำเร็จ: ' + error.message);
        else { setVoicePath(path); setVoiceLabel(`อัดเสียงแล้ว ${recSec} วิ`); }
      };
      recRef.current = mr; mr.start();
      setRecOn(true); setRecSec(0);
      timerRef.current = setInterval(() => setRecSec((s) => s + 1), 1000);
    } catch {
      setErr('เข้าถึงไมโครโฟนไม่ได้ — อนุญาตไมค์ในเบราว์เซอร์ก่อน');
    }
  }

  const allImages = [...images.map((i) => i.path), ...(useBrandImgs ? pickedAssets : [])];

  return (
    <form action={createJobDraft} className="gen-wrap">
      <input type="hidden" name="format" value={format} />
      <input type="hidden" name="ratio" value={ratio} />
      <input type="hidden" name="concept" value={concept === 'other' ? conceptText : concept} />
      <input type="hidden" name="script_lang" value={scriptLang} />
      <input type="hidden" name="voice_mode" value={voiceMode} />
      <input type="hidden" name="voice_path" value={voicePath} />
      <input type="hidden" name="credits_cost" value={credits} />
      <input type="hidden" name="images" value={JSON.stringify(allImages)} />
      <input type="hidden" name="count" value={count} />
      <input type="hidden" name="duration" value={duration} />

      {/* ================= LEFT: form ================= */}
      <div className="card" style={{ minWidth: 0 }}>
        <span className="muted" style={{ fontSize: 14 }}>รูปแบบ</span>
        <div className="fmt-grid" style={{ marginTop: 8 }}>
          {FORMATS.map((f) => (
            <button type="button" key={f.id} className={'fmt' + (format === f.id ? ' active' : '')} onClick={() => setFormat(f.id)}>
              <div className="fi">{f.icon}</div><div className="ft">{f.th}</div><div className="fd">{f.desc}</div>
            </button>
          ))}
        </div>

        <label className="field"><span>สัดส่วน</span></label>
        <div className="chips">
          {RATIOS.map((r) => (
            <button type="button" key={r.id} className={'chip' + (ratio === r.id ? ' active' : '')} onClick={() => setRatio(r.id)}>{r.th}</button>
          ))}
        </div>

        {/* brand */}
        {brands.length > 0 && (
          <>
            <label className="field"><span>สร้างให้แบรนด์ไหน</span>
              <select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                <option value="">— ไม่ระบุ —</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <input type="hidden" name="brand_id" value={brandId} />
            {brandId && brandDesc && (
              <div style={{ marginTop: 8, background: 'var(--yellow-soft)', border: '1px solid var(--yellow-deep)', borderRadius: 10, padding: '10px 14px', fontSize: 13.5 }}>
                <b>รายละเอียดแบรนด์ (จะใส่ในบทให้อัตโนมัติ):</b> {brandDesc}
              </div>
            )}
            {brandId && brandAssets.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <label className="row" style={{ cursor: 'pointer', gap: 8 }}>
                  <input type="checkbox" checked={useBrandImgs} onChange={(e) => setUseBrandImgs(e.target.checked)} />
                  <span style={{ fontSize: 14 }}>ใช้รูปที่บันทึกไว้ในแบรนด์นี้</span>
                </label>
                {useBrandImgs && (
                  <div className="asset-pick">
                    {brandAssets.map((a) => (
                      <label key={a.path}>
                        <input type="checkbox" checked={pickedAssets.includes(a.path)}
                          onChange={(e) => setPickedAssets((prev) => e.target.checked ? [...prev, a.path] : prev.filter((p) => p !== a.path))} />
                        <img src={a.url} alt="" />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* product images */}
        <label className="field"><span>อัพรูปสินค้า{isImage ? '' : ' / พรีเซนเตอร์'} เพิ่ม (หลายรูปได้)</span></label>
        <div className="uploads">
          {images.map((im, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img className="up-thumb" src={im.preview} alt="" />
              <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))}
                style={{ position: 'absolute', top: -6, right: -6, background: '#1A1A17', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer' }}>×</button>
            </div>
          ))}
          <label className="up-add">{uploading ? '…' : '+'}<input type="file" accept="image/*" multiple hidden onChange={onPick} /></label>
        </div>

        {!isImage ? (
          <>
            <label className="field"><span>ความยาววิดีโอ</span></label>
            <div className="rng">
              <input type="range" min={5} max={60} step={5} value={duration}
                style={{ ['--fill' as any]: ((duration - 5) / 55 * 100) + '%' }}
                onChange={(e) => setDuration(Number(e.target.value))} />
              <span className="rv">{duration} วิ</span>
            </div>

            <label className="field"><span>ภาษาบทพูด</span></label>
            <div className="chips">
              <button type="button" className={'chip' + (scriptLang === 'th' ? ' active' : '')} onClick={() => setScriptLang('th')}>ไทย</button>
              <button type="button" className={'chip' + (scriptLang === 'en' ? ' active' : '')} onClick={() => setScriptLang('en')}>อังกฤษ</button>
            </div>

            <label className="field"><span>เสียงพากย์</span></label>
            <div className="chips">
              {[['ai', 'เสียง AI'], ['record', 'อัดเสียงเอง'], ['upload', 'อัพเสียงเอง']].map(([v, t]) => (
                <button type="button" key={v} className={'chip' + (voiceMode === v ? ' active' : '')} onClick={() => setVoiceMode(v)}>{t}</button>
              ))}
            </div>
            {voiceMode === 'record' && (
              <div>
                <button type="button" className={'rec-btn' + (recOn ? ' on' : '')} onClick={toggleRec}>
                  <span className="rec-dot" />{recOn ? `กำลังอัด… ${recSec} วิ (แตะเพื่อหยุด)` : 'แตะเพื่อเริ่มอัด'}
                </button>
                {voiceLabel && <p className="ok">{voiceLabel}</p>}
              </div>
            )}
            {voiceMode === 'upload' && (
              <div>
                <label className="btn-ghost" style={{ display: 'inline-block', padding: '10px 18px', borderRadius: 10, cursor: 'pointer', marginTop: 8 }}>
                  เลือกไฟล์เสียง (mp3/wav)
                  <input type="file" accept="audio/*" hidden onChange={onVoiceFile} />
                </label>
                {voiceLabel && <p className="ok">{voiceLabel}</p>}
              </div>
            )}
          </>
        ) : (
          <label className="field"><span>จำนวนรูป</span>
            <input type="number" value={count} min={1} max={10} onChange={(e) => setCount(Number(e.target.value))} />
          </label>
        )}

        <label className="field"><span>คอนเซ็ปต์</span></label>
        <div className="chips">
          {CONCEPTS.map((c) => (
            <button type="button" key={c.id} className={'chip' + (concept === c.id ? ' active' : '')} onClick={() => setConcept(c.id)}>{c.th}</button>
          ))}
        </div>
        {concept === 'other' && (
          <input type="text" value={conceptText} onChange={(e) => setConceptText(e.target.value)} placeholder="พิมพ์คอนเซ็ปต์ที่อยากได้เอง" style={{ marginTop: 8 }} />
        )}

        {/* brief */}
        <label className="field"><span>ชื่อสินค้า</span><input type="text" name="bfName" placeholder="เช่น น้ำพริกกากหมู" /></label>
        <div className="grid grid-2">
          <label className="field"><span>ราคา</span><input type="text" name="bfPrice" placeholder="เช่น 89 บาท" /></label>
          <label className="field"><span>โปรถึงวันไหน</span><input type="text" name="bfPromo" placeholder="เช่น ถึงสิ้นเดือน" /></label>
        </div>
        <label className="field"><span>จุดขาย</span><textarea name="bfPoint" rows={2} placeholder="เช่น หอม กรอบ ทำสด ส่งไว" /></label>

        {!isImage && (
          <>
            <label className="field"><span>ใส่อะไรในวิดีโอ</span></label>
            <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '2px 16px' }}>
              <Toggle label="ซับไตเติล" name="subtitles" checked={subtitles} onChange={setSubtitles} />
              <Toggle label="โลโก้แบรนด์" name="logo" checked={logo} onChange={setLogo} />
              <Toggle label="ปุ่ม CTA (เช่น ทักแชท)" name="cta" checked={cta} onChange={setCta} />
            </div>
          </>
        )}

        <label className="consent">
          <input type="checkbox" name="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span className="ct"><b>ยินยอมให้ GenIt นำผลงานไปโปรโมท → รับโบนัส +3 เครดิตฟรีทันที!</b> (และมีสิทธิ์รับเพิ่มเมื่องานถูกเลือกลงแกลเลอรี · งานฟรีมีลายน้ำ เก็บ 15 วัน)</span>
        </label>

        <div className="creditbar">
          <div>
            <div className="muted" style={{ fontSize: 13 }}>ใช้เครดิตประมาณ</div>
            <div className="cc">{credits} เครดิต</div>
          </div>
          <button className="btn btn-lg" disabled={uploading}>บันทึกงาน →</button>
        </div>
        {err && <p className="err">{err}</p>}
        <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>* บันทึกเป็นงานจริงในบัญชีคุณ — การเจนด้วย AI จะต่อในเฟสถัดไป</p>
      </div>

      {/* ================= RIGHT: preview ================= */}
      <div className="preview-panel">
        <div className="card" style={{ padding: 16 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 10, textAlign: 'center' }}>ตัวอย่าง ({ratio})</div>
          <div className="pv-frame" style={{ width: rInfo.w, maxWidth: '100%', aspectRatio: ratio.replace(':', ' / ') }}>
            {firstPreview
              ? <img src={firstPreview} alt="" />
              : <div className="pv-empty">📹<br />ผลงานที่สร้างเสร็จ<br />จะมาแสดงที่นี่</div>}
          </div>
          <div className="pv-cap">{isImage ? `${count} รูป` : `${duration} วิ`} · ~{credits} เครดิต</div>
        </div>
      </div>

      {/* แถบสร้างลอยล่างจอ (เห็นตลอด) */}
      <div className="sticky-gen">
        <div className="sg-in">
          <div className="muted" style={{ fontSize: 14 }}>ใช้ <b style={{ color: 'var(--ink)', fontSize: 17 }}>{credits}</b> เครดิต</div>
          <button className="btn btn-lg" disabled={uploading}>✦ บันทึกงาน</button>
        </div>
      </div>
    </form>
  );
}

function Toggle({ label, name, checked, onChange }: { label: string; name: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="tgl">
      <span className="tl">{label}</span>
      <label className="switch">
        <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="track" />
      </label>
    </div>
  );
}
