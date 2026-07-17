'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createJobDraft } from '@/app/actions';
import { useLang } from './LanguageProvider';

type L = 'th' | 'en';
const FORMATS = [
  { id: 'ugc', icon: '🎤', th: 'พรีเซนเตอร์พูด', en: 'Talking presenter', dth: 'พูดรีวิว/แนะนำ · ไม่ต้องมีสินค้าก็ได้', den: 'Review/intro · product optional', tag: 'มีคน', presenter: true },
  { id: 'hand', icon: '🤳', th: 'มือถือสินค้า', en: 'Hands only', dth: 'โชว์แค่มือ เช่น กำไล แหวน', den: 'Show hands only', tag: 'ไม่มีคน', presenter: false },
  { id: 'food', icon: '🍜', th: 'อาหาร/ขนม', en: 'Food', dth: 'ภาพอาหารสวยๆ + ASMR/พากย์', den: 'Beautiful food + VO', tag: 'ไม่มีคน', presenter: false },
  { id: 'product', icon: '📦', th: 'โชว์สินค้า', en: 'Product + VO', dth: 'เน้นภาพสินค้าหมุนโชว์', den: 'Product-focused', tag: 'ไม่มีคน', presenter: false },
  { id: 'image', icon: '🖼️', th: 'สร้างรูปอย่างเดียว', en: 'Images only', dth: 'ได้ภาพสินค้าสวยๆ ไว้โพส · ถูกมาก', den: 'Just images · cheapest', tag: 'รูปภาพ', presenter: false },
];
const PLATFORMS = [
  { id: '9:16', th: 'แนวตั้ง', en: 'Vertical', sub: 'TikTok · Reels · Shorts', dur: 20, w: 250 },
  { id: '1:1', th: 'จัตุรัส', en: 'Square', sub: 'ฟีด FB / IG', dur: 15, w: 320 },
  { id: '16:9', th: 'แนวนอน', en: 'Horizontal', sub: 'YouTube', dur: 30, w: 360 },
];
const MOODS = ['สนุก ตื่นเต้น', 'น่าเชื่อถือ', 'เป็นกันเอง', 'หรูหรา', 'ตลก'];
const CONCEPTS = [
  { id: 'sale', th: 'ลดราคา' }, { id: 'opening', th: 'โปรเปิดร้าน' }, { id: 'review', th: 'รีวิวสินค้า' },
  { id: 'intro', th: 'แนะนำสินค้า' }, { id: 'ba', th: 'เปรียบเทียบก่อน-หลัง' }, { id: 'launch', th: 'เปิดตัวสินค้าใหม่' },
  { id: 'clearance', th: 'Clearance Sale' }, { id: 'flash', th: 'Flash Sale' }, { id: 'other', th: '+ อื่นๆ (พิมพ์เอง)' },
];
const V_GENDER = ['หญิง', 'ชาย'];
const V_AGE = ['วัยรุ่น', 'ผู้ใหญ่', 'วัยกลางคน', 'สูงวัย'];
const V_TONE = ['สดใสมีพลัง', 'นุ่มนวลเป็นมิตร', 'จริงจังน่าเชื่อถือ', 'ขี้เล่นสนุก', 'หรูหรา'];
const VOICES = [{ id: 'ploy', n: 'น้องพลอย', d: 'สดใส' }, { id: 'mai', n: 'พี่ใหม่', d: 'นุ่มนวล' }, { id: 'j', n: 'โค้ชเจ', d: 'จริงจัง' }];
const AV_GENDER = ['หญิง', 'ชาย', 'ไม่ระบุ'];
const AV_AGE = ['วัยรุ่น (18–25)', 'ผู้ใหญ่ (26–40)', 'วัยกลางคน (40–55)', 'สูงวัย (55+)'];
const AV_ETH = ['ไทย', 'เอเชียตะวันออก', 'ลูกครึ่ง', 'ตะวันตก', 'เอเชียใต้', 'แอฟริกัน'];
const SHOT_SETS: Record<string, string[]> = {
  ugc: ['พรีเซนเตอร์เปิด', 'โชว์สินค้าใกล้ๆ', 'พรีเซนเตอร์ปิด + CTA'],
  product: ['ฮีโร่สินค้า', 'ใช้งานจริง', 'โคลสอัพดีเทล', 'การ์ด CTA'],
  hand: ['หยิบสินค้าขึ้นมา', 'โชว์บนมือ', 'โคลสอัพดีเทล', 'การ์ด CTA'],
  food: ['จานเสิร์ฟสวยๆ', 'ตัก/ยืดชีส ASMR', 'โคลสอัพไอน้ำ', 'การ์ด CTA'],
};

type Brand = { id: string; name: string };
type Asset = { path: string; url: string };
type Shot = { name: string; desc: string };

export default function GenerateForm({ brands }: { brands: Brand[] }) {
  const supabase = useMemo(() => createClient(), []);
  const { lang } = useLang();
  const T = (th: string, en: string) => (lang === 'th' ? th : en);

  const [format, setFormat] = useState('ugc');
  const [ratio, setRatio] = useState('9:16');
  const [duration, setDuration] = useState(20);
  const [count, setCount] = useState(2);
  const [mood, setMood] = useState(MOODS[0]);
  const [concept, setConcept] = useState('sale');
  const [conceptText, setConceptText] = useState('');
  const [scriptLang, setScriptLang] = useState<L>('th');
  const [script, setScript] = useState('');
  const [drafts, setDrafts] = useState<string[]>([]);
  const [spokenLang, setSpokenLang] = useState('ไทย');
  const [presenterGender, setPresenterGender] = useState('อัตโนมัติ (ตามรูป)');
  const [imgMain, setImgMain] = useState('');
  const [imgSub, setImgSub] = useState('');

  const [voiceMode, setVoiceMode] = useState('ai');
  const [voicePath, setVoicePath] = useState('');
  const [voiceLabel, setVoiceLabel] = useState('');
  const [vGender, setVGender] = useState('หญิง');
  const [vAge, setVAge] = useState('ผู้ใหญ่');
  const [vTone, setVTone] = useState(V_TONE[0]);
  const [vPick, setVPick] = useState('ploy');
  const [vSignature, setVSignature] = useState(false);
  const [voiceAcc, setVoiceAcc] = useState(false);

  const [subtitles, setSubtitles] = useState(true);
  const [cta, setCta] = useState(true);
  const [thumbnail, setThumbnail] = useState(false);
  const [thumbCount, setThumbCount] = useState(2);
  const [logo, setLogo] = useState(false);
  const [moreAcc, setMoreAcc] = useState(false);

  const [presenterMode, setPresenterMode] = useState('upload');
  const [consentPhoto, setConsentPhoto] = useState(false);
  const [avGender, setAvGender] = useState('หญิง');
  const [avAge, setAvAge] = useState('ผู้ใหญ่ (26–40)');
  const [avEth, setAvEth] = useState('ไทย');

  const [brandId, setBrandId] = useState('');
  const [useBrandImgs, setUseBrandImgs] = useState(true);
  const [brandAssets, setBrandAssets] = useState<Asset[]>([]);
  const [pickedAssets, setPickedAssets] = useState<string[]>([]);
  const [brandDesc, setBrandDesc] = useState('');

  const [consent, setConsent] = useState(false);
  const [images, setImages] = useState<{ path: string; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const [shots, setShots] = useState<Shot[]>([]);

  const isImage = format === 'image';
  const fInfo = FORMATS.find((f) => f.id === format)!;
  const pInfo = PLATFORMS.find((p) => p.id === ratio)!;

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
    const rate = format === 'ugc' ? 0.45 : 1.0;
    let c = duration * rate * count;
    if (thumbnail) c += thumbCount * 2;
    return Math.max(3, Math.ceil(c));
  }, [format, duration, count, isImage, thumbnail, thumbCount]);

  const firstPreview = images[0]?.preview
    || (useBrandImgs && pickedAssets.length ? brandAssets.find((a) => a.path === pickedAssets[0])?.url : '') || '';

  function pickPlatform(id: string) {
    setRatio(id); const p = PLATFORMS.find((x) => x.id === id); if (p) setDuration(p.dur);
  }
  async function upload(bucketFiles: File[], prefix = '') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErr('ต้องล็อกอินก่อน'); return []; }
    const out: { path: string; preview: string }[] = [];
    for (const file of bucketFiles) {
      const path = `${user.id}/${prefix}${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from('uploads').upload(path, file);
      if (error) { setErr('อัพไม่สำเร็จ: ' + error.message); continue; }
      out.push({ path, preview: URL.createObjectURL(file) });
    }
    return out;
  }
  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []); if (!files.length) return;
    setUploading(true); setErr('');
    const out = await upload(files);
    setImages((p) => [...p, ...out]); setUploading(false); e.target.value = '';
  }
  async function onVoiceFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); const out = await upload([file], 'voice-'); setUploading(false);
    if (out[0]) { setVoicePath(out[0].path); setVoiceLabel('อัพโหลด: ' + file.name); } e.target.value = '';
  }
  // record
  const [recOn, setRecOn] = useState(false); const [recSec, setRecSec] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null); const chunksRef = useRef<Blob[]>([]); const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  async function toggleRec() {
    if (recOn) { recRef.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream); chunksRef.current = [];
      mr.ondataavailable = (ev) => chunksRef.current.push(ev.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop()); if (timerRef.current) clearInterval(timerRef.current); setRecOn(false);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
        const path = `${user.id}/voice-${crypto.randomUUID()}.webm`; setUploading(true);
        const { error } = await supabase.storage.from('uploads').upload(path, blob); setUploading(false);
        if (!error) { setVoicePath(path); setVoiceLabel(`อัดเสียงแล้ว ${recSec} วิ`); }
      };
      recRef.current = mr; mr.start(); setRecOn(true); setRecSec(0);
      timerRef.current = setInterval(() => setRecSec((s) => s + 1), 1000);
    } catch { setErr('เข้าถึงไมโครโฟนไม่ได้ — อนุญาตไมค์ก่อน'); }
  }
  function draftScripts() {
    const hooks = ['เปิดด้วยปัญหา', 'เปิดด้วยข้อเสนอ', 'เปิดด้วยคำถาม'];
    setDrafts(hooks.map((h) => `[${h}] (ตัวอย่างบท — จะต่อ AI จริงในเฟสถัดไป) ... ทักแชทสั่งเลยก่อนของหมดนะ!`));
  }
  function planShots() { setShots((SHOT_SETS[format] ?? SHOT_SETS.product).map((n) => ({ name: n, desc: '' }))); }
  function moveShot(i: number, d: number) {
    const j = i + d; if (j < 0 || j >= shots.length) return;
    const s = [...shots];[s[i], s[j]] = [s[j], s[i]]; setShots(s);
  }

  const allImages = [...images.map((i) => i.path), ...(useBrandImgs ? pickedAssets : [])];
  const extra = JSON.stringify({
    mood, image_text: { main: imgMain, sub: imgSub }, thumbnail, thumb_count: thumbCount, logo,
    voice_detail: voiceMode === 'ai' ? { gender: vGender, age: vAge, tone: vTone, voice: vPick, signature: vSignature } : {},
    presenter: fInfo.presenter ? { mode: presenterMode, consent: consentPhoto, avatar: presenterMode === 'ai' ? { gender: avGender, age: avAge, ethnicity: avEth } : null } : null,
    spoken_lang: spokenLang, presenter_gender: presenterGender, ui_lang: lang,
  });

  const TH = 260, TW = { '9:16': 26, '1:1': 46, '16:9': 60 }[ratio] ?? 46;

  return (
    <form action={createJobDraft} className="gen-wrap">
      <input type="hidden" name="format" value={format} />
      <input type="hidden" name="ratio" value={ratio} />
      <input type="hidden" name="concept" value={concept === 'other' ? conceptText : concept} />
      <input type="hidden" name="script_lang" value={scriptLang} />
      <input type="hidden" name="script" value={script} />
      <input type="hidden" name="voice_mode" value={voiceMode} />
      <input type="hidden" name="voice_path" value={voicePath} />
      <input type="hidden" name="credits_cost" value={credits} />
      <input type="hidden" name="images" value={JSON.stringify(allImages)} />
      <input type="hidden" name="count" value={count} />
      <input type="hidden" name="duration" value={duration} />
      <input type="hidden" name="brand_id" value={brandId} />
      <input type="hidden" name="subtitles" value={subtitles ? 'on' : ''} />
      <input type="hidden" name="cta" value={cta ? 'on' : ''} />
      <input type="hidden" name="logo" value={logo ? 'on' : ''} />
      <input type="hidden" name="shots" value={JSON.stringify(shots)} />
      <input type="hidden" name="extra" value={extra} />

      <div className="card" style={{ minWidth: 0 }}>
        {/* format */}
        <span className="muted" style={{ fontSize: 14 }}>{T('รูปแบบวิดีโอ', 'Video format')}</span>
        <div className="fmt-grid" style={{ marginTop: 8 }}>
          {FORMATS.map((f) => (
            <button type="button" key={f.id} className={'fmt' + (format === f.id ? ' active' : '')} onClick={() => { setFormat(f.id); setShots([]); }}>
              <div className="fi">{f.icon}</div><div className="ft">{T(f.th, f.en)}</div><div className="fd">{T(f.dth, f.den)}</div>
              <span className="pill" style={{ marginTop: 6, fontSize: 11 }}>{f.tag}</span>
            </button>
          ))}
        </div>

        {/* presenter (ugc) */}
        {fInfo.presenter && (
          <>
            <div className="mini-label">{T('พรีเซนเตอร์', 'Presenter')}</div>
            <div className="seg">
              {[['upload', T('อัพรูปเอง', 'Upload')], ['ai', T('สร้าง Avatar (AI)', 'AI avatar')]].map(([v, t]) => (
                <button type="button" key={v} className={presenterMode === v ? 'active' : ''} onClick={() => setPresenterMode(v)}>{t}</button>
              ))}
            </div>
            {presenterMode === 'ai' && (
              <div style={{ marginTop: 10 }}>
                <div className="mini-label">{T('เพศ', 'Gender')}</div>
                <div className="chips">{AV_GENDER.map((g) => <button type="button" key={g} className={'chip' + (avGender === g ? ' active' : '')} onClick={() => setAvGender(g)}>{g}</button>)}</div>
                <div className="mini-label">{T('ช่วงอายุ', 'Age')}</div>
                <div className="chips">{AV_AGE.map((g) => <button type="button" key={g} className={'chip' + (avAge === g ? ' active' : '')} onClick={() => setAvAge(g)}>{g}</button>)}</div>
                <div className="mini-label">{T('เชื้อชาติ / ลุค', 'Ethnicity / look')}</div>
                <div className="chips">{AV_ETH.map((g) => <button type="button" key={g} className={'chip' + (avEth === g ? ' active' : '')} onClick={() => setAvEth(g)}>{g}</button>)}</div>
              </div>
            )}
          </>
        )}

        {/* platform / ratio */}
        <div className="mini-label">{T('ลงที่ไหน (ตั้งสัดส่วน+ความยาวให้)', 'Post where (sets size + length)')}</div>
        <div className="chips">
          {PLATFORMS.map((p) => (
            <button type="button" key={p.id} className={'chip' + (ratio === p.id ? ' active' : '')} onClick={() => pickPlatform(p.id)}>
              {T(p.th, p.en)} · {p.id}
            </button>
          ))}
        </div>

        {/* brand */}
        {brands.length > 0 && (
          <>
            <label className="field"><span>{T('สร้างให้แบรนด์ไหน', 'For which brand')}</span>
              <select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                <option value="">{T('— ไม่ระบุ —', '— none —')}</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            {brandId && brandDesc && (
              <div style={{ marginTop: 8, background: 'var(--yellow-soft)', border: '1px solid var(--yellow-deep)', borderRadius: 10, padding: '10px 14px', fontSize: 13.5 }}>
                <b>{T('รายละเอียดแบรนด์ (ใส่ในบทให้อัตโนมัติ):', 'Brand info (auto-added to script):')}</b> {brandDesc}
              </div>
            )}
            {brandId && brandAssets.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <label className="row" style={{ cursor: 'pointer', gap: 8 }}>
                  <input type="checkbox" checked={useBrandImgs} onChange={(e) => setUseBrandImgs(e.target.checked)} />
                  <span style={{ fontSize: 14 }}>{T('ใช้รูปที่บันทึกไว้ในแบรนด์นี้', 'Use this brand\'s saved images')}</span>
                </label>
                {useBrandImgs && (
                  <div className="asset-pick">
                    {brandAssets.map((a) => (
                      <label key={a.path}>
                        <input type="checkbox" checked={pickedAssets.includes(a.path)} onChange={(e) => setPickedAssets((p) => e.target.checked ? [...p, a.path] : p.filter((x) => x !== a.path))} />
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
        <label className="field"><span>{T('อัพรูปสินค้า', 'Upload product photos')}{fInfo.presenter ? T(' / พรีเซนเตอร์', ' / presenter') : ''}</span></label>
        {fInfo.presenter && presenterMode === 'upload' && (
          <label className="consent" style={{ marginTop: 0, marginBottom: 8 }}>
            <input type="checkbox" checked={consentPhoto} onChange={(e) => setConsentPhoto(e.target.checked)} />
            <span className="ct">{T('ฉันมีสิทธิ์ใช้รูปพรีเซนเตอร์นี้ และรับผิดชอบเรื่องลิขสิทธิ์เอง (ไม่ใช้รูปดารา/คนอื่นที่ไม่ได้ขออนุญาต)', 'I have rights to this presenter photo and accept copyright responsibility')}</span>
          </label>
        )}
        <div className="uploads">
          {images.map((im, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img className="up-thumb" src={im.preview} alt="" />
              <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))} style={{ position: 'absolute', top: -6, right: -6, background: '#1A1A17', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer' }}>×</button>
            </div>
          ))}
          <label className="up-add">{uploading ? '…' : '+'}<input type="file" accept="image/*" multiple hidden onChange={onPick} /></label>
        </div>

        {isImage ? (
          <>
            {/* image text */}
            <label className="field"><span>{T('ข้อความหลัก (พาดหัวใหญ่)', 'Main text (headline)')}</span>
              <input type="text" name="bfName" value={imgMain} onChange={(e) => setImgMain(e.target.value)} placeholder="เช่น ลด 50% วันนี้เท่านั้น" /></label>
            <label className="field"><span>{T('ข้อความรอง (บรรทัดเล็ก)', 'Secondary text')}</span>
              <input type="text" value={imgSub} onChange={(e) => setImgSub(e.target.value)} placeholder="เช่น ทักแชทสั่งเลย ส่งฟรีทั่วไทย" /></label>
            <label className="field"><span>{T('จำนวนรูป', 'Number of images')}</span></label>
            <Stepper value={count} setValue={setCount} min={1} max={10} />
          </>
        ) : (
          <>
            {/* duration */}
            <label className="field"><span>{T('ความยาววิดีโอ', 'Duration')}</span></label>
            <div className="rng">
              <input type="range" min={5} max={60} step={5} value={duration} style={{ ['--fill' as any]: ((duration - 5) / 55 * 100) + '%' }} onChange={(e) => setDuration(Number(e.target.value))} />
              <span className="rv">{duration} {T('วิ', 's')}</span>
            </div>

            {/* spoken lang + presenter gender */}
            <div className="grid grid-2">
              <label className="field"><span>{T('ภาษาที่พูด', 'Spoken language')}</span>
                <select value={spokenLang} onChange={(e) => setSpokenLang(e.target.value)}>
                  {['ไทย', 'อังกฤษ', 'ไทย + ซับอังกฤษ', 'จีน'].map((x) => <option key={x}>{x}</option>)}
                </select></label>
              {fInfo.presenter && (
                <label className="field"><span>{T('เพศพรีเซนเตอร์', 'Presenter gender')}</span>
                  <select value={presenterGender} onChange={(e) => setPresenterGender(e.target.value)}>
                    {['อัตโนมัติ (ตามรูป)', 'หญิง', 'ชาย'].map((x) => <option key={x}>{x}</option>)}
                  </select></label>
              )}
            </div>

            {/* mood */}
            <div className="mini-label">{T('โทน / อารมณ์วิดีโอ', 'Tone / mood')}</div>
            <div className="chips">{MOODS.map((m) => <button type="button" key={m} className={'chip' + (mood === m ? ' active' : '')} onClick={() => setMood(m)}>{m}</button>)}</div>
          </>
        )}

        {/* concept + brief (video) */}
        {!isImage && (
          <>
            <div className="mini-label">{T('คอนเซ็ปต์', 'Concept')}</div>
            <div className="chips">{CONCEPTS.map((c) => <button type="button" key={c.id} className={'chip' + (concept === c.id ? ' active' : '')} onClick={() => setConcept(c.id)}>{c.th}</button>)}</div>
            {concept === 'other' && <input type="text" value={conceptText} onChange={(e) => setConceptText(e.target.value)} placeholder="พิมพ์คอนเซ็ปต์เอง" style={{ marginTop: 8 }} />}

            <label className="field"><span>{T('ชื่อสินค้า', 'Product name')}</span><input type="text" name="bfName" placeholder="เช่น เซรั่มหน้าใส Glow" /></label>
            <div className="grid grid-2">
              <label className="field"><span>{T('ราคา', 'Price')}</span><input type="text" name="bfPrice" placeholder="เช่น 199 บาท" /></label>
              <label className="field"><span>{T('โปรถึงวันไหน', 'Promo ends')}</span><input type="text" name="bfPromo" placeholder="เช่น ถึง 30 มิ.ย." /></label>
            </div>
            <label className="field"><span>{T('จุดขาย / อยากบอกอะไร', 'Key selling point')}</span><textarea name="bfPoint" rows={2} placeholder="เช่น ใช้ 2 สัปดาห์หน้าใสขึ้น" /></label>

            <div className="mini-label">{T('ภาษาของบทพูด', 'Script language')}</div>
            <div className="seg">
              {[['th', 'ไทย'], ['en', T('อังกฤษ', 'English')]].map(([v, t]) => (
                <button type="button" key={v} className={scriptLang === v ? 'active' : ''} onClick={() => setScriptLang(v as L)}>{t}</button>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <button type="button" className="btn-ghost" style={{ padding: '10px 18px', borderRadius: 10, cursor: 'pointer', font: 'inherit', fontWeight: 600 }} onClick={draftScripts}>✦ {T('ให้ AI ร่างบทให้ 3 แบบ', 'Let AI draft 3 scripts')}</button>
            </div>
            {drafts.length > 0 && (
              <div className="grid" style={{ marginTop: 10 }}>
                {drafts.map((d, i) => (
                  <div key={i} className="card" style={{ padding: 12, cursor: 'pointer', borderColor: script === d ? 'var(--ink)' : 'var(--line)' }} onClick={() => setScript(d)}>
                    <div style={{ fontSize: 13.5 }}>{d}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{script === d ? '✓ เลือกแล้ว' : 'แตะเพื่อเลือกบทนี้'}</div>
                  </div>
                ))}
              </div>
            )}
            <label className="field"><span>{T('บทพูด (แก้ไขเพิ่มได้)', 'Script (editable)')}</span>
              <textarea value={script} onChange={(e) => setScript(e.target.value)} rows={3} placeholder="พิมพ์บทเอง หรือกดให้ AI ร่างด้านบน" /></label>
          </>
        )}

        {/* voice (video) */}
        {!isImage && (
          <>
            <div className="mini-label">{T('เสียงพูด', 'Voice')}</div>
            <div className="chips">
              {[['ai', T('เสียง AI', 'AI voice')], ['record', T('อัดเสียงเอง', 'Record')], ['upload', T('อัพไฟล์เสียง', 'Upload audio')]].map(([v, t]) => (
                <button type="button" key={v} className={'chip' + (voiceMode === v ? ' active' : '')} onClick={() => setVoiceMode(v)}>{t}</button>
              ))}
            </div>
            {voiceMode === 'record' && (
              <div><button type="button" className={'rec-btn' + (recOn ? ' on' : '')} onClick={toggleRec}><span className="rec-dot" />{recOn ? `กำลังอัด… ${recSec} วิ (แตะหยุด)` : 'แตะเพื่อเริ่มอัด'}</button>{voiceLabel && <p className="ok">{voiceLabel}</p>}</div>
            )}
            {voiceMode === 'upload' && (
              <div><label className="btn-ghost" style={{ display: 'inline-block', padding: '10px 18px', borderRadius: 10, cursor: 'pointer', marginTop: 8 }}>{T('เลือกไฟล์เสียง', 'Choose audio')} (mp3/wav)<input type="file" accept="audio/*" hidden onChange={onVoiceFile} /></label>{voiceLabel && <p className="ok">{voiceLabel}</p>}</div>
            )}
            {voiceMode === 'ai' && (
              <div className={'acc' + (voiceAcc ? '' : ' closed')} style={{ marginTop: 10 }}>
                <div className="acc-head" onClick={() => setVoiceAcc(!voiceAcc)}>
                  <div><div className="at">{T('ปรับเสียงละเอียด', 'Fine-tune voice')}</div><div className="as">{T('เพศ · อายุ · โทน · เลือกเสียง (ไม่แตะก็ได้)', 'gender · age · tone · pick (optional)')}</div></div>
                  <span className="caret">▾</span>
                </div>
                <div className="acc-body">
                  <div className="mini-label">{T('เพศเสียง', 'Voice gender')}</div>
                  <div className="chips">{V_GENDER.map((g) => <button type="button" key={g} className={'chip' + (vGender === g ? ' active' : '')} onClick={() => setVGender(g)}>{g}</button>)}</div>
                  <div className="mini-label">{T('ช่วงอายุเสียง', 'Voice age')}</div>
                  <div className="chips">{V_AGE.map((g) => <button type="button" key={g} className={'chip' + (vAge === g ? ' active' : '')} onClick={() => setVAge(g)}>{g}</button>)}</div>
                  <div className="mini-label">{T('โทนเสียง', 'Voice tone')}</div>
                  <div className="chips">{V_TONE.map((g) => <button type="button" key={g} className={'chip' + (vTone === g ? ' active' : '')} onClick={() => setVTone(g)}>{g}</button>)}</div>
                  <div className="mini-label">{T('เลือกเสียง', 'Pick a voice')}</div>
                  <div className="voice-cards">
                    {VOICES.map((v) => (
                      <div key={v.id} className={'vcard' + (vPick === v.id ? ' active' : '')} onClick={() => setVPick(v.id)}>
                        <div className="vplay">▶</div><div className="vn">{v.n}</div><div className="vd">{v.d}</div>
                      </div>
                    ))}
                  </div>
                  <div className="tgl" style={{ marginTop: 10, borderTop: '1px solid var(--line)' }}>
                    <div><div className="tl">{T('บันทึกเป็นเสียงประจำแบรนด์', 'Save as brand voice')}</div><div className="as muted" style={{ fontSize: 12 }}>{T('ใช้เสียงเดิมทุกคลิป', 'Same voice every clip')}</div></div>
                    <label className="switch"><input type="checkbox" checked={vSignature} onChange={(e) => setVSignature(e.target.checked)} /><span className="track" /></label>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* more settings (video) */}
        {!isImage && (
          <div className={'acc' + (moreAcc ? '' : ' closed')} style={{ marginTop: 12 }}>
            <div className="acc-head" onClick={() => setMoreAcc(!moreAcc)}>
              <div><div className="at">{T('ตั้งค่าเพิ่มเติม', 'More settings')}</div><div className="as">{T('ซับ · CTA · ภาพปก · โลโก้ (ค่าเริ่มต้นดีอยู่แล้ว)', 'subs · CTA · thumbnail · logo')}</div></div>
              <span className="caret">▾</span>
            </div>
            <div className="acc-body">
              <Toggle label={T('ใส่ซับไตเติลบนคลิป', 'Burn-in subtitles')} checked={subtitles} onChange={setSubtitles} />
              <Toggle label={T('ปุ่มชวนซื้อ (CTA) ตอนจบ', 'CTA at the end')} checked={cta} onChange={setCta} />
              <Toggle label={T('สร้างภาพปก (Thumbnail)', 'Generate thumbnails')} checked={thumbnail} onChange={setThumbnail} />
              {thumbnail && <div style={{ padding: '8px 0' }}><span className="mini-label" style={{ marginTop: 0 }}>{T('จำนวนภาพปก', 'Thumbnails')} (+2 เครดิต/รูป)</span><Stepper value={thumbCount} setValue={setThumbCount} min={1} max={4} /></div>}
              <Toggle label={T('ใส่โลโก้แบรนด์ตอนจบ', 'Add brand logo')} checked={logo} onChange={setLogo} />
            </div>
          </div>
        )}

        {/* count (video) */}
        {!isImage && (
          <>
            <label className="field"><span>{T('จำนวนวิดีโอ', 'Number of videos')} ({T('ทำหลายเวอร์ชันไว้เทสต์', 'A/B test versions')})</span></label>
            <Stepper value={count} setValue={setCount} min={1} max={6} />
          </>
        )}

        {/* storyboard (video) */}
        {!isImage && (
          <div style={{ marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="mini-label" style={{ margin: 0 }}>{T('ลำดับช็อต (ไม่บังคับ)', 'Shot list (optional)')}</div>
              <button type="button" className="btn-ghost" style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', font: 'inherit', fontSize: 13 }} onClick={planShots}>{shots.length ? T('วางลำดับใหม่', 'Re-plan') : T('✦ วางลำดับช็อตให้', '✦ Plan shots')}</button>
            </div>
            {shots.map((s, i) => (
              <div className="shot" key={i}>
                <div className="shot-num">{i + 1}</div>
                <div className="shot-thumb" style={{ width: TW, height: TH * 0.28 }} />
                <div className="shot-body">
                  <input type="text" value={s.name} onChange={(e) => { const n = [...shots]; n[i].name = e.target.value; setShots(n); }} />
                  <input type="text" value={s.desc} placeholder="อยากให้ช็อตนี้เป็นอะไร" style={{ marginTop: 4 }} onChange={(e) => { const n = [...shots]; n[i].desc = e.target.value; setShots(n); }} />
                  <div className="shot-acts">
                    <button type="button" onClick={() => moveShot(i, -1)} disabled={i === 0}>↑</button>
                    <button type="button" onClick={() => moveShot(i, 1)} disabled={i === shots.length - 1}>↓</button>
                    <button type="button" disabled={shots.length <= 2} onClick={() => setShots(shots.filter((_, j) => j !== i))}>ลบ</button>
                  </div>
                </div>
              </div>
            ))}
            {shots.length > 0 && <button type="button" className="btn-ghost" style={{ padding: '6px 14px', borderRadius: 8, cursor: 'pointer', font: 'inherit', fontSize: 13, marginTop: 8 }} onClick={() => setShots([...shots, { name: 'ช็อตใหม่', desc: '' }])}>+ {T('เพิ่มช็อต', 'Add shot')}</button>}
          </div>
        )}

        {/* consent */}
        <label className="consent">
          <input type="checkbox" name="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span className="ct"><b>{T('ยินยอมให้ GenIt นำผลงานไปโปรโมท → รับโบนัส +3 เครดิตฟรีทันที!', 'Let GenIt feature this → get +3 free credits!')}</b> {T('(งานฟรีมีลายน้ำ เก็บ 15 วัน)', '(free work watermarked, kept 15 days)')}</span>
        </label>

        <div className="creditbar">
          <div><div className="muted" style={{ fontSize: 13 }}>{T('ใช้เครดิตประมาณ', 'Estimated credits')}</div><div className="cc">{credits}</div></div>
          <button className="btn btn-lg" disabled={uploading}>{isImage ? T('สร้างรูป', 'Generate images') : T('สร้างวิดีโอ', 'Generate video')} →</button>
        </div>
        {err && <p className="err">{err}</p>}
        <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>* {T('บันทึกเป็นงานจริง — การเจน AI จะต่อในเฟสถัดไป', 'Saved as a real job — AI generation comes next')}</p>
      </div>

      {/* preview */}
      <div className="preview-panel">
        <div className="card" style={{ padding: 16 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 10, textAlign: 'center' }}>{T('ตัวอย่าง', 'Preview')} ({ratio})</div>
          <div className="pv-frame" style={{ width: pInfo.w, maxWidth: '100%', aspectRatio: ratio.replace(':', ' / ') }}>
            {firstPreview ? <img src={firstPreview} alt="" /> : <div className="pv-empty">📹<br />{isImage ? T('รูปจะขึ้นตรงนี้', 'Image here') : T('วิดีโอจะขึ้นตรงนี้', 'Video here')}</div>}
            {logo && <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--yellow)', color: '#000', borderRadius: 6, padding: '2px 7px', fontSize: 11, fontWeight: 700 }}>LOGO</div>}
            {cta && !isImage && <div style={{ position: 'absolute', bottom: 34, left: '50%', transform: 'translateX(-50%)', background: 'var(--yellow)', color: '#000', borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>ทักแชทสั่งเลย →</div>}
            {(subtitles || isImage) && (imgMain || !isImage) && <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, textAlign: 'center', color: '#fff', fontSize: 12, textShadow: '0 1px 3px #000' }}>{isImage ? (imgMain || 'ข้อความบนรูป') : 'ซับไตเติลตัวอย่าง'}</div>}
          </div>
          <div className="pv-cap">{isImage ? `${count} ${T('รูป', 'images')}` : `${duration} ${T('วิ', 's')} · ${count} ${T('คลิป', 'clips')}`} · ~{credits} {T('เครดิต', 'cr')}</div>
        </div>
      </div>

      {/* sticky generate bar */}
      <div className="sticky-gen">
        <div className="sg-in">
          <div className="muted" style={{ fontSize: 14 }}>{T('ใช้', 'Uses')} <b style={{ color: 'var(--ink)', fontSize: 17 }}>{credits}</b> {T('เครดิต', 'credits')}</div>
          <button className="btn btn-lg" disabled={uploading}>✦ {isImage ? T('สร้างรูป', 'Generate images') : T('สร้างวิดีโอ', 'Generate video')}</button>
        </div>
      </div>
    </form>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="tgl">
      <span className="tl">{label}</span>
      <label className="switch"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span className="track" /></label>
    </div>
  );
}
function Stepper({ value, setValue, min, max }: { value: number; setValue: (v: number) => void; min: number; max: number }) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => setValue(Math.max(min, value - 1))}>−</button>
      <span className="sval">{value}</span>
      <button type="button" onClick={() => setValue(Math.min(max, value + 1))}>+</button>
    </div>
  );
}
