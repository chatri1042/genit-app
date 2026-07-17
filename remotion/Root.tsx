import { Composition } from 'remotion';
import { PromoVideo, promoSchema, defaultPromoProps } from './PromoVideo';

// รองรับ 3 สัดส่วน — เลือกตอน render ด้วย --props หรือหลาย Composition
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PromoVideo"
        component={PromoVideo}
        durationInFrames={30 * 20} // 20 วิ @30fps (override ได้)
        fps={30}
        width={1080}
        height={1920} // 9:16 (แนวตั้ง)
        schema={promoSchema}
        defaultProps={defaultPromoProps}
      />
      <Composition
        id="PromoVideoSquare"
        component={PromoVideo}
        durationInFrames={30 * 20}
        fps={30}
        width={1080}
        height={1080} // 1:1
        schema={promoSchema}
        defaultProps={defaultPromoProps}
      />
      <Composition
        id="PromoVideoWide"
        component={PromoVideo}
        durationInFrames={30 * 20}
        fps={30}
        width={1920}
        height={1080} // 16:9 (แนวนอน)
        schema={promoSchema}
        defaultProps={defaultPromoProps}
      />
    </>
  );
};
