import { randomInt } from 'node:crypto';
import { ForbiddenException } from '@nestjs/common';
import type { Scope } from '@elodia/shared';

/** Unambiguous characters only (no 0/O, 1/l/I) so the password can be read out or typed without mistakes. */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** `xxxxx-xxxxx-xxxxx`: 15 random characters (~85 bits), 17 with separators, above the 12-character policy. */
export function generateTemporaryPassword(): string {
  const group = () =>
    Array.from({ length: 5 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  return `${group()}-${group()}-${group()}`;
}

/**
 * Administration acts on other people's accounts and on the permission matrix, so it needs the
 * widest scope. A narrower grant (own/team) is denied rather than silently reinterpreted.
 */
export function assertAllScope(scope: Scope | undefined): void {
  if (scope !== 'all') throw new ForbiddenException('No tienes permiso para esta acción');
}

/** RFC 4180 cell with spreadsheet-formula neutralisation (cells starting with = + - @ would execute in Excel). */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const csvRow = (cells: unknown[]): string => cells.map(csvCell).join(',');
