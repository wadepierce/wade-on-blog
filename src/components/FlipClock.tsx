import { useEffect, useRef, useState } from 'react';

// Compact electric flip clock for the site header. Each digit is its own
// little 3D card; when the digit changes the card hinges over to reveal the
// next value on its back face. Inspired by Paul Noble's CodePen flip clocks
// (e.g. NqxdLm), reimplemented from scratch in the Pierce Electric palette.

const FLIP_MS = 420;

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

type DigitProps = { value: string };

function Digit({ value }: DigitProps) {
  const [current, setCurrent] = useState(value);
  const [next, setNext] = useState(value);
  const [flipping, setFlipping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value === current) return;
    setNext(value);
    setFlipping(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setCurrent(value);
      setFlipping(false);
    }, FLIP_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, current]);

  return (
    <span className="flip-card" data-flipping={flipping ? 'true' : 'false'}>
      <span className="flip-inner">
        <span className="flip-face flip-front">{current}</span>
        <span className="flip-face flip-back">{next}</span>
      </span>
    </span>
  );
}

export default function FlipClock() {
  const [time, setTime] = useState<Date | null>(null);

  // Defer the first render until after mount so SSR/hydration agree.
  useEffect(() => {
    setTime(new Date());
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = time ? pad(time.getHours()) : '--';
  const mm = time ? pad(time.getMinutes()) : '--';
  const ss = time ? pad(time.getSeconds()) : '--';

  return (
    <div
      className="hidden items-center gap-0.5 rounded border border-electric-700/40 bg-ink-900 px-2 py-1 font-mono text-[15px] font-bold leading-none text-electric-300 shadow-[0_0_12px_-4px_theme(colors.electric.500)] sm:flex"
      aria-label={time ? `Time ${hh}:${mm}:${ss}` : 'Loading clock'}
      title="Local time"
    >
      <Digit value={hh[0]} />
      <Digit value={hh[1]} />
      <span className="flip-sep">:</span>
      <Digit value={mm[0]} />
      <Digit value={mm[1]} />
      <span className="flip-sep">:</span>
      <Digit value={ss[0]} />
      <Digit value={ss[1]} />
      <style>{`
        .flip-card {
          position: relative;
          display: inline-block;
          width: 0.85em;
          height: 1.4em;
          perspective: 120px;
        }
        .flip-inner {
          position: absolute;
          inset: 0;
          transform-style: preserve-3d;
          transition: transform ${FLIP_MS}ms cubic-bezier(0.45, 0, 0.55, 1);
        }
        .flip-card[data-flipping='true'] .flip-inner {
          transform: rotateX(180deg);
        }
        .flip-face {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          background: linear-gradient(180deg, #0b0d14 0%, #050608 50%, #0b0d14 51%, #11141d 100%);
          border: 1px solid rgba(0, 145, 204, 0.45);
          border-radius: 3px;
          color: #4dc3ff;
          text-shadow: 0 0 6px rgba(0, 180, 255, 0.65);
        }
        .flip-back {
          transform: rotateX(180deg);
        }
        .flip-sep {
          display: inline-block;
          width: 0.35em;
          text-align: center;
          color: #00b4ff;
          text-shadow: 0 0 6px rgba(0, 180, 255, 0.65);
          animation: flip-blink 1s steps(2, end) infinite;
        }
        @keyframes flip-blink {
          50% { opacity: 0.25; }
        }
        @media (prefers-reduced-motion: reduce) {
          .flip-inner { transition: none; }
          .flip-sep { animation: none; }
        }
      `}</style>
    </div>
  );
}
