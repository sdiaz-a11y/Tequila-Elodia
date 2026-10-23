'use client';

import * as React from 'react';
import { AlertDialog as AlertPrimitive, Dialog as DialogPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';
import { buttonVariants } from './button';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

const overlay =
  'fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] data-[state=open]:animate-[fade-up_160ms_var(--ease-out-expo)_both]';

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlay} />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-[14vh] z-50 w-[min(92vw,40rem)] -translate-x-1/2 overflow-hidden rounded-panel border border-line bg-surface-2 shadow-pop',
          'animate-pop-in',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Slide-over used for the mobile navigation. */
export function SheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlay} />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[min(86vw,19rem)] border-r border-line bg-sidebar shadow-pop',
          'data-[state=open]:animate-[slide-in_240ms_var(--ease-out-expo)_both]',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const AlertDialog = AlertPrimitive.Root;
export const AlertDialogTrigger = AlertPrimitive.Trigger;

export function AlertDialogContent({
  title,
  description,
  confirmLabel,
  onConfirm,
  loading,
  tone = 'danger',
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  loading?: boolean;
  tone?: 'danger' | 'primary';
}) {
  return (
    <AlertPrimitive.Portal>
      <AlertPrimitive.Overlay className={overlay} />
      <AlertPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-panel border border-line bg-surface-2 p-6 shadow-pop animate-pop-in">
        <AlertPrimitive.Title className="text-base font-semibold text-fg">
          {title}
        </AlertPrimitive.Title>
        <AlertPrimitive.Description className="mt-2 text-sm text-muted">
          {description}
        </AlertPrimitive.Description>
        <div className="mt-6 flex justify-end gap-2">
          <AlertPrimitive.Cancel className={buttonVariants({ variant: 'ghost' })}>
            Cancelar
          </AlertPrimitive.Cancel>
          <AlertPrimitive.Action
            className={buttonVariants({ variant: tone === 'danger' ? 'danger' : 'primary' })}
            onClick={onConfirm}
            disabled={loading}
          >
            {confirmLabel}
          </AlertPrimitive.Action>
        </div>
      </AlertPrimitive.Content>
    </AlertPrimitive.Portal>
  );
}
