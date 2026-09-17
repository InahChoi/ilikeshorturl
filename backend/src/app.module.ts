// * NestJS에서 Module을 만들기 위한 기능
import { Module } from '@nestjs/common';

// * .env 환경변수를 애플리케이션 설정으로 관리
import { ConfigModule } from '@nestjs/config';

// * env 값을 설정 객체로 변환
import configuration from './config/configuration';

// * env 유효성 검사
import { validate } from './config/env.validation';

// * DB를 사용할 수 있게 해주는 PrismaModule
import { PrismaModule } from './prisma/prisma.module';

// * 사용자 기능을 담당하는 UsersModule
import { UsersModule } from './users/users.module';

// * 로그인/JWT 발급을 담당하는 AuthModule
import { AuthModule } from './auth/auth.module';

// * 단축 URL 생성을 담당하는 ShortUrlsModule
import { ShortUrlsModule } from './short-urls/short-urls.module';

// * 약관 조회를 담당하는 TermsModule
import { TermsModule } from './terms/terms.module';

// * FAQ 조회를 담당하는 FaqsModule
import { FaqsModule } from './faqs/faqs.module';

@Module({
  imports: [
    // * 전역 ConfigModule: .env 로드 + 유효성 검사 + configuration() 등록
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: '.env',
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    TermsModule,
    FaqsModule,
    // * RedirectController(GET /:shortCode)는 정적 경로보다 나중에 등록
    ShortUrlsModule,
  ],

  // * Controller
  controllers: [],

  // * Provider
  providers: [],
})
export class AppModule {}
