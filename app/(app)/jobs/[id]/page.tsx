import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import JobRunner from '@/components/JobRunner';

export const dynamic = 'force-dynamic';

const FORMAT_TH: Record<string, string> = {
  ugc: 'พรีเซนเตอร์พูด', hand: 'มือถือสินค้า', food: 'อาหาร/ขนม', product: 'โชว์สินค้า', image: 'สร้างรูป',
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
      <Link href="/history" className="muted" style={{ fontSize: 14 }}>← ประวัติงาน</Link>
      <h1 style={{ marginTop: 8 }}>{FORMAT_TH[job.format] ?? job.format}</h1>
      <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>
        {job.ratio}{job.duration_sec ? ` · ${job.duration_sec} วิ` : ''} · {job.count} ชิ้น
        {job.brief?.name ? ` · ${job.brief.name}` : ''} · ~{job.credits_cost} เครดิต
      </div>

      <JobRunner jobId={job.id} initialStatus={job.status} isImage={job.type === 'image'} />
    </>
  );
}
