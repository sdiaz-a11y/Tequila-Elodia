/**
 * Turns a Postgres/PostgREST error into a message for people. Our own triggers raise readable Spanish text
 * (codes 42501 / 23514); RLS denials and everything else are reduced to a generic message so internals
 * never leak.
 */
export function explainDbError(error: { code?: string; message: string }): string {
  if (error.code === '42501' || error.code === '23514') {
    const ours =
      /^[a-záéíóúñ¿]/i.test(error.message) &&
      !/row-level security|permission denied|violates/i.test(error.message);
    return ours ? error.message : 'No tienes permiso para esta acción.';
  }
  if (error.code === '23505') return 'Ya existe un registro con esos datos.';
  if (error.code === '23503') return 'Este registro está ligado a otros y no se puede quitar así.';
  return 'No se pudo completar la acción. Inténtalo de nuevo.';
}
