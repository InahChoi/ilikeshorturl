// * HTTP 예외 필터 기능
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';

// * Express Request / Response 타입
import { Request, Response } from 'express';

// * 통일된 에러 응답 생성 유틸
import { buildErrorResponse } from '../utils/build-error-response.util';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // * 예상치 못한 에러는 서버 로그에 기록
    console.error(exception);

    const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

    response
      .status(statusCode)
      .json(
        buildErrorResponse(
          statusCode,
          '서버 내부 오류가 발생했습니다.',
          'Internal Server Error',
          request.url,
        ),
      );
  }
}
