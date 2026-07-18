// คาแรกเตอร์ตกแต่งตามขอบหน้า (เดคคอเรชันล้วน ไม่กระทบฟังก์ชัน)
export default function PageChar({ name, side = 'right', width = 180 }: { name: string; side?: 'left' | 'right'; width?: number }) {
  return (
    <img
      src={`/characters/${name}.png`}
      alt=""
      aria-hidden="true"
      className={`pagechar ${side}`}
      style={{ width }}
    />
  );
}
