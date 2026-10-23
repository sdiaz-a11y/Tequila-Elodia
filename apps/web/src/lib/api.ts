import type { ProblemDetails } from '@elodia/shared';

/** Same-origin: next.config rewrites /api/v1/* to the API, so the session cookie belongs to the web origin. */
const BASE = '/api/v1';
export const CSRF_HEADER = 'x-elodia-csrf';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fieldErrors: Record<string, string>;

  constructor(problem: Partial<ProblemDetails> & { status: number }) {
    super(problem.detail ?? problem.title ?? 'Error de red');
    this.name = 'ApiError';
    this.status = problem.status;
    this.code = problem.code;
    this.fieldErrors = Object.fromEntries((problem.errors ?? []).map((e) => [e.path, e.message]));
  }
}

export async function parseProblem(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as Partial<ProblemDetails>;
    return new ApiError({ ...body, status: res.status });
  } catch {
    return new ApiError({ status: res.status, title: 'Respuesta inesperada del servidor' });
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

export async function api<T = void>(
  path: string,
  { method = 'GET', body, signal }: RequestOptions = {},
): Promise<T> {
  const unsafe = method !== 'GET';
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      signal,
      credentials: 'same-origin',
      headers: {
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(unsafe ? { [CSRF_HEADER]: '1' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError({
      status: 0,
      title: 'Sin conexión',
      detail: 'No se pudo contactar al servidor. Revisa tu conexión e inténtalo de nuevo.',
    });
  }
  if (!res.ok) throw await parseProblem(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
