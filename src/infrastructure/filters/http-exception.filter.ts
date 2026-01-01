import {
  type ExceptionFilter,
  Catch,
  type ArgumentsHost,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { type Response } from 'express';

import { IdempotencyKeyConflictError } from '../../application/idempotency-store';
import { CartVersionConflictError } from '../../domain/interfaces/cart-repository.port';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof CartVersionConflictError) {
      response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        error: 'CartVersionConflict',
        message: exception.message,
        code: 'VERSION_CONFLICT',
        cartId: exception.cartId,
        expectedVersion: exception.expectedVersion,
        actualVersion: exception.actualVersion,
      });
      return;
    }

    if (exception instanceof IdempotencyKeyConflictError) {
      response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        error: 'IdempotencyKeyConflict',
        message: exception.message,
        code: 'IDEMPOTENCY_KEY_CONFLICT',
        idempotencyKey: exception.idempotencyKey,
        expectedFingerprint: exception.expectedFingerprint,
        receivedFingerprint: exception.receivedFingerprint,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        response.status(status).json(exceptionResponse);
      } else {
        response.status(status).json({
          statusCode: status,
          message: exceptionResponse,
        });
      }
      return;
    }

    if (exception instanceof Error && exception.message.includes('not found')) {
      response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'NotFound',
        message: exception.message,
        code: 'RESOURCE_NOT_FOUND',
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'InternalServerError',
      message: 'An unexpected error occurred',
    });
  }
}
