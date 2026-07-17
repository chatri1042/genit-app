import { cache } from 'react';
import { createClient } from './supabase/server';

// cache() ทำให้การเรียก getUser ซ้ำภายในการเรนเดอร์เดียว (layout + page)
// ยิงเน็ตไป Supabase แค่ครั้งเดียว -> ลด round-trip ข้ามภูมิภาค เร็วขึ้น
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});
