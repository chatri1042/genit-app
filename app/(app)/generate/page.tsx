import { createClient } from '@/lib/supabase/server';
import GenerateForm from '@/components/GenerateForm';
import PageChar from '@/components/PageChar';
import TL from '@/components/TL';

export const dynamic = 'force-dynamic';

export default async function GeneratePage() {
  const supabase = await createClient();
  const { data: brands } = await supabase.from('brands').select('id,name').order('created_at');

  return (
    <>
      <div className="eyebrow"><TL th="สร้างวิดีโอ" en="Create video" /></div>
      <h1><TL th="บรีฟงานใหม่" en="New brief" /></h1>
      <p className="muted"><TL th="เลือกสิ่งที่อยากได้ อัพรูป แล้วกรอกบรีฟ — ระบบจะบันทึกเป็นงานจริงในบัญชีคุณ" en="Pick what you want, upload photos, fill the brief — it's saved as a real job in your account." /></p>
      <GenerateForm brands={brands ?? []} />
      <PageChar name="skate" side="left" width={260} />
    </>
  );
}
