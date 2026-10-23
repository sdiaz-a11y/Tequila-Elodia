import { describe, expect, it } from 'vitest';
import { MAX_PAGE_SIZE, pageToSkipTake, paginated, paginationQuerySchema } from './http';

describe('pagination', () => {
  it('applies defaults and coerces query strings', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, pageSize: 25 });
    expect(paginationQuerySchema.parse({ page: '3', pageSize: '10' })).toEqual({
      page: 3,
      pageSize: 10,
    });
  });
  it('rejects out-of-range values', () => {
    expect(paginationQuerySchema.safeParse({ page: 0 }).success).toBe(false);
    expect(paginationQuerySchema.safeParse({ pageSize: MAX_PAGE_SIZE + 1 }).success).toBe(false);
  });
  it('computes skip/take and the response envelope', () => {
    const q = paginationQuerySchema.parse({ page: 3, pageSize: 10 });
    expect(pageToSkipTake(q)).toEqual({ skip: 20, take: 10 });
    expect(paginated(['a'], 41, q)).toEqual({
      data: ['a'],
      meta: { page: 3, pageSize: 10, total: 41 },
    });
  });
});
