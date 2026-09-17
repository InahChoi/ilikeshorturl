// * NestJS 애플리케이션을 생성하고 실행하기 위한 기능
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

// * 애플리케이션 설정 타입
import { AppConfig } from './config/configuration';

// * 예상치 못한 모든 예외를 처리하는 Filter
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

// * HttpException(400, 409 등)을 통일된 JSON으로 변환하는 Filter
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// * Prisma DB 에러(P2002 등)를 HTTP status code로 변환하는 Filter
import { PrismaClientExceptionFilter } from './common/filters/prisma-client-exception.filter';

// * 루트 모듈
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // * DTO 유효성 검사를 모든 요청에 적용
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // * 범용 Filter를 먼저 등록하고, 구체적인 Filter를 나중에 등록
  // * NestJS는 등록 역순으로 Filter를 적용하므로 Prisma/Http가 먼저 처리됨
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new HttpExceptionFilter(),
    new PrismaClientExceptionFilter(),
  );

  // * ConfigService에서 port 설정값을 가져와 서버 시작
  const configService = app.get<ConfigService<AppConfig, true>>(ConfigService);
  const port = configService.get('port', { infer: true });

  await app.listen(port);
}
void bootstrap();
