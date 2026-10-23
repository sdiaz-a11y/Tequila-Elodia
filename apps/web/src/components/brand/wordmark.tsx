import { cn } from '@/lib/utils';

/**
 * Plain-text "ELODIA" in the provisional display serif. This is NOT the brand logo: until the official
 * vector logo is supplied (docs/BRANDING.md) the interface must not simulate it.
 */
export function Wordmark({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-baseline gap-2 leading-none', className)}>
      <span className="font-display text-[1.625rem] font-semibold tracking-[0.32em] text-gold">
        {compact ? 'E' : 'ELODIA'}
      </span>
      {compact ? null : (
        <span className="text-[0.6875rem] font-medium tracking-[0.35em] text-faint">OS</span>
      )}
    </span>
  );
}
