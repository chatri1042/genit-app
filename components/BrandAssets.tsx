'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLang } from './LanguageProvider';

type Asset = { id: string; path: string; url: string };

export default function BrandAssets({ brandId, initial }: { brandId: string; initial: Asset[] }) {
  const supabase = createClient();
  const { lang } = useLang();
  const T = (th: string, en: string) => (lang === 'th' ? th : en);
  const [assets, setAssets] = useState<Asset[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true); setErr('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErr(T('ต้องล็อกอินก่อน', 'Please log in first')); setUploading(false); return; }
    for (const file of files) {
      const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
      const up = await supabase.storage.from('uploads').upload(path, file);
      if (up.error) { setErr(T('อัพไม่สำเร็จ: ', 'Upload failed: ') + up.error.message); continue; }
      const ins = await supabase.from('assets').insert({ user_id: user.id, brand_id: brandId, kind: 'product_image', url: path }).select('id').single();
      const { data: signed } = await supabase.storage.from('uploads').createSignedUrl(path, 3600);
      setAssets((prev) => [{ id: ins.data?.id ?? path, path, url: signed?.signedUrl ?? URL.createObjectURL(file) }, ...prev]);
    }
    setUploading(false); e.target.value = '';
  }

  async function remove(a: Asset) {
    await supabase.from('assets').delete().eq('id', a.id);
    await supabase.storage.from('uploads').remove([a.path]);
    setAssets((prev) => prev.filter((x) => x.id !== a.id));
  }

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h2 style={{ color: 'var(--ink)', fontWeight: 600, fontSize: 17 }}>{T('รูปสินค้าประจำแบรนด์', 'Brand product photos')}</h2>
      <div className="uploads" style={{ marginTop: 12 }}>
        {assets.map((a) => (
          <div key={a.id} style={{ position: 'relative' }}>
            <img className="up-thumb" src={a.url} alt="" />
            <button type="button" onClick={() => remove(a)}
              style={{ position: 'absolute', top: -6, right: -6, background: '#1A1A17', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer' }}>×</button>
          </div>
        ))}
        <label className="up-add">{uploading ? '…' : '+'}<input type="file" accept="image/*" multiple hidden onChange={onPick} /></label>
      </div>
      {err && <p className="err">{err}</p>}
      {assets.length === 0 && !uploading && <p className="muted" style={{ fontSize: 14, marginTop: 8 }}>{T('ยังไม่มีรูป — กด + เพื่ออัพรูปสินค้าที่ใช้บ่อย', 'No photos yet — tap + to upload your frequently-used product photos')}</p>}
    </div>
  );
}
