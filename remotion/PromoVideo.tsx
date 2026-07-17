// ============================================================
// GenIt — ชั้นประกอบ (compose) ด้วย Remotion
// วางทับวิดีโอดิบจาก AI: intro แบรนด์ -> คลิป + ซับ + โลโก้ + CTA -> outro
// ไม่ใช้ AI ในชั้นนี้ => เรนเดอร์ซ้ำถูกมาก = "แก้ฟรี" ให้ลูกค้าได้
// ============================================================
import {
  AbsoluteFill, Sequence, Video, Audio, Img,
  interpolate, useCurrentFrame, useVideoConfig, spring,
} from 'remotion';
import { z } from 'zod';

export const promoSchema = z.object({
  videoUrl: z.string(),          // คลิปดิบจาก provider (signed URL)
  audioUrl: z.string().optional(),// เสียงพากย์ของเรา (ทับ native audio)
  logoUrl: z.string().optional(),
  brandColor: z.string(),
  brandName: z.string(),
  cta: z.string().optional(),
  captions: z.array(z.object({ text: z.string(), start: z.number(), end: z.number() })),
  showIntro: z.boolean(),
  showOutro: z.boolean(),
});

export const defaultPromoProps: z.infer<typeof promoSchema> = {
  videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  brandColor: '#EAE41F',
  brandName: 'GenIt',
  cta: 'ทักแชทเลย!',
  captions: [
    { text: 'สินค้าใหม่มาแล้ว', start: 0, end: 2 },
    { text: 'ลดพิเศษวันนี้เท่านั้น', start: 2, end: 4.5 },
  ],
  showIntro: true,
  showOutro: true,
};

const INTRO = 30;   // 1 วิ
const OUTRO = 45;   // 1.5 วิ

export const PromoVideo: React.FC<z.infer<typeof promoSchema>> = (p) => {
  const { fps, durationInFrames } = useVideoConfig();
  const bodyStart = p.showIntro ? INTRO : 0;
  const outroStart = durationInFrames - (p.showOutro ? OUTRO : 0);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* intro แบรนด์ */}
      {p.showIntro && (
        <Sequence durationInFrames={INTRO}>
          <BrandCard brandColor={p.brandColor} brandName={p.brandName} logoUrl={p.logoUrl} />
        </Sequence>
      )}

      {/* คลิปหลัก + เสียงเรา + ซับ + โลโก้ */}
      <Sequence from={bodyStart}>
        <AbsoluteFill>
          <Video src={p.videoUrl} muted={!!p.audioUrl} />
          {p.audioUrl && <Audio src={p.audioUrl} />}
          {p.logoUrl && (
            <Img
              src={p.logoUrl}
              style={{ position: 'absolute', top: 40, right: 40, height: 72, opacity: 0.95 }}
            />
          )}
          <Captions captions={p.captions} fps={fps} brandColor={p.brandColor} />
        </AbsoluteFill>
      </Sequence>

      {/* outro + CTA */}
      {p.showOutro && (
        <Sequence from={outroStart} durationInFrames={OUTRO}>
          <OutroCard brandColor={p.brandColor} brandName={p.brandName} cta={p.cta} logoUrl={p.logoUrl} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

const BrandCard: React.FC<{ brandColor: string; brandName: string; logoUrl?: string }> = (b) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ backgroundColor: b.brandColor, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: `scale(${s})`, textAlign: 'center' }}>
        {b.logoUrl && <img src={b.logoUrl} style={{ height: 140, marginBottom: 24 }} />}
        <div style={{ fontFamily: 'Kanit, sans-serif', fontSize: 84, fontWeight: 700, color: '#1A1A17' }}>
          {b.brandName}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const OutroCard: React.FC<{ brandColor: string; brandName: string; cta?: string; logoUrl?: string }> = (b) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ backgroundColor: b.brandColor, justifyContent: 'center', alignItems: 'center', opacity }}>
      <div style={{ textAlign: 'center', fontFamily: 'Kanit, sans-serif', color: '#1A1A17' }}>
        {b.logoUrl && <img src={b.logoUrl} style={{ height: 110, marginBottom: 20 }} />}
        <div style={{ fontSize: 56, fontWeight: 700 }}>{b.brandName}</div>
        {b.cta && (
          <div style={{ marginTop: 24, fontSize: 44, fontWeight: 600, background: '#1A1A17', color: b.brandColor, padding: '14px 40px', borderRadius: 999 }}>
            {b.cta}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ซับไตเติลตามช่วงเวลา (start/end หน่วยวินาที)
const Captions: React.FC<{
  captions: { text: string; start: number; end: number }[];
  fps: number; brandColor: string;
}> = ({ captions, fps, brandColor }) => {
  const frame = useCurrentFrame();
  const t = frame / fps;
  const cur = captions.find((c) => t >= c.start && t < c.end);
  if (!cur) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 160, left: 0, right: 0, textAlign: 'center', padding: '0 60px',
    }}>
      <span style={{
        fontFamily: 'Kanit, sans-serif', fontSize: 52, fontWeight: 600, color: '#fff',
        background: 'rgba(0,0,0,0.55)', padding: '10px 24px', borderRadius: 12,
        boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone',
        borderBottom: `6px solid ${brandColor}`,
      }}>
        {cur.text}
      </span>
    </div>
  );
};
