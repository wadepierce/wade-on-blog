import { useEffect, useRef } from 'react';

type Node = { x: number; y: number; t: number };

const TRAIL_LIMIT = 28;
const FADE_MS = 700;
// Three offsets per pass simulate the chromatic-aberration "tube" look.
const PASSES: { color: string; offset: number; blur: number; widthMul: number }[] = [
  { color: 'rgba(0, 180, 255, 0.95)', offset: 0, blur: 24, widthMul: 1.0 },
  { color: 'rgba(120, 230, 255, 0.85)', offset: -1.5, blur: 12, widthMul: 0.65 },
  { color: 'rgba(255, 80, 220, 0.55)', offset: 1.5, blur: 18, widthMul: 0.75 },
];

export default function NeonTubesHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<Node[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = Math.max(1, window.devicePixelRatio || 1);

    function resize() {
      if (!canvas || !container || !ctx) return;
      dpr = Math.max(1, window.devicePixelRatio || 1);
      const { clientWidth, clientHeight } = container;
      canvas.width = Math.floor(clientWidth * dpr);
      canvas.height = Math.floor(clientHeight * dpr);
      canvas.style.width = `${clientWidth}px`;
      canvas.style.height = `${clientHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    function pointFromEvent(e: PointerEvent | MouseEvent) {
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function pushNode(p: { x: number; y: number }) {
      const now = performance.now();
      const trail = trailRef.current;
      trail.push({ x: p.x, y: p.y, t: now });
      if (trail.length > TRAIL_LIMIT) trail.shift();
    }

    function onMove(e: PointerEvent) {
      const p = pointFromEvent(e);
      if (p) pushNode(p);
    }

    function onLeave() {
      // let the existing nodes fade out naturally
    }

    container.addEventListener('pointermove', onMove);
    container.addEventListener('pointerleave', onLeave);

    function draw() {
      if (!ctx || !canvas) return;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      // Trailing fade — fill with background alpha to bleed old frames out.
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(5, 6, 10, 0.18)';
      ctx.fillRect(0, 0, w, h);

      const now = performance.now();
      const trail = trailRef.current;

      // Drop fully-faded nodes.
      while (trail.length && now - trail[0].t > FADE_MS) trail.shift();

      if (trail.length >= 2) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const pass of PASSES) {
          ctx.shadowColor = pass.color;
          ctx.shadowBlur = pass.blur;
          ctx.strokeStyle = pass.color;

          for (let i = 1; i < trail.length; i++) {
            const a = trail[i - 1];
            const b = trail[i];
            const age = now - b.t;
            const lifeT = 1 - age / FADE_MS;
            if (lifeT <= 0) continue;
            // Width tapers from head (i = trail.length-1) to tail.
            const headiness = i / trail.length;
            const baseWidth = 2 + headiness * 8;
            ctx.lineWidth = baseWidth * pass.widthMul * lifeT;
            ctx.globalAlpha = lifeT;
            ctx.beginPath();
            ctx.moveTo(a.x + pass.offset, a.y + pass.offset);
            ctx.lineTo(b.x + pass.offset, b.y + pass.offset);
            ctx.stroke();
          }
        }

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative mb-12 h-[40vh] min-h-[260px] overflow-hidden rounded-lg border border-electric-700/40 bg-gradient-to-br from-ink-950 via-ink-900 to-ink-950"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <h1 className="select-none text-6xl font-black tracking-tight text-electric-400 drop-shadow-[0_0_24px_rgba(0,180,255,0.55)] sm:text-8xl">
          WADE-ON
        </h1>
      </div>
    </section>
  );
}
