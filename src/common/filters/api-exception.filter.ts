import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

interface ErrorResponseBody {
  code: string;
  message: string;
  data: null;
  error?: Record<string, unknown>;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    // Preserve HTTP exceptions (status + message) but normalize body shape.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      response.status(status).json(this.formatHttpException(exception, status));
      return;
    }

    // Fallback for unexpected runtime errors.
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: String(HttpStatus.INTERNAL_SERVER_ERROR),
      message:
        exception instanceof Error
          ? exception.message
          : 'Internal server error',
      data: null,
    } satisfies ErrorResponseBody);
  }

  private formatHttpException(
    exception: HttpException,
    status: number,
  ): ErrorResponseBody {
    const exceptionResponse = exception.getResponse();

    // Some HttpException variants return a plain string body.
    if (typeof exceptionResponse === 'string') {
      return {
        code: String(status),
        message: exceptionResponse,
        data: null,
      };
    }

    const responseBody = exceptionResponse as {
      message?: string | string[];
      error?: string;
      validation?: Record<string, string>;
    };

    // Custom validation payload from ValidationPipe exceptionFactory.
    if (responseBody.validation) {
      return {
        code: String(status),
        message:
          typeof responseBody.message === 'string'
            ? responseBody.message
            : 'Validation error',
        data: null,
        error: {
          validation: responseBody.validation,
        },
      };
    }

    // Default mapping for common HttpException JSON responses.
    return {
      code: String(status),
      message: this.resolveMessage(
        responseBody.message,
        responseBody.error,
        exception,
      ),
      data: null,
    };
  }

  private resolveMessage(
    message: string | string[] | undefined,
    fallback: string | undefined,
    exception: HttpException,
  ): string {
    if (typeof message === 'string') {
      return message;
    }

    if (Array.isArray(message) && message.length > 0) {
      return message.join(', ');
    }

    return fallback ?? exception.message;
  }
}
