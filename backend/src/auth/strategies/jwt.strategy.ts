// * NestJS에서 Injectable Provider를 만들기 위한 기능
import { Injectable } from '@nestjs/common';

// * ConfigService로 JWT_SECRET에 접근
import { ConfigService } from '@nestjs/config';

// * Passport JWT Strategy 기능
import { PassportStrategy } from '@nestjs/passport';

// * Authorization Bearer 토큰에서 JWT를 추출
import { ExtractJwt, Strategy } from 'passport-jwt';

// * 애플리케이션 설정 타입
import { AppConfig } from '../../config/configuration';

// * JWT에 담겨 있는 payload 형식
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    // * JWT 검증에 사용할 secret을 ConfigService에서 가져옴
    configService: ConfigService<AppConfig, true>,
  ) {
    super({
      // * Authorization: Bearer <token> 헤더에서 JWT 추출
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // * 만료된 토큰은 거부
      ignoreExpiration: false,

      // * JWT 서명 검증에 사용할 비밀키
      secretOrKey: configService.get('jwt.secret', { infer: true }),
    });
  }

  // * JWT 검증이 성공하면 payload를 request.user에 넣음
  validate(payload: JwtPayload) {
    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}
