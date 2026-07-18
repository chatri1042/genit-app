/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // แคชหน้าไว้ฝั่งเบราว์เซอร์ช่วงสั้น ๆ — กดสลับหมวดที่เพิ่งเปิดจะเด้งขึ้นทันที ไม่วิ่งกลับเซิร์ฟเวอร์ใหม่
  experimental: {
    staleTimes: { dynamic: 30, static: 180 },
  },
  // ปิด font optimization ตอน build (แซนด์บ็อกซ์เข้า fonts.googleapis.com ไม่ได้)
  // ฟอนต์ Kanit ยังโหลดฝั่ง client ผ่าน <link> ใน layout ปกติ
  optimizeFonts: false,
  // อนุญาตให้แสดงรูป/วิดีโอจาก Supabase Storage
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};
module.exports = nextConfig;
