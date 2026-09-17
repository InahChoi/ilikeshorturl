// * HTTP 예외 필터 기능
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';

// * Express Request / Response 타입
import { Request, Response } from 'express';

// * 통일된 에러 응답 생성 유틸
import { buildErrorResponse } from '../utils/build-error-response.util';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const { message, error } = this.extractErrorDetails(
      exception,
      exceptionResponse,
    );

    response
      .status(statusCode)
      .json(buildErrorResponse(statusCode, message, error, request.url));
  }

  // * HttpException 응답 body에서 message와 error 필드를 추출
  private extractErrorDetails(
    exception: HttpException,
    exceptionResponse: string | object,
  ): { message: string | string[]; error: string } {
    if (typeof exceptionResponse === 'string') {
      return {
        message: exceptionResponse,
        error: exception.name,
      };
    }

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseBody = exceptionResponse as Record<string, unknown>;

      return {
        message:
          (responseBody.message as string | string[] | undefined) ??
          exception.message,
        error: (responseBody.error as string | undefined) ?? exception.name,
      };
    }

    return {
      message: exception.message,
      error: exception.name,
    };
  }
}
