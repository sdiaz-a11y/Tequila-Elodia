'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGroup, motion } from 'motion/react';
import { ChevronDown, ChevronsLeft, ChevronsRight, Clock } from 'lucide-react';
import type { SessionUser } from '@elodia/shared';
import { Wordmark } from '@/components/brand/wordmark';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { COMING_SOON_LABEL, findNavItem, visibleNav, type NavItem } from '@/lib/nav';
import { cn } from '@/lib/utils';

interface SidebarNavProps {
  user: SessionUser;
  collapsed: boolean;
  /** Distinguishes the shared-layout animation between the desktop rail and the mobile sheet. */
  scope: string;
  onNavigate?: () => void;
}

const row =
  'group/item relative flex h-11 w-full lg:h-10 items-center gap-3 rounded-control px-3 text-sm outline-none transition-colors duration-150';

function NavRow({
  item,
  active,
  collapsed,
  scope,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  scope: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const content = (
    <>
      {active ? (
        <motion.span
          layoutId={`nav-active-${scope}`}
          className="absolute inset-0 rounded-control bg-gold/10 ring-1 ring-inset ring-gold/25"
          transition={{ type: 'spring', stiffness: 520, damping: 42 }}
        />
      ) : null}
      <Icon
        className={cn(
          'relative size-[1.125rem] shrink-0 transition-colors',
          active ? 'text-gold' : 'text-faint group-hover/item:text-muted',
        )}
        aria-hidden
      />
      <span
        className={cn(
          'relative min-w-0 flex-1 truncate text-left transition-opacity duration-150',
          collapsed && 'sr-only',
        )}
      >
        {item.label}
        {item.status === 'soon' ? (
          <span className="sr-only">, {COMING_SOON_LABEL.toLowerCase()}</span>
        ) : null}
      </span>
      {item.status === 'soon' && !collapsed ? (
        <Clock className="relative size-3.5 shrink-0 text-faint" aria-hidden />
      ) : null}
    </>
  );

  const element =
    item.status === 'live' ? (
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={cn(row, active ? 'text-fg' : 'text-muted hover:bg-surface-2/70 hover:text-fg')}
      >
        {content}
      </Link>
    ) : (
      // Listed for permission-aware discovery, but not navigable until its sprint ships.
      <button
        type="button"
        aria-disabled="true"
        onClick={(e) => e.preventDefault()}
        className={cn(row, 'cursor-not-allowed text-faint')}
      >
        {content}
      </button>
    );

  const tip = item.status === 'soon' ? `${item.label} — ${COMING_SOON_LABEL}` : item.label;
  if (!collapsed && item.status === 'live') return element;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{element}</TooltipTrigger>
      <TooltipContent side="right">{tip}</TooltipContent>
    </Tooltip>
  );
}

export function SidebarNav({ user, collapsed, scope, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const active = findNavItem(pathname);
  const activeHref = active?.item.href;
  const groups = visibleNav(user);
  // Defaults: the first group and the group holding the current page are open; a click overrides that group.
  const [override, setOverride] = useState<Record<string, boolean>>({});
  const defaultOpen = (label: string) =>
    label === groups[0]?.label || label === active?.group.label;
  const toggle = (label: string) =>
    setOverride((prev) => ({ ...prev, [label]: !(prev[label] ?? defaultOpen(label)) }));

  return (
    <LayoutGroup id={scope}>
      <nav
        aria-label="Navegación principal"
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4"
      >
        {groups.map((group, i) => {
          // The icon rail has no headings, so every group is shown.
          const isOpen = collapsed || (override[group.label] ?? defaultOpen(group.label));
          const listId = `${scope}-group-${i}`;
          return (
            <div key={group.label} className={cn(i > 0 && (collapsed ? 'mt-2' : 'mt-1'))}>
              {collapsed ? (
                i > 0 ? (
                  <div className="mx-3 mb-2 h-px bg-line" aria-hidden />
                ) : null
              ) : (
                <h2>
                  <button
                    type="button"
                    onClick={() => toggle(group.label)}
                    aria-expanded={isOpen}
                    aria-controls={listId}
                    className="group/head flex w-full items-center justify-between rounded-control px-3 py-3 text-[0.6875rem] font-medium uppercase lg:py-2 tracking-[0.16em] text-faint transition-colors hover:text-muted"
                  >
                    {group.label}
                    <ChevronDown
                      className={cn(
                        'size-3.5 transition-transform duration-200 ease-(--ease-out-expo)',
                        !isOpen && '-rotate-90',
                      )}
                      aria-hidden
                    />
                  </button>
                </h2>
              )}
              <div
                id={listId}
                inert={!isOpen}
                className="grid transition-[grid-template-rows] duration-300 ease-(--ease-out-expo)"
                style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
              >
                <ul className="min-h-0 overflow-hidden">
                  {group.items.map((item) => (
                    <li key={item.href} className="py-px">
                      <NavRow
                        item={item}
                        active={item.href === activeHref}
                        collapsed={collapsed}
                        scope={scope}
                        onNavigate={onNavigate}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}

export function Sidebar({
  user,
  collapsed,
  onToggle,
}: {
  user: SessionUser;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      data-collapsed={collapsed}
      className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-sidebar transition-[width] duration-300 ease-(--ease-out-expo) lg:flex"
      style={{ width: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)' }}
    >
      <div className="flex h-[var(--header-height)] shrink-0 items-center px-6">
        <Link href="/" aria-label="ELODIA OS, ir al inicio" className="rounded-sm">
          <Wordmark compact={collapsed} />
        </Link>
      </div>
      <SidebarNav user={user} collapsed={collapsed} scope="desktop" />
      <div className="border-t border-line p-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggle}
              aria-label={collapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
              aria-expanded={!collapsed}
              className={cn(row, 'text-faint hover:bg-surface-2/70 hover:text-fg')}
            >
              {collapsed ? (
                <ChevronsRight className="size-[1.125rem]" aria-hidden />
              ) : (
                <ChevronsLeft className="size-[1.125rem]" aria-hidden />
              )}
              <span className={cn(collapsed && 'sr-only')}>Contraer</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{collapsed ? 'Expandir' : 'Contraer'}</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
