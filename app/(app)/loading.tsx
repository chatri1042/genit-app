// โครงโหลด (skeleton) — โผล่ทันทีที่กดเปลี่ยนหน้า ทำให้รู้สึกตอบสนองไว
export default function Loading() {
  return (
    <div>
      <div className="sk" style={{ width: 90, height: 14, marginBottom: 10 }} />
      <div className="sk" style={{ width: 240, height: 30, marginBottom: 24 }} />
      <div className="grid grid-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card">
            <div className="sk" style={{ width: '55%', height: 14, marginBottom: 12 }} />
            <div className="sk" style={{ width: '40%', height: 28 }} />
          </div>
        ))}
      </div>
      <div className="sk" style={{ width: '100%', height: 160, borderRadius: 18, marginTop: 20 }} />
    </div>
  );
}
