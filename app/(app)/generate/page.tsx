import { createClient } from '@/lib/supabase/server';
import GenerateForm from '@/components/GenerateForm';

export const dynamic = 'force-dynamic';

export default async function GeneratePage() {
  const supabase = await createClient();
  const { data: brands } = await supabase.from('brands').select('id,name').order('created_at');

  return (
    <>
      <div className="eyebrow">สร้างวิดีโอ</div>
      <h1>บรีฟงานใหม่</h1>
      <p className="muted">เลือกรูปแบบ อัพรูปสินค้า แล้วกรอกบรีฟ — ระบบจะบันทึกเป็นงานจริงในบัญชีคุณ</p>
      <GenerateForm brands={brands ?? []} />
    </>
  );
}
