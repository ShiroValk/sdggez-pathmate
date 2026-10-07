import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { BusinessException } from '../interfaces/exception.interface';
import { HTTP_STATUS_TO_RESPONSE_CODE_MAP, ResponseCode } from '../constants/api_response_code';
import { ApiErrorResponse } from '../interfaces/api_response.interface';
import { diagnostic, DiagnosticRequest, sanitizedFrames } from '../logger';

/** Drizzle wraps driver errors. Read only bounded error codes; never publish
 * underlying SQL, values, exception text or cause objects.
 */
function databaseErrorCode(exception: unknown): string | undefined {
  let current = exception;
  for (let depth = 0; depth < 8 && current && typeof current === 'object'; depth++) {
    const error = current as { code?: unknown; cause?: unknown };
    if (typeof error.code === 'string') return error.code;
    if (error.cause === current) break;
    current = error.cause;
  }
  return undefined;
}

// 全局异常过滤器，用于捕获所有未处理的异常
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<DiagnosticRequest>();
     
    // 如果响应头已发送，则不处理
    if (response.headersSent) {
      return;
    }

    let errorResponse: Omit<ApiErrorResponse, 'httpStatus'>;
    let httpStatus: HttpStatus;
    const databaseCode = databaseErrorCode(exception);

    if (exception instanceof BusinessException) {
      // 业务异常
      httpStatus = exception.httpStatus;
      errorResponse = {
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
          fieldErrors: exception.fieldErrors,
          timestamp: Date.now(),
        },
      };
    } else if (exception instanceof HttpException) {
      // HTTP异常
      httpStatus = exception.getStatus() as HttpStatus;
      const exceptionResponse = exception.getResponse();
      const message = typeof exceptionResponse === 'object' ? (exceptionResponse as { message?: unknown }).message : exceptionResponse;

      errorResponse = {
        error: {
          code: HTTP_STATUS_TO_RESPONSE_CODE_MAP[httpStatus],
          message: typeof message === 'string' ? message : Array.isArray(message) && message.every(item => typeof item === 'string') ? message.join('；') : exception.message,
          details: typeof exceptionResponse === 'object' ? JSON.stringify(exceptionResponse) : undefined,
          timestamp: Date.now(),
        },
      };
    } else if (
      databaseCode === '22P02'
    ) {
      // Postgres invalid_text_representation：路径/查询参数与列类型不匹配（最常见是非法 UUID）
      // 与「合法 UUID 但记录不存在」走同一条 not-found 语义，避免 500 噪声
      httpStatus = HttpStatus.NOT_FOUND;
      errorResponse = {
        error: {
          code: ResponseCode.NOT_FOUND,
          message: '资源不存在',
          timestamp: Date.now(),
        },
      };
    } else if (
      databaseCode && (/^(08|53|57P)/.test(databaseCode) ||
       ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'CONNECT_TIMEOUT', 'CONNECTION_CLOSED', 'CONNECTION_ENDED', '28P01', '28000'].includes(databaseCode))
    ) {
      httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
      errorResponse = { error: { code: ResponseCode.SERVICE_UNAVAILABLE, message: '資料庫暫時不可用，請稍後重試', timestamp: Date.now() } };
    } else {
      // 未知异常
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      errorResponse = {
        error: {
          code: ResponseCode.INTERNAL_ERROR,
          message: '服务器内部错误',
          timestamp: Date.now(),
        },
      };
    }

    diagnostic({ level: httpStatus >= 500 ? 'error' : 'warn', operation: 'http_failure', result: 'rejected', requestId: request.requestId, httpStatus, errorCode: errorResponse.error.code, accountId: request.memoAccount?.accountId, frames: httpStatus === 500 ? sanitizedFrames(exception) : undefined });
    response.status(httpStatus).json(errorResponse);
  }
}
