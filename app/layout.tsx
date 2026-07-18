import type { Metadata } from 'next';
import './globals.css';

// บังคับให้ฟังก์ชันรันที่โตเกียว (ตรงกับ Supabase ap-northeast-1) — ตั้งในโค้ดชัวร์กว่าตั้งในหน้า Vercel
export const preferredRegion = 'hnd1';

export const metadata: Metadata = {
  title: 'GenIt — สร้างวิดีโอโปรโมทสินค้า AI',
  description: 'ให้ร้าน SME สร้างวิดีโอโปรโมทสินค้าแบบง่าย ด้วย AI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
