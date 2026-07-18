import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import JobRunner from '@/components/JobRunner';
import TL from '@/components/TL';

export const dynamic = 'force-dynamic';

const FORMAT_TH: Record<string, { th: string; en: string }> = {
  video: { th: 'วิดีโอ', en: 'Video' }, image: { th: 'รูปภาพ', en: 'Images' },
  ugc: { th: 'พรีเซนเตอร์พูด', en: 'Talking presenter' }, hand: { th: 'มือถือสินค้า', en: 'Hands only' }, food: { th: 'อาหาร/ขนม', en: 'Food' }, product: { th: 'โชว์สินค้า', en: 'Product' },
};

export default async function JobPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: job } = await supabase
    .from('jobs')
    .select('id,type,format,ratio,duration_sec,count,concept,script,status,credits_cost,brief')
    .eq('id', params.id)
    .single();
  if (!job) notFound();

  return (
    <>
      <Link href="/history" className="muted" style={{ fontSize: 14 }}>← <TL th="ประวัติงาน" en="History" /></Link>
      <h1 style={{ marginTop: 8 }}>{FORMAT_TH[job.format] ? <TL th={FORMAT_TH[job.format].th} en={FORMAT_TH[job.format].en} /> : job.format}</h1>
      <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>
        {job.ratio}{job.duration_sec ? ` · ${job.duration_sec}${''}` : ''}{job.duration_sec ? <TL th=" วิ" en="s" /> : ''} · {job.count} <TL th="ชิ้น" en="pcs" />
        {job.brief?.name ? ` · ${job.brief.name}` : ''} · ~{job.credits_cost} <TL th="เครดิต" en="cr" />
      </div>

      <JobRunner jobId={job.id} initialStatus={job.status} isImage={job.type === 'image'} />
    </>
  );
}
