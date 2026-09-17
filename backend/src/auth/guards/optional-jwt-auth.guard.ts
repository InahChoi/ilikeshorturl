// * NestJS AuthGuard를 확장하기 위한 기능
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// * JWT가 있으면 검증하고, 없으면 null user로 통과
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // * 토큰이 없거나 유효하지 않아도 요청 자체는 막지 않음
  handleRequest<TUser>(err: Error | null, user: TUser): TUser | null {
    if (err || !user) {
      return null;
    }

    return user;
  }
}
