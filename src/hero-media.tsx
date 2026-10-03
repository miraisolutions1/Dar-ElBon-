import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import './hero-media.css';

export function HeroMedia({ image, video }: { image: string; video?: string }) {
  const element = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    const update = () => setEnabled(!!video && !motion.matches && !connection?.saveData);
    update();
    motion.addEventListener('change', update);
    return () => motion.removeEventListener('change', update);
  }, [video]);
  useEffect(() => {
    setPlaying(true);
  }, [video]);
  return (
    <div className="hero-visual">
      <img
        src={image}
        alt="عبوة دار البن الصفراء وعلبة البن المحوج السوداء مع فنجان قهوة وكنكة"
        fetchPriority="high"
      />
      {enabled && video && (
        <>
          <video
            ref={element}
            className="hero-motion"
            src={video}
            poster={image}
            muted
            autoPlay
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
          <button
            className="hero-motion-toggle"
            type="button"
            aria-label={playing ? 'إيقاف حركة الصورة' : 'تشغيل حركة الصورة'}
            onClick={() => {
              if (!element.current) return;
              if (element.current.paused)
                void element.current.play().catch(() => setPlaying(false));
              else element.current.pause();
            }}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
        </>
      )}
    </div>
  );
}
