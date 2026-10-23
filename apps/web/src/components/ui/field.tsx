import * as React from 'react';
import { cn } from '@/lib/utils';

export function Input({
  className,
  invalid,
  ...props
}: React.ComponentProps<'input'> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        'h-11 w-full rounded-control border border-line bg-surface-2 px-3.5 text-sm text-fg placeholder:text-faint',
        'transition-[border-color,box-shadow,background-color] duration-150 hover:border-line-strong',
        'focus-visible:border-gold-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30',
        'disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger/70 aria-[invalid=true]:ring-danger/20',
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return <label className={cn('text-sm font-medium text-fg', className)} {...props} />;
}

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: (a11y: {
    id: string;
    'aria-describedby'?: string;
    invalid: boolean;
  }) => React.ReactNode;
  className?: string;
}

/** Label + control + hint/error, wired for screen readers. */
export function Field({ id, label, hint, error, children, className }: FieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({ id, 'aria-describedby': describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[0.8125rem] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[0.8125rem] text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Native select styled like Input: keyboard and screen-reader behaviour for free. */
export function Select({
  className,
  invalid,
  ...props
}: React.ComponentProps<'select'> & { invalid?: boolean }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(
        'h-11 w-full appearance-none rounded-control border border-line bg-surface-2 bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat px-3.5 pr-9 text-sm text-fg',
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239d968a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        'transition-[border-color,box-shadow] duration-150 hover:border-line-strong',
        'focus-visible:border-gold-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30',
        'disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger/70',
        className,
      )}
      {...props}
    />
  );
}
