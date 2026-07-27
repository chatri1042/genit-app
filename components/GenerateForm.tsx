'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createJobDraft } from '@/app/actions';
import { aiDraftScripts } from '@/app/ai';
import { useLang } from './LanguageProvider';
import Storyboard, { type Shot } from './Storyboard';

type L = 'th' | 'en';
const PLATFORMS = [
  { id: '9:16', th: 'แนวตั้ง', en: 'Vertical', sub: 'TikTok · Reels · Shorts', dur: 20, w: 250 },
  { id: '1:1', th: 'จัตุรัส', en: 'Square', sub: 'ฟีด FB / IG', dur: 15, w: 320 },
  { id: '16:9', th: 'แนวนอน', en: 'Horizontal', sub: 'YouTube', dur: 30, w: 360 },
];
const MOODS = ['สนุก ตื่นเต้น', 'น่าเชื่อถือ', 'เป็นกันเอง', 'หรูหรา', 'ตลก'];
const CONCEPTS = [
  { id: 'sale', th: 'ลดราคา', en: 'Sale' }, { id: 'opening', th: 'โปรเปิดร้าน', en: 'Grand opening' }, { id: 'review', th: 'รีวิวสินค้า', en: 'Product review' },
  { id: 'intro', th: 'แนะนำสินค้า', en: 'Introduce product' }, { id: 'ba', th: 'เปรียบเทียบก่อน-หลัง', en: 'Before / after' }, { id: 'launch', th: 'เปิดตัวสินค้าใหม่', en: 'New launch' },
  { id: 'clearance', th: 'Clearance Sale', en: 'Clearance Sale' }, { id: 'flash', th: 'Flash Sale', en: 'Flash Sale' }, { id: 'other', th: '+ อื่นๆ (พิมพ์เอง)', en: '+ Other (type)' },
];
// ปุ่มเริ่มเร็ว (ไม่บังคับ) — กดแล้วติ๊กองค์ประกอบ + ตั้งโทน/คอนเซ็ปต์ให้ ปรับต่อได้ (5 อัน · 2 แถว)
const PRESETS: { id: string; th: string; en: string; pres: boolean; prod: boolean; place: boolean; mood: string; concept: string }[] = [
  { id: 'review', th: 'รีวิวสินค้า', en: 'Product review', pres: true, prod: true, place: false, mood: 'น่าเชื่อถือ', concept: 'review' },
  { id: 'service', th: 'บริการ', en: 'Service', pres: true, prod: false, place: true, mood: 'น่าเชื่อถือ', concept: 'intro' },
  { id: 'shop', th: 'ร้าน / รีสอร์ท', en: 'Shop / resort', pres: false, prod: false, place: true, mood: 'หรูหรา', concept: 'intro' },
  { id: 'talk', th: 'พรีเซนเตอร์พูด', en: 'Talking presenter', pres: true, prod: false, place: false, mood: 'เป็นกันเอง', concept: 'review' },
  { id: 'food', th: 'อาหาร / ขนม', en: 'Food', pres: false, prod: true, place: false, mood: 'สนุก ตื่นเต้น', concept: 'review' },
];
const V_GENDER = ['หญิง', 'ชาย'];
const V_AGE = ['วัยรุ่น', 'ผู้ใหญ่', 'วัยกลางคน', 'สูงวัย'];
const V_TONE = ['สดใสมีพลัง', 'นุ่มนวลเป็นมิตร', 'จริงจังน่าเชื่อถือ', 'ขี้เล่นสนุก', 'หรูหรา'];
const VOICES = [{ id: 'ploy', n: 'น้องพลอย', d: 'สดใส' }, { id: 'mai', n: 'พี่ใหม่', d: 'นุ่มนวล' }, { id: 'j', n: 'โค้ชเจ', d: 'จริงจัง' }];
const AV_GENDER = ['หญิง', 'ชาย', 'ไม่ระบุ'];
const AV_AGE = ['วัยรุ่น (18–25)', 'ผู้ใหญ่ (26–40)', 'วัยกลางคน (40–55)', 'สูงวัย (55+)'];
const AV_ETH = ['ไทย', 'เอเชียตะวันออก', 'ลูกครึ่ง', 'ตะวันตก', 'เอเชียใต้', 'แอฟริกัน'];
// แปลค่าตัวเลือกเป็นอังกฤษ (state เก็บค่าไทยไว้เหมือนเดิม แค่ตอนแสดงผลแปลให้)
const VAL_EN: Record<string, string> = {
  'สนุก ตื่นเต้น': 'Fun & exciting', 'น่าเชื่อถือ': 'Trustworthy', 'เป็นกันเอง': 'Friendly', 'หรูหรา': 'Luxurious', 'ตลก': 'Funny',
  'หญิง': 'Female', 'ชาย': 'Male', 'ไม่ระบุ': 'Any',
  'วัยรุ่น': 'Teen', 'ผู้ใหญ่': 'Adult', 'วัยกลางคน': 'Middle-aged', 'สูงวัย': 'Senior',
  'สดใสมีพลัง': 'Bright & energetic', 'นุ่มนวลเป็นมิตร': 'Soft & friendly', 'จริงจังน่าเชื่อถือ': 'Serious & credible', 'ขี้เล่นสนุก': 'Playful',
  'ไทย': 'Thai', 'อังกฤษ': 'English', 'ไทย + ซับอังกฤษ': 'Thai + EN subs', 'จีน': 'Chinese',
  'อัตโนมัติ (ตามรูป)': 'Auto (from photo)',
  'วัยรุ่น (18–25)': 'Teen (18–25)', 'ผู้ใหญ่ (26–40)': 'Adult (26–40)', 'วัยกลางคน (40–55)': 'Middle (40–55)', 'สูงวัย (55+)': 'Senior (55+)',
  'เอเชียตะวันออก': 'East Asian', 'ลูกครึ่ง': 'Mixed', 'ตะวันตก': 'Western', 'เอเชียใต้': 'South Asian', 'แอฟริกัน': 'African',
  'สดใส': 'Bright', 'นุ่มนวล': 'Soft', 'จริงจัง': 'Serious',
};

type Brand = { id: string; name: string };
type Asset = { path: string; url: string };

export default function GenerateForm({ brands }: { brands: Brand[] }) {
  const supabase = useMemo(() => createClient(), []);
  const { lang } = useLang();
  const T = (th: string, en: string) => (lang === 'th' ? th : en);
  const tv = (s: string) => (lang === 'en' ? (VAL_EN[s] ?? s) : s); // แปลค่าตัวเลือกตามภาษา

  const [output, setOutput] = useState<'video' | 'image'>('video');
  const [activePreset, setActivePreset] = useState('');
  const [hasPresenter, setHasPresenter] = useState(true);
  const [hasProduct, setHasProduct] = useState(true);
  const [hasPlace, setHasPlace] = useState(false);
  const [placeImgs, setPlaceImgs] = useState<{ path: string; preview: string }[]>([]);
  const [ratio, setRatio] = useState('9:16');
  const [duration, setDuration] = useState(20);
  const [count, setCount] = useState(2);
  const [mood, setMood] = useState(MOODS[0]);
  const [concept, setConcept] = useState('');
  const [briefText, setBriefText] = useState('');
  const [scriptLang, setScriptLang] = useState<L>('th');
  const [script, setScript] = useState('');
  const [drafts, setDrafts] = useState<{ hook: string; text: string }[]>([]);
  const [drafting, setDrafting] = useState(false);
  const [draftErr, setDraftErr] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
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
  const [logoImg, setLogoImg] = useState<{ path: string; preview: string } | null>(null);
  const [moreAcc, setMoreAcc] = useState(false);

  const [presenterMode, setPresenterMode] = useState('upload');
  const [consentPhoto, setConsentPhoto] = useState(false);
  const [presenterImg, setPresenterImg] = useState<{ path: string; preview: string } | null>(null);
  const [avGender, setAvGender] = useState('หญิง');
  const [avAge, setAvAge] = useState('ผู้ใหญ่ (26–40)');
  const [avEth, setAvEth] = useState('ไทย');

  const [brandId, setBrandId] = useState('');
  const [brandAssets, setBrandAssets] = useState<Asset[]>([]);
  const [pickedAssets, setPickedAssets] = useState<string[]>([]);
  const [brandDesc, setBrandDesc] = useState('');

  const [consent, setConsent] = useState(false);
  const [images, setImages] = useState<{ path: string; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [shots, setShots] = useState<Shot[]>([]);

  const isImage = output === 'image';
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

  // ── จำค่าฟอร์มไว้ในเครื่อง (ไปหน้าอื่นแล้วกลับมาไม่ต้องตั้งใหม่ · ไม่เสียเครดิตซ้ำ) ──
  const hydrated = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('genit-form-v1');
      if (raw) {
        const s = JSON.parse(raw);
        if (s.brandId != null) setBrandId(s.brandId);
        if (s.output != null) setOutput(s.output);
        if (s.activePreset != null) setActivePreset(s.activePreset);
        if (s.hasPresenter != null) setHasPresenter(s.hasPresenter);
        if (s.hasProduct != null) setHasProduct(s.hasProduct);
        if (s.hasPlace != null) setHasPlace(s.hasPlace);
        if (s.presenterMode != null) setPresenterMode(s.presenterMode);
        if (s.avGender != null) setAvGender(s.avGender);
        if (s.avAge != null) setAvAge(s.avAge);
        if (s.avEth != null) setAvEth(s.avEth);
        if (s.ratio != null) setRatio(s.ratio);
        if (s.duration != null) setDuration(s.duration);
        if (s.count != null) setCount(s.count);
        if (s.mood != null) setMood(s.mood);
        if (s.concept != null) setConcept(s.concept);
        if (s.briefText != null) setBriefText(s.briefText);
        if (s.scriptLang != null) setScriptLang(s.scriptLang);
        if (s.script != null) setScript(s.script);
        if (s.spokenLang != null) setSpokenLang(s.spokenLang);
        if (s.presenterGender != null) setPresenterGender(s.presenterGender);
        if (s.subtitles != null) setSubtitles(s.subtitles);
        if (s.cta != null) setCta(s.cta);
        if (s.logo != null) setLogo(s.logo);
        if (s.thumbnail != null) setThumbnail(s.thumbnail);
        if (s.thumbCount != null) setThumbCount(s.thumbCount);
        if (s.voiceMode != null) setVoiceMode(s.voiceMode);
        if (s.vGender != null) setVGender(s.vGender);
        if (s.vAge != null) setVAge(s.vAge);
        if (s.vTone != null) setVTone(s.vTone);
        if (s.vPick != null) setVPick(s.vPick);
        if (s.imgMain != null) setImgMain(s.imgMain);
        if (s.imgSub != null) setImgSub(s.imgSub);
        if (Array.isArray(s.pickedAssets)) setPickedAssets(s.pickedAssets);
        if (Array.isArray(s.images)) setImages(s.images);
        if (Array.isArray(s.placeImgs)) setPlaceImgs(s.placeImgs);
        if (s.presenterImg != null) setPresenterImg(s.presenterImg);
        if (s.logoImg != null) setLogoImg(s.logoImg);
        if (Array.isArray(s.shots)) setShots(s.shots);
      }
    } catch { /* ignore */ }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem('genit-form-v1', JSON.stringify({
        brandId, output, activePreset, hasPresenter, hasProduct, hasPlace,
        presenterMode, avGender, avAge, avEth, ratio, duration, count,
        mood, concept, briefText, scriptLang, script, spokenLang, presenterGender,
        subtitles, cta, logo, thumbnail, thumbCount,
        voiceMode, vGender, vAge, vTone, vPick, imgMain, imgSub,
        pickedAssets, images, placeImgs, presenterImg, logoImg, shots,
      }));
    } catch { /* ignore */ }
  }, [brandId, output, activePreset, hasPresenter, hasProduct, hasPlace, presenterMode, avGender, avAge, avEth, ratio, duration, count, mood, concept, briefText, scriptLang, script, spokenLang, presenterGender, subtitles, cta, logo, thumbnail, thumbCount, voiceMode, vGender, vAge, vTone, vPick, imgMain, imgSub, pickedAssets, images, placeImgs, presenterImg, logoImg, shots]);

  function clearSaved() {
    try { localStorage.removeItem('genit-form-v1'); } catch { /* ignore */ }
    setShots([]); setImages([]); setPlaceImgs([]); setPresenterImg(null); setLogoImg(null);
    setPickedAssets([]); setBriefText(''); setScript(''); setConcept(''); setActivePreset('');
  }

  const credits = useMemo(() => {
    if (isImage) return Math.max(1, count) * 3;
    // วิดีโอ: ยิ่งมีองค์ประกอบเยอะยิ่งซับซ้อน (พูดอย่างเดียวถูกสุด · มีสถานที่แพงขึ้น)
    let rate = 0.6;
    if (hasProduct) rate = 1.0;
    if (hasPlace) rate = 1.1;
    let c = duration * rate * count;
    if (thumbnail) c += thumbCount * 2;
    return Math.max(3, Math.ceil(c));
  }, [duration, count, isImage, hasProduct, hasPlace, thumbnail, thumbCount]);

  const firstPreview = (hasPresenter && presenterMode === 'upload' && presenterImg?.preview)
    || images[0]?.preview
    || placeImgs[0]?.preview
    || (pickedAssets.length ? brandAssets.find((a) => a.path === pickedAssets[0])?.url : '') || '';

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
  async function onPickPresenter(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); setErr('');
    const out = await upload([file], 'presenter-'); setUploading(false); e.target.value = '';
    if (out[0]) setPresenterImg(out[0]);
  }
  async function onPickPlace(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []); if (!files.length) return;
    setUploading(true); setErr('');
    const out = await upload(files, 'place-'); setUploading(false); e.target.value = '';
    setPlaceImgs((p) => [...p, ...out]);
  }
  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); setErr('');
    const out = await upload([file], 'logo-'); setUploading(false); e.target.value = '';
    if (out[0]) { setLogoImg(out[0]); setLogo(true); }
  }
  function applyPreset(p: typeof PRESETS[number]) {
    setOutput('video');
    setHasPresenter(p.pres); setHasProduct(p.prod);
    setHasPlace((prev) => p.place || prev); // พรีเซ็ตเพิ่มสถานที่ได้ แต่ไม่ปลดที่ผู้ใช้ติ๊กไว้เอง
    setMood(p.mood); setConcept(p.concept); setShots([]);
    setActivePreset(p.id); // ไฮไลต์พรีเซ็ตที่เลือก
  }
  async function onVoiceFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); const out = await upload([file], 'voice-'); setUploading(false);
    if (out[0]) { setVoicePath(out[0].path); setVoiceLabel(T('อัพโหลด: ', 'Uploaded: ') + file.name); } e.target.value = '';
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
        if (!error) { setVoicePath(path); setVoiceLabel(T(`อัดเสียงแล้ว ${recSec} วิ`, `Recorded ${recSec}s`)); }
      };
      recRef.current = mr; mr.start(); setRecOn(true); setRecSec(0);
      timerRef.current = setInterval(() => setRecSec((s) => s + 1), 1000);
    } catch { setErr('เข้าถึงไมโครโฟนไม่ได้ — อนุญาตไมค์ก่อน'); }
  }
  async function draftScripts() {
    setDrafting(true); setDraftErr(''); setDrafts([]);
    const fd = new FormData(formRef.current!);
    const brief = [
      fd.get('bfName') && `สินค้า: ${fd.get('bfName')}`,
      fd.get('bfPrice') && `ราคา: ${fd.get('bfPrice')}`,
      fd.get('bfPoint') && `จุดขาย: ${fd.get('bfPoint')}`,
      brandDesc && `แบรนด์: ${brandDesc}`,
    ].filter(Boolean).join('\n');
    const conceptLabel = CONCEPTS.find((c) => c.id === concept)?.th ?? '';
    // เพศผู้พูด: โหมด AI ใช้เพศ avatar, โหมดอัพรูปใช้ค่าที่เลือก (อัตโนมัติ = ไม่บังคับ)
    const gender = hasPresenter ? (presenterMode === 'ai' ? avGender : (presenterGender.includes('อัตโนมัติ') ? '' : presenterGender)) : '';
    const res = await aiDraftScripts({ productInfo: brief, concept: conceptLabel, tone: mood, lang: scriptLang, count: 3, presenterGender: gender });
    setDrafting(false);
    if (res.error) { setDraftErr(res.error); return; }
    setDrafts(res.scripts ?? []);
  }
  // อ่านบรีฟปัจจุบันจากฟอร์ม (ส่งให้สตอรีบอร์ดตอนเจนภาพช็อต)
  function briefFor() {
    const fd = formRef.current ? new FormData(formRef.current) : null;
    return { name: String(fd?.get('bfName') ?? ''), point: String(fd?.get('bfPoint') ?? ''), brand_description: brandDesc };
  }

  const allImages = [...images.map((i) => i.path), ...pickedAssets];
  const extra = JSON.stringify({
    mood, image_text: { main: imgMain, sub: imgSub }, thumbnail, thumb_count: thumbCount, logo, logo_image: logoImg?.path ?? null,
    voice_detail: voiceMode === 'ai' ? { gender: vGender, age: vAge, tone: vTone, voice: vPick, signature: vSignature } : {},
    subjects: { presenter: hasPresenter, product: hasProduct, place: hasPlace },
    presenter: hasPresenter ? { mode: presenterMode, consent: consentPhoto, photo: presenterMode === 'upload' ? (presenterImg?.path ?? null) : null, avatar: presenterMode === 'ai' ? { gender: avGender, age: avAge, ethnicity: avEth } : null } : null,
    place: hasPlace ? { photos: placeImgs.map((i) => i.path) } : null,
    spoken_lang: spokenLang, presenter_gender: presenterGender, ui_lang: lang,
  });

  return (
    <form ref={formRef} action={createJobDraft} onSubmit={() => setSubmitting(true)} className="gen-wrap">
      <input type="hidden" name="format" value={output === 'image' ? 'image' : 'video'} />
      <input type="hidden" name="ratio" value={ratio} />
      <input type="hidden" name="concept" value={concept} />
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
        <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 4 }}>
          <button type="button" className="btn-ghost" style={{ padding: '5px 12px', borderRadius: 8, cursor: 'pointer', font: 'inherit', fontSize: 12.5 }}
            onClick={() => { if (confirm(T('ล้างค่าทั้งหมดแล้วเริ่มใหม่?', 'Clear everything and start over?'))) clearSaved(); }}>
            {T('↺ เริ่มใหม่ (ล้างค่า)', '↺ Start over (clear)')}
          </button>
        </div>
        {/* แบรนด์ (บนสุดเสมอ — โชว์ตลอดไม่ให้หายน่าตกใจ) */}
        <label className="field"><span>{T('สร้างให้แบรนด์ไหน', 'For which brand')}</span>
          <select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
            <option value="">{T('— ไม่ระบุ —', '— none —')}</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        {brands.length === 0 && (
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            {T('ยังไม่มีแบรนด์ที่บันทึกไว้ — ', 'No saved brands yet — ')}
            <a href="/brands" style={{ color: 'var(--yellow-deep)', fontWeight: 600 }}>{T('สร้างแบรนด์ที่นี่', 'create one here')}</a>
            {T(' (ถ้าเพิ่งสร้าง ลองรีเฟรชหน้า)', ' (if you just made one, refresh)')}
          </p>
        )}
        {brandId && brandDesc && (
          <div style={{ marginTop: 8, background: 'var(--yellow-soft)', border: '1px solid var(--yellow-deep)', borderRadius: 10, padding: '10px 14px', fontSize: 13.5 }}>
            <b>{T('รายละเอียดแบรนด์ (ใส่ในบทให้อัตโนมัติ):', 'Brand info (auto-added to script):')}</b> {brandDesc}
          </div>
        )}

        {/* ผลลัพธ์: วิดีโอ / รูปภาพ */}
        <span className="muted" style={{ fontSize: 14 }}>{T('อยากได้ผลลัพธ์แบบไหน', 'What do you want')}</span>
        <div className="seg" style={{ marginTop: 8 }}>
          {[['video', T('🎬 วิดีโอ', '🎬 Video')], ['image', T('🖼️ รูปภาพ', '🖼️ Images')]].map(([v, t]) => (
            <button type="button" key={v} className={output === v ? 'active' : ''} onClick={() => { setOutput(v as 'video' | 'image'); setShots([]); setActivePreset(''); }}>{t}</button>
          ))}
        </div>

        {/* เริ่มเร็ว (ไม่บังคับ) */}
        <div className="mini-label">{T('เริ่มเร็ว (ไม่บังคับ · กดแล้วปรับต่อได้)', 'Quick start (optional)')}</div>
        <div className="chips preset-row">
          {PRESETS.map((p) => (
            <button type="button" key={p.id} className={'chip preset' + (activePreset === p.id ? ' active' : '')} onClick={() => applyPreset(p)}>{activePreset === p.id ? '✓ ' : ''}{T(p.th, p.en)}</button>
          ))}
        </div>

        {/* องค์ประกอบในคลิป — เลือกได้หลายอย่าง ไม่ต้องครบ */}
        <div className="mini-label">{output === 'image' ? T('ในภาพมีอะไรบ้าง (เลือกได้หลายอย่าง)', 'What\'s in the image (pick any)') : T('ในวิดีโอมีอะไรบ้าง (เลือกได้หลายอย่าง)', 'What\'s in the video (pick any)')}</div>
        <div className="chips">
          <button type="button" className={'chip' + (hasPresenter ? ' active' : '')} onClick={() => { setHasPresenter(!hasPresenter); setShots([]); setActivePreset(''); }}>{hasPresenter ? '✓ ' : ''}{T('พรีเซนเตอร์ (คน)', 'Presenter')}</button>
          <button type="button" className={'chip' + (hasProduct ? ' active' : '')} onClick={() => { setHasProduct(!hasProduct); setShots([]); setActivePreset(''); }}>{hasProduct ? '✓ ' : ''}{T('สินค้า', 'Product')}</button>
          <button type="button" className={'chip' + (hasPlace ? ' active' : '')} onClick={() => { setHasPlace(!hasPlace); setShots([]); setActivePreset(''); }}>{hasPlace ? '✓ ' : ''}{T('สถานที่ / บรรยากาศ', 'Place / scene')}</button>
        </div>
        {!hasPresenter && !hasProduct && !hasPlace && (
          <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>{T('เลือกอย่างน้อย 1 อย่าง หรือปล่อยว่างให้ AI คิดจากบรีฟก็ได้', 'Pick at least one, or leave empty and let AI decide from the brief')}</div>
        )}

        {/* พรีเซนเตอร์ — โผล่เมื่อเลือก */}
        {hasPresenter && (
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
                <div className="chips">{AV_GENDER.map((g) => <button type="button" key={g} className={'chip' + (avGender === g ? ' active' : '')} onClick={() => setAvGender(g)}>{tv(g)}</button>)}</div>
                <div className="mini-label">{T('ช่วงอายุ', 'Age')}</div>
                <div className="chips">{AV_AGE.map((g) => <button type="button" key={g} className={'chip' + (avAge === g ? ' active' : '')} onClick={() => setAvAge(g)}>{tv(g)}</button>)}</div>
                <div className="mini-label">{T('เชื้อชาติ / ลุค', 'Ethnicity / look')}</div>
                <div className="chips">{AV_ETH.map((g) => <button type="button" key={g} className={'chip' + (avEth === g ? ' active' : '')} onClick={() => setAvEth(g)}>{tv(g)}</button>)}</div>
              </div>
            )}
            {presenterMode === 'upload' && (
              <>
                <label className="field" style={{ marginTop: 10 }}><span>{T('รูปพรีเซนเตอร์ (คน · 1 รูป)', 'Presenter photo (person · 1)')}</span></label>
                <div className="uploads">
                  {presenterImg ? (
                    <div style={{ position: 'relative' }}>
                      <img className="up-thumb" src={presenterImg.preview} alt="" />
                      <button type="button" onClick={() => { setPresenterImg(null); setConsentPhoto(false); }} style={{ position: 'absolute', top: -6, right: -6, background: '#1A1A17', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer' }}>×</button>
                    </div>
                  ) : (
                    <label className="up-add">{uploading ? '…' : '+'}<input type="file" accept="image/*" hidden onChange={onPickPresenter} /></label>
                  )}
                </div>
                {presenterImg && (
                  <label className="consent" style={{ marginTop: 8 }}>
                    <input type="checkbox" checked={consentPhoto} onChange={(e) => setConsentPhoto(e.target.checked)} />
                    <span className="ct">{T('ฉันมีสิทธิ์ใช้รูปพรีเซนเตอร์นี้ และรับผิดชอบเรื่องลิขสิทธิ์เอง (ไม่ใช้รูปดารา/คนอื่นที่ไม่ได้ขออนุญาต)', 'I have rights to this presenter photo and accept copyright responsibility')}</span>
                  </label>
                )}
              </>
            )}
          </>
        )}

        {/* สินค้า — โผล่เมื่อเลือก */}
        {hasProduct && (
          <>
            <label className="field" style={{ marginTop: 10 }}><span>{T('รูปสินค้า (เลือกจากคลังแบรนด์ หรือกด + เพื่ออัพใหม่)', 'Product photos (pick from brand library or tap + to upload)')}</span></label>
            <div className="uploads">
              {/* รูปแบรนด์ที่เลือก — โผล่ในช่องสินค้าเลย ลบได้ */}
              {brandAssets.filter((a) => pickedAssets.includes(a.path)).map((a) => (
                <div key={a.path} style={{ position: 'relative' }}>
                  <img className="up-thumb" src={a.url} alt="" />
                  <button type="button" title={T('เอาออก', 'Remove')} onClick={() => setPickedAssets((p) => p.filter((x) => x !== a.path))} style={{ position: 'absolute', top: -6, right: -6, background: '#1A1A17', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer' }}>×</button>
                </div>
              ))}
              {/* รูปที่อัพเอง */}
              {images.map((im, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img className="up-thumb" src={im.preview} alt="" />
                  <button type="button" title={T('เอาออก', 'Remove')} onClick={() => setImages(images.filter((_, j) => j !== i))} style={{ position: 'absolute', top: -6, right: -6, background: '#1A1A17', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer' }}>×</button>
                </div>
              ))}
              <label className="up-add">{uploading ? '…' : '+'}<input type="file" accept="image/*" multiple hidden onChange={onPick} /></label>
            </div>
            {/* คลังรูปแบรนด์ — กดเพื่อเพิ่ม/เอาออกจากช่องสินค้า */}
            {brandId && brandAssets.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>{T('คลังรูปในแบรนด์นี้ — กดรูปเพื่อเพิ่มเป็นรูปสินค้า', 'Brand library — tap an image to add it as a product photo')}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {brandAssets.map((a) => {
                    const picked = pickedAssets.includes(a.path);
                    return (
                      <button type="button" key={a.path} onClick={() => setPickedAssets((p) => picked ? p.filter((x) => x !== a.path) : [...p, a.path])}
                        style={{ position: 'relative', padding: 0, border: picked ? '2.5px solid var(--yellow-deep)' : '2.5px solid transparent', borderRadius: 10, cursor: 'pointer', background: 'none', opacity: picked ? 1 : 0.6, lineHeight: 0 }}>
                        <img src={a.url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                        {picked && <span style={{ position: 'absolute', top: 2, right: 2, background: 'var(--yellow-deep)', color: '#3A2E00', borderRadius: '50%', width: 18, height: 18, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* สถานที่ / บรรยากาศ — โผล่เมื่อเลือก */}
        {hasPlace && (
          <>
            <label className="field" style={{ marginTop: 10 }}><span>{T('รูปสถานที่ (ใส่กี่รูปก็ได้ · เช่น ห้องอาหาร ห้องนอน ล็อบบี้)', 'Place photos (any number · e.g. dining, bedroom, lobby)')}</span></label>
            <div className="uploads">
              {placeImgs.map((im, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img className="up-thumb" src={im.preview} alt="" />
                  <button type="button" onClick={() => setPlaceImgs(placeImgs.filter((_, j) => j !== i))} style={{ position: 'absolute', top: -6, right: -6, background: '#1A1A17', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer' }}>×</button>
                </div>
              ))}
              <label className="up-add">{uploading ? '…' : '+'}<input type="file" accept="image/*" multiple hidden onChange={onPickPlace} /></label>
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>{T('ไม่มีรูปก็ได้ — พิมพ์บรรยายสถานที่ในช่อง “รายละเอียด / บรีฟ” ด้านล่างได้เลย', 'No photo? Just describe the place in the “Details / brief” box below.')}</p>
          </>
        )}

        {/* platform / ratio */}
        <div className="mini-label">{T('ลงที่ไหน (ตั้งสัดส่วน+ความยาวให้)', 'Post where (sets size + length)')}</div>
        <div className="plat-grid">
          {PLATFORMS.map((p) => (
            <button type="button" key={p.id} className={'plat' + (ratio === p.id ? ' active' : '')} onClick={() => pickPlatform(p.id)}>
              <span className="plat-top">{T(p.th, p.en)} · {p.id}</span>
              <span className="plat-sub">{p.sub}</span>
            </button>
          ))}
        </div>

        {isImage ? (
          <>
            {/* image text */}
            <label className="field"><span>{T('ข้อความหลัก (พาดหัวใหญ่)', 'Main text (headline)')}</span>
              <input type="text" name="bfName" value={imgMain} onChange={(e) => setImgMain(e.target.value)} placeholder="เช่น ลด 50% วันนี้เท่านั้น" /></label>
            <label className="field"><span>{T('ข้อความรอง (บรรทัดเล็ก)', 'Secondary text')}</span>
              <input type="text" value={imgSub} onChange={(e) => setImgSub(e.target.value)} placeholder={T('เช่น ทักแชทสั่งเลย ส่งฟรีทั่วไทย', 'e.g. Chat to order · free shipping')} /></label>
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
                  {['ไทย', 'อังกฤษ', 'ไทย + ซับอังกฤษ', 'จีน'].map((x) => <option key={x} value={x}>{tv(x)}</option>)}
                </select></label>
              {hasPresenter && (
                <label className="field"><span>{T('เพศพรีเซนเตอร์', 'Presenter gender')}</span>
                  <select value={presenterGender} onChange={(e) => setPresenterGender(e.target.value)}>
                    {['อัตโนมัติ (ตามรูป)', 'หญิง', 'ชาย'].map((x) => <option key={x} value={x}>{tv(x)}</option>)}
                  </select></label>
              )}
            </div>

            {/* mood */}
            <div className="mini-label">{T('โทน / อารมณ์วิดีโอ', 'Tone / mood')}</div>
            <div className="chips">{MOODS.map((m) => <button type="button" key={m} className={'chip' + (mood === m ? ' active' : '')} onClick={() => setMood(m)}>{tv(m)}</button>)}</div>
          </>
        )}

        {/* brief (video) — ช่องเดียวจบ ใส่อะไรก็ได้ตามงาน */}
        {!isImage && (
          <>
            <label className="field"><span>{T('รายละเอียด / บรีฟ (อยากบอกอะไรบ้าง)', 'Details / brief (anything to say)')}</span>
              <textarea name="bfPoint" rows={3} value={briefText} onChange={(e) => setBriefText(e.target.value)} placeholder={T('เช่น เซรั่มหน้าใส Glow 199 บาท · ใช้ 2 สัปดาห์หน้าใสขึ้น · ลดถึง 30 มิ.ย. / หรือ รีสอร์ทริมทะเล ห้องพักเริ่ม 1,500 · มีสระว่ายน้ำ', 'e.g. Glow serum 199 THB · brighter in 2 weeks · sale until Jun 30 / or beachfront resort, rooms from 1,500, pool')} /></label>

            <div className="mini-label">{T('ภาษาของบทพูด', 'Script language')}</div>
            <div className="seg">
              {[['th', 'ไทย'], ['en', T('อังกฤษ', 'English')]].map(([v, t]) => (
                <button type="button" key={v} className={scriptLang === v ? 'active' : ''} onClick={() => setScriptLang(v as L)}>{t}</button>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <button type="button" className="btn-ghost" style={{ padding: '10px 18px', borderRadius: 10, cursor: 'pointer', font: 'inherit', fontWeight: 600 }} onClick={draftScripts} disabled={drafting}>
                ✦ {drafting ? T('AI กำลังคิด…', 'AI thinking…') : T('ให้ AI ร่างบทให้ 3 แบบ', 'Let AI draft 3 scripts')}
              </button>
            </div>
            {draftErr && <p className="err">{draftErr}</p>}
            {drafts.length > 0 && (
              <div className="grid" style={{ marginTop: 10 }}>
                {drafts.map((d, i) => (
                  <div key={i} className="card" style={{ padding: 14, cursor: 'pointer', borderColor: script === d.text ? 'var(--ink)' : 'var(--line)' }} onClick={() => setScript(d.text)}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--yellow-deep)' }}>{d.hook}</div>
                    <div style={{ fontSize: 13.5, marginTop: 4, whiteSpace: 'pre-wrap' }}>{d.text}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{script === d.text ? T('✓ เลือกบทนี้แล้ว', '✓ Selected') : T('แตะเพื่อเลือกบทนี้', 'Tap to pick this')}</div>
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
              <div><button type="button" className={'rec-btn' + (recOn ? ' on' : '')} onClick={toggleRec}><span className="rec-dot" />{recOn ? T(`กำลังอัด… ${recSec} วิ (แตะหยุด)`, `Recording… ${recSec}s (tap to stop)`) : T('แตะเพื่อเริ่มอัด', 'Tap to start recording')}</button>{voiceLabel && <p className="ok">{voiceLabel}</p>}</div>
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
                  <div className="chips">{V_GENDER.map((g) => <button type="button" key={g} className={'chip' + (vGender === g ? ' active' : '')} onClick={() => setVGender(g)}>{tv(g)}</button>)}</div>
                  <div className="mini-label">{T('ช่วงอายุเสียง', 'Voice age')}</div>
                  <div className="chips">{V_AGE.map((g) => <button type="button" key={g} className={'chip' + (vAge === g ? ' active' : '')} onClick={() => setVAge(g)}>{tv(g)}</button>)}</div>
                  <div className="mini-label">{T('โทนเสียง', 'Voice tone')}</div>
                  <div className="chips">{V_TONE.map((g) => <button type="button" key={g} className={'chip' + (vTone === g ? ' active' : '')} onClick={() => setVTone(g)}>{tv(g)}</button>)}</div>
                  <div className="mini-label">{T('เลือกเสียง', 'Pick a voice')}</div>
                  <div className="voice-cards">
                    {VOICES.map((v) => (
                      <div key={v.id} className={'vcard' + (vPick === v.id ? ' active' : '')} onClick={() => setVPick(v.id)}>
                        <div className="vplay">▶</div><div className="vn">{v.n}</div><div className="vd">{tv(v.d)}</div>
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
              {logo && (
                <div style={{ padding: '4px 0 8px' }}>
                  <span className="mini-label" style={{ marginTop: 0 }}>{T('อัพไฟล์โลโก้ (PNG พื้นใสได้ยิ่งดี)', 'Upload logo (PNG with transparent bg preferred)')}</span>
                  <div className="uploads">
                    {logoImg ? (
                      <div style={{ position: 'relative' }}>
                        <img className="up-thumb" src={logoImg.preview} alt="" style={{ background: '#eee' }} />
                        <button type="button" onClick={() => setLogoImg(null)} style={{ position: 'absolute', top: -6, right: -6, background: '#1A1A17', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer' }}>×</button>
                      </div>
                    ) : (
                      <label className="up-add">{uploading ? '…' : '+'}<input type="file" accept="image/*" hidden onChange={onPickLogo} /></label>
                    )}
                  </div>
                </div>
              )}
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

        {/* storyboard (video) — เลือกจำนวนช็อต + เจนภาพตัวอย่างต่อช็อต + รีเจน */}
        {!isImage && (
          <Storyboard
            shots={shots}
            setShots={setShots}
            ratio={ratio}
            mood={mood}
            duration={duration}
            subjects={{ presenter: hasPresenter, product: hasProduct, place: hasPlace }}
            briefFor={briefFor}
            productPath={images[0]?.path ?? pickedAssets[0] ?? null}
            presenterPath={presenterMode === 'upload' ? (presenterImg?.path ?? null) : null}
            avatar={hasPresenter && presenterMode === 'ai' ? { gender: avGender, age: avAge, ethnicity: avEth } : null}
          />
        )}

        {/* consent */}
        <label className="consent">
          <input type="checkbox" name="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span className="ct"><b>{T('ยินยอมให้ GenIt นำผลงานไปโปรโมท → รับโบนัส +3 เครดิตฟรีทันที!', 'Let GenIt feature this → get +3 free credits!')}</b> {T('(งานฟรีมีลายน้ำ เก็บ 15 วัน)', '(free work watermarked, kept 15 days)')}</span>
        </label>

        <div className="creditbar">
          <div><div className="muted" style={{ fontSize: 13 }}>{T('ใช้เครดิตประมาณ', 'Estimated credits')}</div><div className="cc">{credits}</div></div>
          <button className="btn btn-lg" disabled={uploading || submitting}>
            {submitting
              ? <><span className="spinner" style={{ width: 16, height: 16, marginRight: 8, verticalAlign: 'middle', display: 'inline-block' }} />{T('กำลังบันทึกงาน…', 'Saving job…')}</>
              : <>{isImage ? T('สร้างรูป', 'Generate images') : T('สร้างวิดีโอ', 'Generate video')} →</>}
          </button>
        </div>
        {err && <p className="err">{err}</p>}
        <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>* {T('บันทึกเป็นงานจริง — การเจน AI จะต่อในเฟสถัดไป', 'Saved as a real job — AI generation comes next')}</p>
      </div>

      {/* preview */}
      <div className="preview-panel">
        <div className="card" style={{ padding: 16 }}>
          <div className="pv-head">
            <span className="pvt">{T('ตัวอย่าง', 'PREVIEW')} ({ratio})</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
          </div>
          <div className="pv-frame" style={{ width: pInfo.w, maxWidth: '100%', aspectRatio: ratio.replace(':', ' / ') }}>
            {firstPreview ? <img src={firstPreview} alt="" /> : <div className="pv-empty">📹<br />{isImage ? T('รูปจะขึ้นตรงนี้', 'Image here') : T('วิดีโอจะขึ้นตรงนี้', 'Video here')}</div>}
            {logo && <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--yellow)', color: '#000', borderRadius: 6, padding: '2px 7px', fontSize: 11, fontWeight: 700 }}>LOGO</div>}
            {cta && !isImage && <div style={{ position: 'absolute', bottom: 34, left: '50%', transform: 'translateX(-50%)', background: 'var(--yellow)', color: '#000', borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{T('ทักแชทสั่งเลย →', 'Chat to order →')}</div>}
            {(subtitles || isImage) && (imgMain || !isImage) && <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, textAlign: 'center', color: '#fff', fontSize: 12, textShadow: '0 1px 3px #000' }}>{isImage ? (imgMain || T('ข้อความบนรูป', 'Text on image')) : T('ซับไตเติลตัวอย่าง', 'Sample subtitle')}</div>}
          </div>
          <div className="pv-cap">{isImage ? `${count} ${T('รูป', 'images')}` : `${duration} ${T('วิ', 's')} · ${count} ${T('คลิป', 'clips')}`} · ~{credits} {T('เครดิต', 'cr')}</div>
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
