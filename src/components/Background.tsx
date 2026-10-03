import React, { useEffect, useRef, useState } from "react";
import { isBot } from "../bot";

// видео тяжёлое и не нужно, если человек просит меньше анимаций или экономит трафик,
// и роботам: им 2.4 МБ фона только замедляют рендер
const videoAllowed = () => {
  if (isBot()) return false;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = (navigator as { connection?: { saveData?: boolean } }).connection?.saveData;
  return !reduced && !saveData;
};

// фон — только видео на чёрном. Грузится сразу (пока висит экран загрузки),
// проявляется, когда `visible` и видео реально играет. Нет видео — остаётся чёрный.
export const Background: React.FC<{ visible: boolean }> = ({ visible }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(videoAllowed);
  const [playing, setPlaying] = useState(false);

  // на скрытой вкладке видео не крутим — экономим CPU и батарею
  useEffect(() => {
    if (!enabled) return;
    const onVisibility = () => {
      const v = videoRef.current;
      if (!v) return;
      if (document.hidden) v.pause();
      else v.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [enabled]);

  // после загрузки начинаем с первого кадра
  useEffect(() => {
    const v = videoRef.current;
    if (visible && v) {
      v.currentTime = 0;
      v.play().catch(() => {});
    }
  }, [visible]);

  return (
    <div aria-hidden="true" className="absolute inset-0 bg-black">
      {enabled && (
        <video
          ref={videoRef}
          src="/background.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          onPlaying={() => setPlaying(true)}
          // не загрузилось или браузер не умеет — остаётся чёрный фон
          onError={() => setEnabled(false)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ${
            visible && playing ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
      <div className="absolute inset-0 bg-black/30" />
    </div>
  );
};
