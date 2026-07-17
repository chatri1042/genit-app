# GenIt — โครงหลังบ้าน (backend starter)

โค้ดเริ่มต้นที่ต่อกับฐานข้อมูล Supabase **genit** ที่ตั้งไว้แล้ว
(ref: `sopsijsmdqauemctinab` · region Tokyo · แผนฟรี)

ทุกอย่างในนี้ยัง **ไม่มีค่าใช้จ่าย** จนกว่าจะเริ่มเจนวิดีโอจริงผ่าน fal.ai

---

## โครงสร้าง

```
genit-app/
├─ app/                     หน้าเว็บ (Next.js App Router)
│  ├─ page.tsx              หน้าเช็กสถานะ: เครดิตคงเหลือ + แพ็กราคาจาก DB
│  └─ scripts/page.tsx      เดโม: บรีฟสินค้า -> AI ร่างบท 3 แบบ
├─ lib/
│  ├─ supabase/             client (เบราว์เซอร์) / server / admin
│  ├─ credits.ts            getCreditBalance, spendCredits, grantCredits
│  └─ storage.ts            อัพไฟล์เข้าคลัง + signed URL
├─ supabase/functions/
│  └─ write-scripts/        Edge Function เรียก Gemini Flash (ฟรี) ร่างบท
├─ remotion/                ชั้นประกอบวิดีโอ (ซับ/โลโก้/CTA/intro-outro)
├─ middleware.ts            รีเฟรช session อัตโนมัติ
└─ .env.example             ก๊อปเป็น .env.local แล้วใส่ค่า
```

## เริ่มใช้งาน

```bash
cd genit-app
npm install
cp .env.example .env.local     # แล้วเปิดใส่ค่า (ดูหัวข้อถัดไป)
npm run dev                     # เปิด http://localhost:3000
```

### หน้าที่ใช้งานได้จริงแล้ว (ต่อฐานข้อมูล Supabase)
- `/login` — สมัคร/เข้าสู่ระบบด้วยอีเมล (Supabase Auth จริง)
- `/dashboard` — เครดิตคงเหลือ + จำนวนแบรนด์/งาน + แพ็กราคา (อ่านจาก DB จริง)
- `/brands` — สร้าง/ดูแบรนด์ (เขียนลงตาราง brands จริง)
- `/generate` — บรีฟงาน แล้วบันทึกเป็นงานร่างลงตาราง jobs (trigger ตั้งวันหมดอายุ 15 วันให้เอง)
- `/history` — งานทั้งหมดของผู้ใช้ (อ่านจาก jobs, RLS คุมให้เห็นแค่ของตัวเอง)
- `/scripts` — ร่างบทด้วย Gemini (ต้อง deploy edge function + ใส่คีย์ก่อน)

> 💡 **ทดสอบล็อกอินให้ไว:** ค่าเริ่มต้น Supabase จะบังคับยืนยันอีเมลก่อน — ช่วงพัฒนาให้ปิดที่
> Dashboard → Authentication → Sign In / Providers → Email → ปิด "Confirm email"
> แล้วสมัครในหน้า /login จะเข้าใช้งานได้ทันทีไม่ต้องยืนยันเมล

หน้า `/dashboard` จะดึงแพ็กราคาจาก DB มาโชว์ — ถ้าเห็น trial/starter/pro/biz แสดงว่าต่อ Supabase ติดแล้ว

---

## ⚠️ สิ่งที่ "คุณต้องทำเอง" (ผมใส่ให้ไม่ได้ เพราะเป็นรหัสลับ)

### 1) คีย์ Supabase — 2 ค่า (ฟรี)
Dashboard → Project Settings → **API** แล้วคัดลอกลง `.env.local`:
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = ค่า **anon public**
- `SUPABASE_SERVICE_ROLE_KEY` = ค่า **service_role** (ความลับ ห้ามหลุดไป client)

### 2) คีย์ Google Gemini (ฟรี — ใช้ร่างบท)
- ไปที่ https://aistudio.google.com/apikey → **Create API key** (ฟรี ไม่ต้องผูกบัตร)
- ใส่ลง `.env.local` ที่ `GOOGLE_AI_API_KEY`
- แล้วตั้งให้ Edge Function เห็นด้วย:
  ```bash
  npx supabase login
  npx supabase link --project-ref sopsijsmdqauemctinab
  npx supabase secrets set GOOGLE_AI_API_KEY=คีย์ของคุณ
  npx supabase functions deploy write-scripts
  ```

### 3) เปิดระบบล็อกอิน (Auth) — ทำในหน้า Supabase
Dashboard → **Authentication** → Providers:
- **Email** = เปิดอยู่แล้ว (ฟรี ใช้ได้เลย เหมาะช่วงทดสอบ)
- **Phone (OTP กันสแปม 1 สิทธิ์/เบอร์)** = ต้องผูก **ผู้ให้บริการ SMS** ก่อน (Twilio / Vonage / MessageBird)
  ค่าส่ง SMS มีค่าใช้จ่ายต่อข้อความ — ค่อยเปิดตอนใกล้เปิดจริง แล้วเอา API key ของผู้ให้บริการมาใส่ในหน้านั้นเอง
- **LINE** = Supabase ไม่มีปุ่มสำเร็จรูป ต้องต่อผ่าน generic OAuth / custom — ทำภายหลังได้

> โครงตาราง `profiles.phone` + `free_trial_used` และ trigger สร้างโปรไฟล์อัตโนมัติ รองรับ phone OTP ไว้ให้แล้ว พอเปิด SMS provider ก็ใช้ได้ทันที

### 4) fal.ai (คุณมีบัญชีแล้ว — ใส่ตอนพร้อมจ่ายค่าเจน)
- ใส่ `FAL_KEY` ใน `.env.local` เมื่อพร้อมทดสอบเจนวิดีโอ/เสียง/รูป

### 5) Stripe (ไว้ตอนเปิดขายเครดิต)
- ช่วงพัฒนาใช้ **test key** ก่อนได้ ยังไม่ต้องจ่ายอะไร

---

## ลำดับที่แนะนำ (ไต่จากฟรีไปจ่าย)
1. ใส่คีย์ Supabase (ข้อ 1) → หน้า `/` โชว์ราคาได้ ✅
2. ใส่ Gemini + deploy function (ข้อ 2) → หน้า `/scripts` ร่างบทได้จริง ฟรี ✅
3. เปิด Email auth ทดสอบล็อกอิน + เครดิต (ข้อ 3)
4. พอพร้อมจ่าย: ใส่ FAL_KEY ต่อชั้นเสียง→วิดีโอ (ดู genit-adapters.ts / genit-pipeline.ts)
5. เปิด phone OTP + Stripe ตอนใกล้เปิดจริง

## หมายเหตุความปลอดภัย
- `.env.local` อย่า commit ขึ้น git (มีในค่าเริ่มต้นของ Next.js `.gitignore` อยู่แล้ว)
- `service_role` และ `FAL_KEY` ใช้ฝั่งเซิร์ฟเวอร์เท่านั้น
