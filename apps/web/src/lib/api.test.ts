import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from './api';

afterEach(() => vi.unstubAllGlobals());

const respond = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('api client', () => {
  it('sends the CSRF header only on unsafe methods, with same-origin credentials', async () => {
    const fetchMock = vi.fn(async () => respond(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    await api('/auth/me');
    await api('/auth/logout', { method: 'POST' });
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0]![0]).toBe('/api/v1/auth/me');
    expect((calls[0]![1].headers as Record<string, string>)['x-elodia-csrf']).toBeUndefined();
    expect((calls[1]![1].headers as Record<string, string>)['x-elodia-csrf']).toBe('1');
    expect(calls[1]![1].credentials).toBe('same-origin');
  });

  it('turns problem+json into an ApiError with code and field errors', async () => {
    vi.stubGlobal('fetch', async () =>
      respond(401, {
        status: 401,
        title: 'No autenticado',
        detail: 'Se requiere el código',
        code: 'totp_required',
        errors: [{ path: 'email', message: 'Inválido' }],
      }),
    );
    const err = await api('/auth/login', { method: 'POST', body: {} }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 401,
      code: 'totp_required',
      message: 'Se requiere el código',
      fieldErrors: { email: 'Inválido' },
    });
  });

  it('handles 204 and network failures', async () => {
    vi.stubGlobal('fetch', async () => new Response(null, { status: 204 }));
    await expect(api('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('network');
    });
    await expect(api('/auth/me')).rejects.toMatchObject({ status: 0, name: 'ApiError' });
  });
});
