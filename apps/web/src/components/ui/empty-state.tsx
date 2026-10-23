import * as React from 'react';
import { cn } from '@/lib/utils';
import { StarDivider } from '@/components/brand/star-divider';

/** Empty states teach what will appear and what unlocks it; they never show simulated data. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid place-items-center gap-3 px-6 py-14 text-center', className)}>
      {Icon ? (
        <span className="grid size-11 place-items-center rounded-full border border-line bg-surface-2 text-gold">
          <Icon className="size-5" aria-hidden />
        </span>
      ) : (
        <StarDivider className="w-40" />
      )}
      <h3 className="text-[0.9375rem] font-medium text-fg">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
