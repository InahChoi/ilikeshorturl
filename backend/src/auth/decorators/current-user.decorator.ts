// * NestJS 커스텀 파라미터 데코레이터
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// * Express Request 타입
import * as express from 'express';

// * JWT에서 추출한 사용자 정보
import { AuthUser } from '../interfaces/auth-user.interface';

// * request.user를 컨트롤러 인자로 주입
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser | undefined => {
    const request = context
      .switchToHttp()
      .getRequest<express.Request & { user?: AuthUser }>();

    return request.user;
  },
);
