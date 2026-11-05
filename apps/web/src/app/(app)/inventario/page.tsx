import type { Metadata } from 'next';
import { AccessDenied } from '@/components/ui/access-denied';
import { canInventory, canRead } from '@/lib/roles';
import { getSessionUser } from '@/lib/session';
import { createSupabase } from '@/lib/supabase/server';
import { InventoryPanel, type MovementRow, type StockRow } from './inventory-panel';

export const metadata: Metadata = { title: 'Inventario' };

export default async function InventoryPage() {
  const user = await getSessionUser();
  if (!user || !canRead(user)) return <AccessDenied />;
  const supabase = await createSupabase();
  const [variantsRes, stockRes, whRes, lotsRes, movRes] = await Promise.all([
    supabase
      .from('product_variants')
      .select('id,sku,presentation,min_stock,product:products!product_id(name)')
      .eq('status', 'active')
      .order('sku')
      .limit(500),
    supabase
      .from('inventory_stock')
      .select('variant_id,warehouse_id,on_hand,reserved,available')
      .limit(5000),
    supabase.from('warehouses').select('id,name,active').order('name'),
    supabase
      .from('inventory_lots')
      .select('id,lot_code,variant_id')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('inventory_movements')
      .select(
        'id,created_at,kind,qty,reason,order_id,variant:product_variants!variant_id(sku),warehouse:warehouses!warehouse_id(name),lot:inventory_lots!lot_id(lot_code),author:profiles!created_by(name)',
      )
      .is('corrects_id', null)
      .order('created_at', { ascending: false })
      .limit(25),
  ]);

  // Corrections of the movements on screen, oldest first, to rebuild each one's timeline.
  const shownIds = (movRes.data ?? []).map((m) => m.id as string);
  const { data: corrData } = shownIds.length
    ? await supabase
        .from('inventory_movements')
        .select('id,created_at,qty,reason,corrects_id,author:profiles!created_by(name)')
        .in('corrects_id', shownIds)
        .order('created_at', { ascending: true })
    : { data: [] };
  const corrections = (corrData ?? []) as unknown as {
    id: string;
    created_at: string;
    qty: number;
    reason: string | null;
    corrects_id: string;
    author: { name: string } | null;
  }[];

  const whName = new Map((whRes.data ?? []).map((w) => [w.id as string, w.name as string]));
  const rows = (stockRes.data ?? []) as {
    variant_id: string;
    warehouse_id: string;
    on_hand: number;
    reserved: number;
    available: number;
  }[];
  const variants = (variantsRes.data ?? []) as unknown as {
    id: string;
    sku: string;
    presentation: string;
    min_stock: number | null;
    product: { name: string } | null;
  }[];

  const stock: StockRow[] = variants.map((v) => {
    const mine = rows.filter((r) => r.variant_id === v.id);
    const sum = (k: 'on_hand' | 'reserved' | 'available') =>
      mine.reduce((t, r) => t + Number(r[k]), 0);
    return {
      variantId: v.id,
      sku: v.sku,
      product: v.product?.name ?? '—',
      presentation: v.presentation,
      minStock: v.min_stock === null ? null : Number(v.min_stock),
      onHand: sum('on_hand'),
      reserved: sum('reserved'),
      available: sum('available'),
      byWarehouse: mine
        .filter((r) => Number(r.on_hand) !== 0 || Number(r.reserved) !== 0)
        .map((r) => ({
          name: whName.get(r.warehouse_id) ?? '—',
          onHand: Number(r.on_hand),
          reserved: Number(r.reserved),
        })),
    };
  });

  const movements: MovementRow[] = (
    (movRes.data ?? []) as unknown as {
      id: string;
      created_at: string;
      kind: string;
      qty: number;
      reason: string | null;
      order_id: string | null;
      variant: { sku: string } | null;
      warehouse: { name: string } | null;
      lot: { lot_code: string } | null;
      author: { name: string } | null;
    }[]
  ).map((m) => {
    // Stock effect: an entry adds, an exit subtracts, an adjustment carries its own sign.
    const shown = (effect: number) => (m.kind === 'out' ? -effect : effect);
    let effect = m.kind === 'out' ? -Number(m.qty) : Number(m.qty);
    const history = corrections
      .filter((c) => c.corrects_id === m.id)
      .map((c) => {
        const from = shown(effect);
        effect += Number(c.qty);
        return {
          id: c.id,
          created_at: c.created_at,
          reason: c.reason,
          who: c.author?.name ?? null,
          from,
          to: shown(effect),
        };
      });
    return {
      id: m.id,
      created_at: m.created_at,
      kind: m.kind,
      qty: shown(effect),
      originalQty: Number(m.qty),
      reason: m.reason,
      sku: m.variant?.sku ?? '—',
      warehouse: m.warehouse?.name ?? '—',
      lot: m.lot?.lot_code ?? null,
      who: m.author?.name ?? null,
      editable: ['in', 'out', 'adjust'].includes(m.kind) && !m.order_id,
      history,
    };
  });

  return (
    <div className="animate-fade-up grid grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-2">
        <p className="text-sm text-muted">Operaciones</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">Inventario</h1>
        <p className="max-w-2xl text-sm text-muted">
          Cuánto producto hay, cuánto está apartado para pedidos y cuánto puedes vender. Cada cambio
          es un movimiento registrado.
        </p>
      </header>
      <InventoryPanel
        stock={stock}
        movements={movements}
        variants={variants.map((v) => ({
          value: v.id,
          label: `${v.product?.name ?? ''} · ${v.presentation} (${v.sku})`,
        }))}
        warehouses={(whRes.data ?? [])
          .filter((w) => w.active)
          .map((w) => ({ value: w.id as string, label: w.name as string }))}
        lots={(lotsRes.data ?? []).map((l) => ({
          value: l.id as string,
          label: l.lot_code as string,
          variantId: l.variant_id as string,
        }))}
        canEdit={canInventory(user)}
      />
    </div>
  );
}
