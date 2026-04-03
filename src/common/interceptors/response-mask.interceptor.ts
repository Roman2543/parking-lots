import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { Observable, map } from 'rxjs';
import { SUCCESS_MESSAGE_KEY } from '../decorators/success-message.decorator';

export interface ApiSuccessResponse<T> {
  code: string;
  message: string;
  data: T;
}

function isMaskedResponse(
  value: unknown,
): value is ApiSuccessResponse<unknown> {
  // Prevent double wrapping when a handler already returns masked payload.
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return 'code' in value && 'message' in value && 'data' in value;
}

@Injectable()
export class ResponseMaskInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    // Allow per-endpoint success message via metadata decorator.
    const message =
      this.reflector.get<string>(SUCCESS_MESSAGE_KEY, context.getHandler()) ??
      'Success';
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        // If response is already in contract shape, keep it as-is.
        if (isMaskedResponse(data)) {
          return data as ApiSuccessResponse<T>;
        }

        // Normalize successful handler output into a single API contract.
        const body = {
          code: String(response.statusCode ?? HttpStatus.OK),
          message,
          data,
        };

        // Keep a copy for downstream logging/middleware if needed.
        response.locals.__responseBody = body;

        return body;
      }),
    );
  }
}
