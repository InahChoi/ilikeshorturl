// * HTTP 예외 필터 기능
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';

// * Express Request / Response 타입
import { Request, Response } from 'express';

// * Prisma 에러 타입
import { Prisma } from '../../generated/prisma/client';

// * 통일된 에러 응답 생성 유틸
import { buildErrorResponse } from '../utils/build-error-response.util';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, error } = this.mapPrismaError(exception);

    response
      .status(statusCode)
      .json(buildErrorResponse(statusCode, message, error, request.url));
  }

  // * Prisma 에러 코드를 HTTP status code와 메시지로 변환
  private mapPrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    message: string;
    error: string;
  } {
    switch (exception.code) {
      case 'P2002': {
        // * UNIQUE 제약 위반 (예: 이메일 중복)
        const target = exception.meta?.target as string[] | undefined;

        if (target?.includes('email')) {
          return {
            statusCode: HttpStatus.CONFLICT,
            message: '이미 사용 중인 이메일입니다.',
            error: 'Conflict',
          };
        }

        return {
          statusCode: HttpStatus.CONFLICT,
          message: '이미 존재하는 데이터입니다.',
          error: 'Conflict',
        };
      }

      case 'P2025':
        // * 조회/수정/삭제 대상 레코드 없음
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: '요청한 데이터를 찾을 수 없습니다.',
          error: 'Not Found',
        };

      case 'P2003':
        // * FK 제약 위반
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: '연관된 데이터가 존재하지 않습니다.',
          error: 'Bad Request',
        };

      default:
        // * 그 외 Prisma 에러는 서버 오류로 처리
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: '데이터베이스 처리 중 오류가 발생했습니다.',
          error: 'Internal Server Error',
        };
    }
  }
}
