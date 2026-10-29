'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { setRoleCapability } from '@/app/actions/roles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CAPABILITIES, type Capability } from '@/lib/roles';

const LABELS: Record<Capability, [string, string]> = {
  read: ['Ver la plataforma', 'Consultar la información. Sin esto el rol no ve nada.'],
  write: [
    'Comercial: crear y editar',
    'Empresas, contactos, oportunidades, actividades, cotizaciones y pedidos.',
  ],
  manage: ['Gestionar al equipo comercial', 'Eliminar registros comerciales y definir metas.'],
  admin: ['Administrar', 'Equipo de trabajo, etapas del pipeline y configuración.'],
  content: ['Contenido y campañas', 'Crear y editar piezas del calendario, campañas y redes.'],
  approve: [
    'Aprobar',
    'Aprobar contenido y documentos, marcar archivos como oficiales y eliminar metas.',
  ],
  ops: ['Operación', 'Proyectos, productos y registrar avances de metas.'],
  collect: ['Registrar cobros', 'Capturar y eliminar pagos de pedidos.'],
  finance: ['Finanzas', 'Ver y editar ingresos y gastos, y exportarlos.'],
  compliance: ['Cumplimiento', 'Crear y editar documentos de cumplimiento.'],
  inventory: ['Inventario', 'Almacenes, lotes y movimientos de inventario.'],
};

export function RoleMatrix({
  roles,
}: {
  roles: { key: string; label: string; granted: string[] }[];
}) {
  const [state, setState] = useState(() =>
    Object.fromEntries(roles.map((r) => [r.key, new Set(r.granted)])),
  );
  const [pending, start] = useTransition();

  function toggle(role: string, cap: Capability, enabled: boolean) {
    const before = state[role]!;
    setState((s) => {
      const next = new Set(s[role]);
      if (enabled) next.add(cap);
      else next.delete(cap);
      return { ...s, [role]: next };
    });
    start(async () => {
      const res = await setRoleCapability({ role, capability: cap, enabled });
      if (!res.ok) {
        setState((s) => ({ ...s, [role]: before }));
        toast.error(res.error ?? 'No se pudo guardar el cambio.');
      } else toast.success('Permiso actualizado');
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {roles.map((r) => (
        <Card key={r.key}>
          <CardHeader>
            <CardTitle>{r.label}</CardTitle>
            <CardDescription>
              {state[r.key]!.size} de {CAPABILITIES.length} permisos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3">
              {CAPABILITIES.map((cap) => {
                const id = `${r.key}-${cap}`;
                return (
                  <li key={cap} className="flex items-start gap-3">
                    <input
                      id={id}
                      type="checkbox"
                      checked={state[r.key]!.has(cap)}
                      disabled={pending}
                      onChange={(e) => toggle(r.key, cap, e.target.checked)}
                      className="mt-1 size-4 shrink-0 accent-[var(--gold-primary)]"
                    />
                    <label htmlFor={id} className="grid min-w-0 gap-0.5 text-sm">
                      <span className="font-medium text-fg">{LABELS[cap][0]}</span>
                      <span className="text-xs text-muted">{LABELS[cap][1]}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
