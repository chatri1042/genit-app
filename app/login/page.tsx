'use client';
// ล็อกอิน / สมัคร ด้วยอีเมล+รหัสผ่าน ต่อ Supabase Auth จริง
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setMsg(''); setLoading(true);
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setErr(error.message);
      router.push('/dashboard');
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) return setErr(error.message);
      // ถ้าปิด email confirmation ใน Supabase แล้ว จะได้ session ทันที
      if (data.session) { router.push('/dashboard'); router.refresh(); }
      else setMsg('สมัครแล้ว! ถ้าโปรเจกต์เปิดยืนยันอีเมล ให้เช็กกล่องเมลก่อน แล้วค่อยล็อกอิน');
    }
  }

  return (
    <main style={{ maxWidth: 400, margin: '0 auto', padding: '72px 22px' }}>
      <div className="logo" style={{ fontWeight: 700, fontSize: 26, marginBottom: 4 }}>
        Gen<span style={{ background: 'var(--yellow)', padding: '0 6px', borderRadius: 6 }}>It</span>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        {mode === 'login' ? 'เข้าสู่ระบบเพื่อสร้างวิดีโอ' : 'สมัครใช้งาน GenIt'}
      </p>
      <form onSubmit={submit}>
        <label className="field"><span>อีเมล</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="field"><span>รหัสผ่าน</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </label>
        <button className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: 20 }} disabled={loading}>
          {loading ? 'กำลังทำงาน…' : mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัคร'}
        </button>
      </form>
      {err && <p className="err">{err}</p>}
      {msg && <p className="ok">{msg}</p>}
      <p className="muted" style={{ marginTop: 20, fontSize: 14 }}>
        {mode === 'login' ? 'ยังไม่มีบัญชี? ' : 'มีบัญชีแล้ว? '}
        <a style={{ color: 'var(--yellow-deep)', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErr(''); setMsg(''); }}>
          {mode === 'login' ? 'สมัครที่นี่' : 'เข้าสู่ระบบ'}
        </a>
      </p>
    </main>
  );
}
