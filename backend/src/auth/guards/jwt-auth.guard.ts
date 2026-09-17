// * NestJS AuthGuard를 확장하기 위한 기능
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// * JWT Strategy를 사용하는 Guard
// * JWT Authentication이 필요한 API에 @UseGuards(JwtAuthGuard)로 적용
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
