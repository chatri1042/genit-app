'use client';
// ป้ายข้อความสองภาษา ใช้ในหน้า server ได้ (อ่านภาษาจาก LanguageProvider ฝั่ง client)
import { useLang } from './LanguageProvider';

export default function TL({ th, en }: { th: string; en: string }) {
  const { lang } = useLang();
  return <>{lang === 'th' ? th : en}</>;
}
