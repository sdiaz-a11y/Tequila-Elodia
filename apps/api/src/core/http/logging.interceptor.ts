import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import { Observable, tap } from 'rxjs';
import type { RequestWithId } from './request-id.middleware';

/** One structured line per successful request. Failures are logged by ProblemDetailsFilter. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const started = Date.now();
    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithId>();
    const res = http.getResponse<Response>();
    return next.handle().pipe(
      tap(() =>
        this.logger.log({
          requestId: req.id,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs: Date.now() - started,
        }),
      ),
    );
  }
}
