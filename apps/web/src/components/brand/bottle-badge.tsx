'use client';

import dynamic from 'next/dynamic';
import { Component, useSyncExternalStore, type ReactNode } from 'react';

const Bottle3D = dynamic(() => import('./bottle-3d'), { ssr: false });

const noopSubscribe = () => () => {};
let webglCache: boolean | null = null;
const webglOk = () => (webglCache ??= webglAvailable());

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** If the 3D model fails to load or the browser has no WebGL, show the still photo instead of an empty box. */
class Guard extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Still() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/elodia-botella.png" alt="" className="h-full w-full object-contain" />;
}

/** Small rotating 3D bottle for the top bar. Decorative: hidden from assistive tech and from print. */
export function BottleBadge({ className = '' }: { className?: string }) {
  const mode = useSyncExternalStore(
    noopSubscribe,
    () => (webglOk() ? '3d' : 'still'),
    () => 'pending',
  );
  const reduced = useSyncExternalStore(
    noopSubscribe,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );

  return (
    <div data-no-print data-bottle-3d={mode} aria-hidden className={`shrink-0 ${className}`}>
      {mode === '3d' ? (
        <Guard fallback={<Still />}>
          <Bottle3D reducedMotion={reduced} />
        </Guard>
      ) : mode === 'still' ? (
        <Still />
      ) : null}
    </div>
  );
}
