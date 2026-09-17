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

describe('Faqs API (e2e)', () => {
  let app: INestApplication<App>;

  // * Prisma faq 모델 mock
  const prisma = {
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    faq: {
      findMany: jest.fn(),
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

  describe('GET /faqs', () => {
    it('활성 FAQ 목록을 반환한다', async () => {
      const faqs = [
        {
          id: 'faq-1',
          question: '단축 URL은 무료인가요?',
          answer: '네, 기본 기능은 무료입니다.',
          category: '일반',
          sortOrder: 1,
          updatedAt: new Date().toISOString(),
        },
      ];
      prisma.faq.findMany.mockResolvedValue(faqs);

      const response = await request(app.getHttpServer())
        .get('/faqs')
        .expect(200);

      expect(response.body).toEqual(faqs);
    });

    it('category 쿼리로 필터링한다', async () => {
      prisma.faq.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/faqs')
        .query({ category: '계정' })
        .expect(200);

      expect(prisma.faq.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isActive: true,
            category: '계정',
          },
        }),
      );
    });
  });
});
