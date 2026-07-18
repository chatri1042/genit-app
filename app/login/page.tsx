'use client';
// ล็อกอิน / สมัคร ด้วยอีเมล+รหัสผ่าน ต่อ Supabase Auth จริง (ดีไซน์ใหม่ + ภาพประกอบ)
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
      if (data.session) { router.push('/dashboard'); router.refresh(); }
      else setMsg('สมัครแล้ว! ถ้าโปรเจกต์เปิดยืนยันอีเมล ให้เช็กกล่องเมลก่อน แล้วค่อยล็อกอิน');
    }
  }

  return (
    <main className="auth">
      <div className="auth-top">
        <div className="auth-left">
          <div className="logo">Gen<b>It</b></div>
          <div className="auth-lead">ร้านเล็ก ๆ<br />ก็มีคลิปโฆษณา<br /><em>สวย ๆ</em> ได้</div>
          <div className="auth-trial">
            <div className="ic">🎁</div>
            <div>
              <div className="tt">ทดลองฟรี 1 สิทธิ์ต่อบัญชี</div>
              <div className="td">สมัครแล้วรับเครดิตทดลองทันที ลองสร้างงานจริงได้เลย ไม่ต้องผูกบัตร (วิดีโอทดลองสูงสุด 10 วิ · มีลายน้ำ)</div>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="inner">
            <h1>{mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครใช้งาน'}</h1>
            <p className="sub">{mode === 'login' ? 'เข้าสู่ระบบเพื่อสร้างวิดีโอ' : 'สมัครแล้วรับเครดิตทดลองฟรีทันที'}</p>
            <form onSubmit={submit}>
              <label className="field"><span>อีเมล</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </label>
              <label className="field"><span>รหัสผ่าน</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              </label>
              <button className="btn btn-lg" style={{ width: '100%', justifyContent: 'center', marginTop: 20 }} disabled={loading}>
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
          </div>
        </div>
      </div>

      <div className="auth-band"><img src="/characters/hero.png" alt="ร้านค้า SME" /></div>
    </main>
  );
}
