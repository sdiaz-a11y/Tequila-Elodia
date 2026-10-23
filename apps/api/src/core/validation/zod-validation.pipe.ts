import { PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

/** Validates and transforms a body/query/param with a Zod schema. Failures become 400 problem+json. */
export class ZodValidationPipe<S extends z.ZodType> implements PipeTransform<unknown, z.output<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.output<S> {
    return this.schema.parse(value);
  }
}
