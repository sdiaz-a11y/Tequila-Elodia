export default function Loading() {
  return (
    <div className="grid gap-8" role="status" aria-live="polite" aria-label="Cargando">
      <div className="grid gap-4">
        <div className="skeleton h-12 w-2/3 max-w-lg" />
        <div className="skeleton h-4 w-48" />
      </div>
      <div className="skeleton h-72 w-full rounded-panel" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="skeleton h-56 rounded-panel" />
        <div className="skeleton h-56 rounded-panel" />
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
