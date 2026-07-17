import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BrandAssets from '@/components/BrandAssets';

export const dynamic = 'force-dynamic';

export default async function BrandDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const supabase = await createClient();
  const { data: brand } = await supabase.from('brands').select('id,name,color').eq('id', id).single();
  if (!brand) notFound();

  const { data: assets } = await supabase.from('assets').select('id,url')
    .eq('brand_id', id).eq('kind', 'product_image').order('created_at', { ascending: false });
  const paths = (assets ?? []).map((a) => a.url);
  let initial: { id: string; path: string; url: string }[] = [];
  if (paths.length) {
    const { data: signed } = await supabase.storage.from('uploads').createSignedUrls(paths, 3600);
    initial = (assets ?? []).map((a, i) => ({ id: a.id, path: a.url, url: signed?.[i]?.signedUrl ?? '' }));
  }

  return (
    <>
      <Link href="/brands" className="muted" style={{ fontSize: 14 }}>‹ กลับไปหน้าแบรนด์</Link>
      <div className="row" style={{ gap: 14, marginTop: 10 }}>
        <span style={{ width: 46, height: 46, borderRadius: 12, background: brand.color, flex: 'none' }} />
        <h1 style={{ margin: 0 }}>{brand.name}</h1>
      </div>
      <p className="muted" style={{ marginTop: 8 }}>อัพรูปสินค้าที่ใช้ประจำของแบรนด์นี้ไว้ที่นี่ — เวลาสร้างวิดีโอจะเลือกใช้ได้เลยไม่ต้องอัพซ้ำ</p>

      <BrandAssets brandId={brand.id} initial={initial} />
    </>
  );
}
