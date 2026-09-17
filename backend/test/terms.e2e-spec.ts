// * NestJS e2e 테스트 모듈 기능
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

// * 전역 Exception Filter
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaClientExceptionFilter } from '../src/common/filters/prisma-client-exception.filter';

// * 루트 모듈
import { AppModule } from '../src/app.module';

// * PrismaService를 mock으로 교체
import { PrismaService } from '../src/prisma/prisma.service';

describe('Terms API (e2e)', () => {
  let app: INestApplication<App>;

  // * Prisma term 모델 mock
  const prisma = {
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    term: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(
      new AllExceptionsFilter(),
      new HttpExceptionFilter(),
      new PrismaClientExceptionFilter(),
    );

    await app.init();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /terms', () => {
    it('활성 약관 목록 반환 테스트', async () => {
      const terms = [
        {
          id: 'term-1',
          type: 'TERMS_OF_SERVICE',
          title: '서비스 이용약관',
          content: '내용',
          version: '1.0',
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      prisma.term.findMany.mockResolvedValue(terms);

      const response = await request(app.getHttpServer())
        .get('/terms')
        .expect(200);

      expect(response.body).toEqual(terms);
    });
  });

  describe('GET /terms/:type', () => {
    it('타입별 최신 약관 반환 테스트', async () => {
      const term = {
        id: 'term-2',
        type: 'PRIVACY_POLICY',
        title: '개인정보처리방침',
        content: '내용',
        version: '1.0',
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      prisma.term.findFirst.mockResolvedValue(term);

      const response = await request(app.getHttpServer())
        .get('/terms/PRIVACY_POLICY')
        .expect(200);

      expect(response.body).toEqual(term);
    });

    it('잘못된 type일 경우 400 반환 테스트', async () => {
      const response = await request(app.getHttpServer())
        .get('/terms/INVALID')
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('약관이 없을 경우 404 반환 테스트', async () => {
      prisma.term.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/terms/TERMS_OF_SERVICE')
        .expect(404);

      expect(response.body.statusCode).toBe(404);
    });
  });
});
