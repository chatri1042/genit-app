import { redirect } from 'next/navigation';

// หน้าแรก — เด้งไปแดชบอร์ด (layout ในกลุ่ม (app) จะเด้งไป /login ถ้ายังไม่ล็อกอิน)
export default function Index() {
  redirect('/dashboard');
}
