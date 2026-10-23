'use client';

import * as React from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({
  className,
  align = 'end',
  sideOffset = 10,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 w-80 origin-(--radix-popover-content-transform-origin) rounded-panel border border-line bg-surface-2 p-4 text-sm text-fg shadow-pop',
          'animate-pop-in',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
