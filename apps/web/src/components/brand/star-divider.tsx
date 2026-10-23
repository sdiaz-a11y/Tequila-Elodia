import { cn } from '@/lib/utils';

/**
 * Hairline + eight-point star: the divider motif of the official label, drawn as plain SVG
 * (a decorative separator, not the logo). `draw` animates the strokes in once.
 */
export function StarDivider({ className, draw = false }: { className?: string; draw?: boolean }) {
  const stroke = draw ? 'draw' : '';
  return (
    <svg
      viewBox="0 0 240 16"
      role="presentation"
      aria-hidden
      className={cn('h-4 w-60 text-gold-2', className)}
      fill="none"
    >
      <path
        className={stroke}
        style={{ '--len': 96 } as React.CSSProperties}
        d="M0 8H96"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity=".75"
      />
      <path
        className={stroke}
        style={{ '--len': 96 } as React.CSSProperties}
        d="M240 8H144"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity=".75"
      />
      <path
        className={stroke}
        style={{ '--len': 80 } as React.CSSProperties}
        d="M120.00 0.60 L121.19 5.14 L125.23 2.77 L122.86 6.81 L127.40 8.00 L122.86 9.19 L125.23 13.23 L121.19 10.86 L120.00 15.40 L118.81 10.86 L114.77 13.23 L117.14 9.19 L112.60 8.00 L117.14 6.81 L114.77 2.77 L118.81 5.14 Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity=".18"
      />
    </svg>
  );
}
