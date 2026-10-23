import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-medium',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out',
    'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        // Gold is reserved for the one primary action on a surface.
        primary:
          'bg-gold text-background disabled:bg-surface-3 disabled:text-faint disabled:opacity-100 disabled:shadow-none shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_1px_2px_rgb(0_0_0/0.4)] hover:bg-[#e3c88e] focus-visible:outline-offset-2',
        secondary:
          'border border-line bg-surface-2 text-fg hover:border-line-strong hover:bg-surface-3',
        ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
        danger: 'border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20',
        link: 'h-auto rounded-sm p-0 text-gold underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
        icon: 'size-9 max-md:size-11',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild,
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {children}
        </>
      )}
    </Comp>
  );
}

export { buttonVariants };
