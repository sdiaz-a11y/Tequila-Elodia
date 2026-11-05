'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, Boxes, Scale, TriangleAlert } from 'lucide-react';
import { animate, motion, useInView, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

export interface FinanceOverview {
  totalIncome: number;
  totalExpense: number;
  monthIncome: number;
  monthExpense: number;
  prevMonthBalance: number;
  monthLabel: string;
  series: { label: string; income: number; expense: number }[];
}

export interface InventoryOverview {
  available: number;
  onHand: number;
  reserved: number;
  presentations: number;
  low: number;
  valueAtCost: number | null;
  items: { label: string; available: number; minStock: number | null }[];
}

const EASE = [0.22, 1, 0.36, 1] as const;
const money = (v: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(v);
const units = (v: number) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(v);

/** Counts up to the value the first time it scrolls into view (instant with reduced motion). */
function CountUp({
  value,
  format,
  className,
}: {
  value: number;
  format: (v: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    if (reduce) {
      el.textContent = format(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.2,
      ease: EASE,
      onUpdate: (v) => (el.textContent = format(v)),
    });
    return () => controls.stop();
  }, [inView, value, format, reduce]);
  return (
    <span ref={ref} className={cn('tabular', className)}>
      {format(0)}
    </span>
  );
}

/** A bar that grows to its share once visible. */
function GrowBar({
  share,
  className,
  delay = 0,
  vertical = false,
}: {
  share: number;
  className?: string;
  delay?: number;
  vertical?: boolean;
}) {
  const s = Math.max(0, Math.min(1, share));
  return (
    <motion.span
      className={cn('block rounded-full', className)}
      style={
        vertical ? { height: `${s * 100}%`, originY: 1 } : { width: `${s * 100}%`, originX: 0 }
      }
      initial={vertical ? { scaleY: 0 } : { scaleX: 0 }}
      whileInView={vertical ? { scaleY: 1 } : { scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.9, delay, ease: EASE }}
    />
  );
}

const rise = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: 0.05 + i * 0.07, ease: EASE },
});

export function DashboardOverview({
  finance,
  inventory,
}: {
  finance: FinanceOverview | null;
  inventory: InventoryOverview | null;
}) {
  if (!finance && !inventory) return null;
  return (
    <section aria-label="Finanzas e inventario" className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {finance ? <FinancePanel f={finance} /> : null}
      {inventory ? <InventoryPanel inv={inventory} delayBase={finance ? 4 : 0} /> : null}
    </section>
  );
}

function FinancePanel({ f }: { f: FinanceOverview }) {
  const balance = f.totalIncome - f.totalExpense;
  const monthBalance = f.monthIncome - f.monthExpense;
  const flow = Math.max(1, f.totalIncome + f.totalExpense);
  const max = Math.max(1, ...f.series.flatMap((s) => [s.income, s.expense]));
  const vsPrev = monthBalance - f.prevMonthBalance;

  return (
    <>
      {/* ── Balance general: the headline ───────────────────────────────── */}
      <motion.div
        {...rise(0)}
        className="relative overflow-hidden rounded-panel border border-gold/30 bg-surface p-6 shadow-panel sm:p-8"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[radial-gradient(circle,rgb(216_183_119/0.22),transparent_65%)]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent"
        />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-end">
          <div className="grid gap-2">
            <p className="flex items-center gap-2 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-gold">
              <Scale className="size-3.5" aria-hidden /> Balance general
            </p>
            <CountUp
              value={balance}
              format={money}
              className={cn(
                'font-display text-5xl font-semibold leading-none tracking-tight sm:text-6xl',
                balance < 0 ? 'text-danger' : 'text-fg',
              )}
            />
            <p className="text-sm text-muted">
              Todo lo registrado en finanzas: ingresos menos gastos.
            </p>
          </div>
          <div className="grid gap-3">
            <div className="flex justify-between gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-muted">
                <ArrowUpRight className="size-4 text-success" aria-hidden /> Ingresos
              </span>
              <CountUp value={f.totalIncome} format={money} className="text-fg" />
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-muted">
                <ArrowDownRight className="size-4 text-danger" aria-hidden /> Gastos
              </span>
              <CountUp value={f.totalExpense} format={money} className="text-fg" />
            </div>
            <div
              className="flex h-2.5 overflow-hidden rounded-full bg-surface-3"
              role="img"
              aria-label={`Ingresos ${money(f.totalIncome)}, gastos ${money(f.totalExpense)}`}
            >
              <GrowBar share={f.totalIncome / flow} className="h-full rounded-none bg-success/80" />
              <GrowBar
                share={f.totalExpense / flow}
                delay={0.15}
                className="h-full rounded-none bg-danger/70"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── This month + 6-month trend ──────────────────────────────────── */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <motion.div
          {...rise(1)}
          className="grid gap-4 rounded-panel border border-line bg-surface p-5 shadow-panel"
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-fg">Balance del mes</p>
            <span className="text-xs capitalize text-faint">{f.monthLabel}</span>
          </div>
          <CountUp
            value={monthBalance}
            format={money}
            className={cn(
              'font-display text-4xl font-semibold leading-none',
              monthBalance < 0 ? 'text-danger' : 'text-gold',
            )}
          />
          <p className="text-xs text-muted">
            {vsPrev === 0
              ? 'Igual que el mes pasado'
              : `${vsPrev > 0 ? '▲' : '▼'} ${money(Math.abs(vsPrev))} ${vsPrev > 0 ? 'más' : 'menos'} que el mes pasado`}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1 rounded-control border border-line bg-surface-2/60 p-3">
              <span className="text-xs text-muted">Ingresos</span>
              <CountUp
                value={f.monthIncome}
                format={money}
                className="text-base font-semibold text-success"
              />
            </div>
            <div className="grid gap-1 rounded-control border border-line bg-surface-2/60 p-3">
              <span className="text-xs text-muted">Gastos</span>
              <CountUp
                value={f.monthExpense}
                format={money}
                className="text-base font-semibold text-danger"
              />
            </div>
          </div>
          <Link href="/finanzas" className="text-xs text-gold underline-offset-4 hover:underline">
            Ver finanzas
          </Link>
        </motion.div>

        <motion.div
          {...rise(2)}
          className="grid gap-4 rounded-panel border border-line bg-surface p-5 shadow-panel"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-fg">Últimos 6 meses</p>
            <span className="flex items-center gap-3 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-success/80" aria-hidden /> Ingresos
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-danger/70" aria-hidden /> Gastos
              </span>
            </span>
          </div>
          <div className="grid h-44 grid-cols-6 items-end gap-2 sm:gap-3" role="list">
            {f.series.map((s, i) => (
              <div
                key={s.label}
                role="listitem"
                className="grid h-full grid-rows-[minmax(0,1fr)_auto] gap-1.5"
                aria-label={`${s.label}: ingresos ${money(s.income)}, gastos ${money(s.expense)}`}
              >
                <div className="flex items-end justify-center gap-1">
                  <span className="flex h-full w-full max-w-4 items-end">
                    <GrowBar
                      vertical
                      share={s.income / max}
                      delay={0.1 + i * 0.06}
                      className="w-full rounded-b-none rounded-t-md bg-success/80"
                    />
                  </span>
                  <span className="flex h-full w-full max-w-4 items-end">
                    <GrowBar
                      vertical
                      share={s.expense / max}
                      delay={0.16 + i * 0.06}
                      className="w-full rounded-b-none rounded-t-md bg-danger/70"
                    />
                  </span>
                </div>
                <span className="text-center text-[0.6875rem] capitalize text-faint">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </>
  );
}

function InventoryPanel({ inv, delayBase }: { inv: InventoryOverview; delayBase: number }) {
  const max = Math.max(1, ...inv.items.map((i) => Math.max(i.available, i.minStock ?? 0)));
  const tiles = [
    { label: 'Disponible', value: inv.available, accent: 'text-gold' },
    { label: 'En existencia', value: inv.onHand, accent: 'text-fg' },
    { label: 'Apartado', value: inv.reserved, accent: 'text-fg' },
  ];
  return (
    <motion.div
      {...rise(delayBase)}
      className="grid gap-5 rounded-panel border border-line bg-surface p-5 shadow-panel sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="flex items-center gap-2 text-sm font-medium text-fg">
            <Boxes className="size-4 text-gold" aria-hidden /> Inventario
          </p>
          <p className="text-xs text-muted">
            {inv.presentations} {inv.presentations === 1 ? 'presentación' : 'presentaciones'}
            {inv.valueAtCost !== null ? ` · valor a costo ${money(inv.valueAtCost)}` : ''}
          </p>
        </div>
        {inv.low ? (
          <Link
            href="/inventario"
            className="flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs text-warning"
          >
            <TriangleAlert className="size-3.5" aria-hidden />
            {inv.low} bajo el mínimo
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="grid gap-1 rounded-control border border-line bg-surface-2/60 p-3"
          >
            <span className="text-xs text-muted">{t.label}</span>
            <CountUp
              value={t.value}
              format={units}
              className={cn('font-display text-2xl font-semibold sm:text-3xl', t.accent)}
            />
          </div>
        ))}
      </div>

      {inv.items.length ? (
        <ul className="grid gap-3">
          {inv.items.map((it, i) => {
            const low = it.minStock !== null && it.available < it.minStock;
            return (
              <li key={it.label} className="grid gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-fg">{it.label}</span>
                  <span className={cn('tabular shrink-0', low ? 'text-warning' : 'text-muted')}>
                    {units(it.available)}
                    {it.minStock !== null ? ` / mín. ${units(it.minStock)}` : ''}
                  </span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-surface-3">
                  <GrowBar
                    share={it.available / max}
                    delay={0.1 + i * 0.06}
                    className={cn('h-full', low ? 'bg-warning' : 'bg-gold')}
                  />
                  {it.minStock !== null ? (
                    <span
                      aria-hidden
                      className="absolute inset-y-0 w-px bg-fg/50"
                      style={{ left: `${(it.minStock / max) * 100}%` }}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          Aún no hay existencias registradas.{' '}
          <Link href="/inventario" className="text-gold underline-offset-4 hover:underline">
            Ir a inventario
          </Link>
        </p>
      )}
    </motion.div>
  );
}
