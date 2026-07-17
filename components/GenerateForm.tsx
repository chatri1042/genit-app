'use client';
import { useMemo, useState } from 'react';
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
  { id: '9:16', th: 'แนวตั้ง 9:16' },
  { id: '1:1', th: 'จัตุรัส 1:1' },
  { id: '16:9', th: 'แนวนอน 16:9' },
];
const CONCEPTS = [
  { id: 'flash_sale', th: 'ลดพิเศษ' },
  { id: 'review', th: 'รีวิว / บอกต่อ' },
  { id: 'new_arrival', th: 'สินค้าใหม่' },
  { id: 'how_to', th: 'วิธีใช้ / ตอบข้อสงสัย' },
];

export default function GenerateForm({ brands }: { brands: { id: string; name: string }[] }) {
  const [format, setFormat] = useState('ugc');
  const [ratio, setRatio] = useState('9:16');
  const [duration, setDuration] = useState(15);
  const [count, setCount] = useState(1);
  const [concept, setConcept] = useState('flash_sale');
  const [scriptLang, setScriptLang] = useState<'th' | 'en'>('th');
  const [voiceMode, setVoiceMode] = useState('ai');
  const [brandId, setBrandId] = useState('');
  const [subtitles, setSubtitles] = useState(true);
  const [logo, setLogo] = useState(true);
  const [cta, setCta] = useState(false);
  const [consent, setConsent] = useState(false);
  const [images, setImages] = useState<{ path: string; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const isImage = format === 'image';

  const credits = useMemo(() => {
    if (isImage) return Math.max(1, count);
    const v = format === 'ugc' ? duration * 0.6 : duration * 0.4;
    return Math.ceil(v + 1); // +1 เสียง
  }, [format, duration, count, isImage]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true); setErr('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErr('ต้องล็อกอินก่อน'); setUploading(false); return; }
    for (const file of files) {
      const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from('uploads').upload(path, file);
      if (error) { setErr('อัพรูปไม่สำเร็จ: ' + error.message); continue; }
      setImages((prev) => [...prev, { path, preview: URL.createObjectURL(file) }]);
    }
    setUploading(false);
    e.target.value = '';
  }

  return (
    <form action={createJobDraft} className="card" style={{ maxWidth: 720, marginTop: 18 }}>
      {/* hidden values */}
      <input type="hidden" name="format" value={format} />
      <input type="hidden" name="ratio" value={ratio} />
      <input type="hidden" name="concept" value={concept} />
      <input type="hidden" name="script_lang" value={scriptLang} />
      <input type="hidden" name="voice_mode" value={voiceMode} />
      <input type="hidden" name="credits_cost" value={credits} />
      <input type="hidden" name="images" value={JSON.stringify(images.map((i) => i.path))} />

      <span className="muted" style={{ fontSize: 14 }}>รูปแบบ</span>
      <div className="fmt-grid" style={{ marginTop: 8 }}>
        {FORMATS.map((f) => (
          <button type="button" key={f.id} className={'fmt' + (format === f.id ? ' active' : '')} onClick={() => setFormat(f.id)}>
            <div className="fi">{f.icon}</div>
            <div className="ft">{f.th}</div>
            <div className="fd">{f.desc}</div>
          </button>
        ))}
      </div>

      <label className="field"><span>สัดส่วน</span></label>
      <div className="chips">
        {RATIOS.map((r) => (
          <button type="button" key={r.id} className={'chip' + (ratio === r.id ? ' active' : '')} onClick={() => setRatio(r.id)}>{r.th}</button>
        ))}
      </div>

      {/* product images */}
      <label className="field"><span>รูปสินค้า{isImage ? '' : ' / พรีเซนเตอร์'} (อัพได้หลายรูป)</span></label>
      <div className="uploads">
        {images.map((im, i) => (
          <div key={i} style={{ position: 'relative' }}>
            <img className="up-thumb" src={im.preview} alt="" />
            <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))}
              style={{ position: 'absolute', top: -6, right: -6, background: '#1A1A17', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer' }}>×</button>
          </div>
        ))}
        <label className="up-add">
          {uploading ? '…' : '+'}
          <input type="file" accept="image/*" multiple hidden onChange={onPick} />
        </label>
      </div>

      {!isImage && (
        <>
          <div className="grid grid-2" style={{ marginTop: 4 }}>
            <label className="field"><span>ความยาว (วินาที)</span>
              <input type="number" name="duration" value={duration} min={5} max={60} onChange={(e) => setDuration(Number(e.target.value))} />
            </label>
            <label className="field"><span>ภาษาบทพูด</span>
              <div className="chips" style={{ marginTop: 2 }}>
                <button type="button" className={'chip' + (scriptLang === 'th' ? ' active' : '')} onClick={() => setScriptLang('th')}>ไทย</button>
                <button type="button" className={'chip' + (scriptLang === 'en' ? ' active' : '')} onClick={() => setScriptLang('en')}>อังกฤษ</button>
              </div>
            </label>
          </div>
          <label className="field"><span>เสียง</span>
            <div className="chips" style={{ marginTop: 2 }}>
              {[['ai', 'เสียง AI'], ['upload', 'อัพเสียงเอง']].map(([v, t]) => (
                <button type="button" key={v} className={'chip' + (voiceMode === v ? ' active' : '')} onClick={() => setVoiceMode(v)}>{t}</button>
              ))}
            </div>
          </label>
        </>
      )}

      {isImage && (
        <label className="field"><span>จำนวนรูป</span>
          <input type="number" name="count" value={count} min={1} max={10} onChange={(e) => setCount(Number(e.target.value))} />
        </label>
      )}
      {!isImage && <input type="hidden" name="count" value={count} />}

      <label className="field"><span>คอนเซ็ปต์</span></label>
      <div className="chips">
        {CONCEPTS.map((c) => (
          <button type="button" key={c.id} className={'chip' + (concept === c.id ? ' active' : '')} onClick={() => setConcept(c.id)}>{c.th}</button>
        ))}
      </div>

      {/* brief */}
      <label className="field"><span>ชื่อสินค้า</span><input type="text" name="bfName" placeholder="เช่น น้ำพริกกากหมู" /></label>
      <div className="grid grid-2">
        <label className="field"><span>ราคา</span><input type="text" name="bfPrice" placeholder="เช่น 89 บาท" /></label>
        <label className="field"><span>โปรถึงวันไหน</span><input type="text" name="bfPromo" placeholder="เช่น ถึงสิ้นเดือน" /></label>
      </div>
      <label className="field"><span>จุดขาย</span><textarea name="bfPoint" rows={2} placeholder="เช่น หอม กรอบ ทำสด ส่งไว" /></label>

      {brands.length > 0 && (
        <label className="field"><span>แบรนด์</span>
          <select name="brand_id" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
            <option value="">— ไม่ระบุ —</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
      )}

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
        <span className="ct">ยินยอมให้ GenIt นำผลงานไปใช้โปรโมท (งานทดลองฟรีมีลายน้ำ เก็บ 15 วัน)</span>
      </label>

      <div className="creditbar">
        <div>
          <div className="muted" style={{ fontSize: 13 }}>ใช้เครดิตประมาณ</div>
          <div className="cc">{credits} เครดิต</div>
        </div>
        <button className="btn btn-lg" disabled={uploading}>บันทึกงาน →</button>
      </div>
      {err && <p className="err">{err}</p>}
      <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>* ตอนนี้บันทึกเป็นงานร่างในระบบจริง — การเจนด้วย AI จะต่อในเฟสถัดไป (เมื่อพร้อมเติมเครดิต fal.ai)</p>
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
