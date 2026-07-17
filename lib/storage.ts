import { createClient } from './supabase/server';

// อัพไฟล์เข้าคลัง โดยบังคับพาธขึ้นต้นด้วย uid ของผู้ใช้ (ให้ RLS ของ Storage คุ้มครอง)
// bucket: 'uploads' (ไฟล์ผู้ใช้) | 'outputs' (ผลลัพธ์ระบบ)
export async function uploadUserFile(
  bucket: 'uploads' | 'outputs',
  file: File | Blob,
  filename: string,
): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ต้องล็อกอินก่อนอัพไฟล์');

  const path = `${user.id}/${crypto.randomUUID()}-${filename}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  return path; // เก็บ path นี้ลงตาราง assets/jobs
}

// สร้าง signed URL อายุจำกัด สำหรับให้ client โหลด/แสดงไฟล์ (bucket เป็น private)
export async function getSignedUrl(
  bucket: 'uploads' | 'outputs',
  path: string,
  expiresInSec = 3600,
): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}
