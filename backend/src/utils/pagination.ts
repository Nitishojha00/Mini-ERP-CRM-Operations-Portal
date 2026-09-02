import { Request } from 'express';

export function getPagination(req: Request) {
  const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '20', 10), 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function buildPaginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(Math.ceil(total / limit), 1),
  };
}
