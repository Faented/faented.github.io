import React, { useEffect, useState } from "react";

const LINES = [
  "POST ............................",
  "memory check 640K ...............",
  "mounting /home/faented ..........",
  "loading cats.ko .................",
  "brewing coffee ..................",
  "connecting github.com ...........",
  "starting terminal ...............",
];

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// экран «нажми для загрузки» → строки загрузки → прогресс → onDone
export const Boot: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [started, setStarted] = useState(false);
  const [shown, setShown] = useState(0); // сколько строк уже показано
  const [leaving, setLeaving] = useState(false);

  // старт по клику, тапу или любой клавише
  useEffect(() => {
    if (started) return;
    const start = () => setStarted(true);
    window.addEventListener("pointerdown", start);
    window.addEventListener("keydown", start);
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const step = reduced() ? 40 : 170;
    if (shown < LINES.length) {
      const t = setTimeout(() => setShown((n) => n + 1), step + Math.random() * step);
      return () => clearTimeout(t);
    }
    const t1 = setTimeout(() => setLeaving(true), 450);
    const t2 = setTimeout(onDone, 450 + 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [started, shown, onDone]);

  const progress = Math.round((shown / LINES.length) * 100);
  const bar = 24;
  const filled = Math.round((progress / 100) * bar);

  return (
    <div
      className={`fixed inset-0 z-50 bg-black font-mono text-sm text-white/80 flex items-center justify-center transition-opacity duration-500 ${
        leaving ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {!started ? (
        <div className="text-center animate-appear">
          <p className="text-white/80">
            press any key to boot<span className="cursor-blink">_</span>
          </p>
          <p className="mt-2 text-xs text-white/30">нажмите, чтобы продолжить загрузку системы</p>
        </div>
      ) : (
        <div className="w-[92%] max-w-md">
          {LINES.slice(0, shown).map((line) => (
            <div key={line} className="flex justify-between gap-4 animate-appear-fast">
              <span className="truncate text-white/60">{line}</span>
              <span className="text-accent shrink-0">[ ok ]</span>
            </div>
          ))}
          <div className="mt-4 text-white/60">
            [<span className="text-accent">{"█".repeat(filled)}</span>
            {"·".repeat(bar - filled)}] {progress}%
          </div>
          {shown === LINES.length && <p className="mt-2 text-white animate-appear-fast">welcome.</p>}
        </div>
      )}

      <p className="absolute bottom-4 inset-x-0 text-center text-xs text-white/20">
        faented bios · rev {__COMMIT__}
      </p>
    </div>
  );
};
