import { useLayoutEffect, useRef } from "react";

interface Props {
  value: number;
  durationSec?: number;
  /** Format the (rounded) number for display, e.g. n => `${n}h`. */
  format?: (n: number) => string;
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Animates a number counting up from 0 to `value`. GSAP is lazy-loaded, so it
 * never touches the initial bundle. Falls back to the final value instantly
 * when reduced-motion is set or GSAP fails to load.
 */
export default function CountUp({ value, durationSec = 1.1, format }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const fmt = format ?? ((n: number) => String(Math.round(n)));

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion() || value <= 0) { el.textContent = fmt(value); return; }

    // Reset synchronously (before paint) to avoid a flash of the final value.
    el.textContent = fmt(0);

    let killed = false;
    let tween: { kill: () => void } | undefined;
    const obj = { n: 0 };
    import("gsap")
      .then(({ gsap }) => {
        if (killed || !ref.current) return;
        tween = gsap.to(obj, {
          n: value,
          duration: durationSec,
          ease: "power2.out",
          onUpdate: () => { if (ref.current) ref.current.textContent = fmt(obj.n); },
        });
      })
      .catch(() => { if (ref.current) ref.current.textContent = fmt(value); });

    return () => { killed = true; tween?.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span ref={ref}>{fmt(value)}</span>;
}
