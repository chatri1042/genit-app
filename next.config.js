/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
