'use client';

import Image from 'next/image';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';

/**
 * The login's one memorable moment: the official bottle on black, a slow light sweep clipped to the
 * bottle's own alpha channel, a breathing warm glow, and a barely-there parallax that follows the pointer.
 */
export function BottleStage() {
  const reduceMotion = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const x = useSpring(px, { stiffness: 70, damping: 18, mass: 0.6 });
  const y = useSpring(py, { stiffness: 70, damping: 18, mass: 0.6 });
  const rotateY = useTransform(x, [-1, 1], [-5, 5]);
  const rotateX = useTransform(y, [-1, 1], [3, -3]);
  const shiftX = useTransform(x, [-1, 1], [-12, 12]);
  const glowX = useTransform(x, [-1, 1], [-30, 30]);

  function onPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (reduceMotion) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set(((e.clientX - r.left) / r.width) * 2 - 1);
    py.set(((e.clientY - r.top) / r.height) * 2 - 1);
  }
  function onPointerLeave() {
    px.set(0);
    py.set(0);
  }

  return (
    <section
      aria-label="Tequila ELODIA Añejo"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative hidden overflow-hidden bg-[#08080a] lg:grid lg:place-items-center"
    >
      <motion.div
        aria-hidden
        style={reduceMotion ? undefined : { x: glowX }}
        className="stage-glow pointer-events-none absolute inset-0"
      >
        <div className="absolute inset-0 bg-[radial-gradient(55%_48%_at_50%_54%,rgb(184_146_79/0.30),transparent_72%)]" />
      </motion.div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_50%,transparent_55%,rgb(0_0_0/0.65))]"
      />

      <div className="relative grid justify-items-center [perspective:1400px]">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.98, filter: 'blur(14px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            ...(reduceMotion ? {} : { rotateX, rotateY, x: shiftX }),
            height: 'min(78vh, 54rem)',
            aspectRatio: '2 / 3',
          }}
          className="relative [transform-style:preserve-3d]"
        >
          <Image
            src="/brand/elodia-botella.png"
            alt="Botella de Tequila ELODIA Añejo, vidrio negro con filigrana dorada"
            fill
            priority
            sizes="(min-width: 1024px) 40vw, 0px"
            className="object-contain drop-shadow-[0_40px_60px_rgb(0_0_0/0.8)]"
          />
          <div
            aria-hidden
            className="bottle-sweep absolute inset-0 overflow-hidden"
            style={{ ['--bottle-url' as string]: 'url(/brand/elodia-botella.png)' }}
          />
        </motion.div>
      </div>
    </section>
  );
}
