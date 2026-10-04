import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import './brew-motion.css';

export function BrewMotion() {
  const video = useRef<HTMLVideoElement>(null);
  const [animate, setAnimate] = useState(false);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    const update = () => setAnimate(!preference.matches && !connection?.saveData);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  return (
    <article className="brew-motion-card" aria-labelledby="brew-motion-heading">
      <div className="brew-motion-copy">
        <span className="brew-motion-eyebrow">حكاية الوش الحلو</span>
        <h3 id="brew-motion-heading">السر في النار الهادية.</h3>
        <p>فنجان التركي محتاج شوية صبر. دي خطوات بسيطة تظبط بيها قهوتك في الكنكة.</p>
        <ol>
          <li>مياه بدرجة حرارة الغرفة، وبن وسكر حسب ذوقك. قلّب قبل النار.</li>
          <li>حط الكنكة على نار هادية، وبلاش تقليب وهي على النار.</li>
          <li>أول ما الوش يعلى، ارفعها قبل الغليان وصب بالراحة.</li>
        </ol>
        <a
          className="brew-motion-gif-link"
          href="/media/brew-guide.gif"
          download="dar-coffee-brew-guide.gif"
        >
          حمّل خطوات التحضير كـ GIF
        </a>
      </div>
      <div className="brew-motion-visual">
        {animate ? (
          <video
            ref={video}
            src="/media/brew-guide.mp4"
            poster="/media/brew-guide-poster.webp"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        ) : (
          <img
            src="/media/brew-guide-poster.webp"
            alt="رسم كنكة نحاس يوضح بداية تحضير القهوة التركي"
            loading="lazy"
          />
        )}
        {animate && (
          <button
            type="button"
            className="brew-motion-control"
            aria-label={playing ? 'إيقاف فيديو تحضير القهوة' : 'تشغيل فيديو تحضير القهوة'}
            onClick={() => {
              if (!video.current) return;
              if (video.current.paused) void video.current.play().catch(() => setPlaying(false));
              else video.current.pause();
            }}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
            <span>{playing ? 'إيقاف' : 'تشغيل'}</span>
          </button>
        )}
      </div>
    </article>
  );
}
