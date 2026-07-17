import { createClient } from '@/lib/supabase/server';
import { createJobDraft } from '@/app/actions';

export const dynamic = 'force-dynamic';

// เวอร์ชันย่อของหน้าสร้างวิดีโอ — บันทึกงานเป็น draft ลง DB จริง
// (หน้าตาเต็ม + ต่อ AI จริง เป็นงานเฟสถัดไป)
export default async function GeneratePage() {
  const supabase = await createClient();
  const { data: brands } = await supabase.from('brands').select('id,name').order('created_at');

  return (
    <>
      <div className="eyebrow">สร้างวิดีโอ</div>
      <h1 style={{ marginTop: 4 }}>บรีฟงานใหม่</h1>
      <p className="muted">กรอกบรีฟแล้วบันทึกเป็นงานร่าง — เฟสถัดไปจะต่อ AI ให้เจนจริง</p>

      <form action={createJobDraft} className="card" style={{ marginTop: 18, maxWidth: 620 }}>
        <div className="grid grid-2">
          <label className="field"><span>รูปแบบ</span>
            <select name="format" defaultValue="ugc">
              <option value="ugc">พรีเซ็นเตอร์พูด (UGC)</option>
              <option value="hand">มือถือสินค้า</option>
              <option value="food">อาหาร</option>
              <option value="product">โชว์สินค้า</option>
              <option value="image">สร้างรูปอย่างเดียว</option>
            </select>
          </label>
          <label className="field"><span>สัดส่วน</span>
            <select name="ratio" defaultValue="9:16">
              <option value="9:16">แนวตั้ง 9:16</option>
              <option value="1:1">จัตุรัส 1:1</option>
              <option value="16:9">แนวนอน 16:9</option>
            </select>
          </label>
        </div>
        <div className="grid grid-2">
          <label className="field"><span>คอนเซ็ปต์</span>
            <select name="concept" defaultValue="flash_sale">
              <option value="flash_sale">ลดพิเศษ</option>
              <option value="review">รีวิว/บอกต่อ</option>
              <option value="new_arrival">สินค้าใหม่</option>
              <option value="how_to">วิธีใช้</option>
            </select>
          </label>
          <label className="field"><span>ความยาว (วินาที)</span>
            <input type="number" name="duration" defaultValue={15} min={5} max={60} />
          </label>
        </div>
        {brands && brands.length > 0 && (
          <label className="field"><span>แบรนด์</span>
            <select name="brand_id" defaultValue="">
              <option value="">— ไม่ระบุ —</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
        )}
        <label className="field"><span>ชื่อสินค้า</span><input type="text" name="bfName" placeholder="เช่น น้ำพริกกากหมู" /></label>
        <div className="grid grid-2">
          <label className="field"><span>ราคา</span><input type="text" name="bfPrice" placeholder="เช่น 89 บาท" /></label>
          <label className="field"><span>โปรถึงวันไหน</span><input type="text" name="bfPromo" placeholder="เช่น ถึงสิ้นเดือน" /></label>
        </div>
        <label className="field"><span>จุดขาย</span><textarea name="bfPoint" rows={2} placeholder="เช่น หอม กรอบ ทำสด ส่งไว" /></label>

        <label className="row" style={{ marginTop: 16, gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" name="consent" />
          <span className="muted" style={{ fontSize: 14 }}>ยินยอมให้ GenIt นำผลงานไปใช้โปรโมท (งานทดลองฟรีมีลายน้ำ เก็บ 15 วัน)</span>
        </label>

        <button className="btn" style={{ marginTop: 18 }}>บันทึกงาน (ร่าง)</button>
      </form>
    </>
  );
}
