// * NestJS에서 Module을 만들기 위한 기능
import { Module } from '@nestjs/common';

// * ConfigService로 JWT 설정값을 가져옴
import { ConfigModule, ConfigService } from '@nestjs/config';

// * JWT 토큰 발급/검증 모듈
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';

// * Passport 인증 모듈
import { PassportModule } from '@nestjs/passport';

// * 애플리케이션 설정 타입
import { AppConfig } from '../config/configuration';

// * 사용자 조회를 위해 UsersModule 사용
import { UsersModule } from '../users/users.module';

// * 인증 관련 Controller
import { AuthController } from './auth.controller';

// * 로그인/JWT 발급을 처리하는 Service
import { AuthService } from './auth.service';

// * JWT 검증 Strategy
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    // * AuthService에서 UsersService를 사용할 수 있도록 연결
    UsersModule,

    // * Passport JWT 전략을 기본으로 사용
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // * ConfigService 값을 읽어 JwtModule을 비동기로 설정
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => ({
        secret: configService.get('jwt.secret', { infer: true }),
        signOptions: {
          expiresIn: configService.get('jwt.expiresIn', {
            infer: true,
          }) as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],

  // * AuthController를 AuthModule에서 사용할 수 있도록 등록
  controllers: [AuthController],

  // * AuthService, JwtStrategy를 AuthModule에서 사용할 수 있도록 등록
  providers: [AuthService, JwtStrategy],

  // * 다른 Module에서도 JwtAuthGuard / JwtModule을 사용할 수 있도록 공개
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
