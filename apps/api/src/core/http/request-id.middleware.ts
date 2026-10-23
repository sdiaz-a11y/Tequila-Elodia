import { randomUUID } from 'node:crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';
const SAFE_ID = /^[A-Za-z0-9._-]{8,64}$/;

export type RequestWithId = Request & { id?: string };

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction): void {
    const incoming = req.header(REQUEST_ID_HEADER);
    // Only accept well-formed client ids; anything else could be used for log injection.
    req.id = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader(REQUEST_ID_HEADER, req.id);
    next();
  }
}
