'use client';

import * as React from 'react';
import { DropdownMenu as MenuPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

export const DropdownMenu = MenuPrimitive.Root;
export const DropdownMenuTrigger = MenuPrimitive.Trigger;

export function DropdownMenuContent({
  className,
  align = 'end',
  sideOffset = 10,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-56 origin-(--radix-dropdown-menu-content-transform-origin) rounded-panel border border-line bg-surface-2 p-1.5 text-sm text-fg shadow-pop',
          'animate-pop-in',
          className,
        )}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  danger,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Item> & { danger?: boolean }) {
  return (
    <MenuPrimitive.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none',
        'data-[highlighted]:bg-surface-3 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-muted',
        danger && 'text-danger data-[highlighted]:bg-danger/10 [&_svg]:text-danger',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Label>) {
  return <MenuPrimitive.Label className={cn('px-2.5 py-2', className)} {...props} />;
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator className={cn('-mx-1.5 my-1.5 h-px bg-line', className)} {...props} />
  );
}
