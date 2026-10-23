import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ZodError } from 'zod';
import type { ProblemDetails } from '@elodia/shared';
import type { RequestWithId } from './request-id.middleware';

const TITLES: Record<number, string> = {
  400: 'Solicitud inválida',
  401: 'No autenticado',
  403: 'Acceso denegado',
  404: 'No encontrado',
  409: 'Conflicto',
  422: 'Entidad no procesable',
  429: 'Demasiadas solicitudes',
  500: 'Error interno',
  503: 'Servicio no disponible',
};

interface PrismaLikeError {
  name: string;
  code: string;
}

function isPrismaKnownError(e: unknown): e is PrismaLikeError {
  return (
    typeof e === 'object' &&
    e !== null &&
    (e as PrismaLikeError).name === 'PrismaClientKnownRequestError' &&
    typeof (e as PrismaLikeError).code === 'string'
  );
}

/** Maps every error to RFC 7807 `application/problem+json`. Internals are never leaked on 5xx. */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errors');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<RequestWithId>();
    const problem = this.toProblem(exception);
    problem.instance = req.originalUrl?.split('?')[0];
    problem.requestId = req.id;

    if (problem.status >= 500) {
      const err = exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(
        { requestId: req.id, method: req.method, path: req.path, message: err.message },
        err.stack,
      );
    } else {
      this.logger.warn({
        requestId: req.id,
        method: req.method,
        path: req.path,
        status: problem.status,
        title: problem.title,
      });
    }

    res.status(problem.status).type('application/problem+json').json(problem);
  }

  private toProblem(exception: unknown): ProblemDetails {
    if (exception instanceof ZodError) {
      return {
        type: 'about:blank',
        title: TITLES[400]!,
        status: HttpStatus.BAD_REQUEST,
        detail: 'Los datos enviados no son válidos.',
        errors: exception.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const raw =
        typeof body === 'string' ? body : (body as { message?: string | string[] }).message;
      const detail = Array.isArray(raw) ? raw.join('; ') : raw;
      return {
        type: 'about:blank',
        title: TITLES[status] ?? exception.name,
        status,
        detail: status >= 500 ? undefined : detail,
      };
    }
    if (isPrismaKnownError(exception)) {
      if (exception.code === 'P2002')
        return this.simple(409, 'Ya existe un registro con esos datos.');
      if (exception.code === 'P2003')
        return this.simple(409, 'El registro está relacionado con otros datos.');
      if (exception.code === 'P2025') return this.simple(404, 'El registro no existe.');
    }
    return this.simple(500);
  }

  private simple(status: number, detail?: string): ProblemDetails {
    return { type: 'about:blank', title: TITLES[status] ?? 'Error', status, detail };
  }
}
