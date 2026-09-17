// * NestJS e2e 테스트 모듈 기능
import {
  BadRequestException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
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

// * URL 안전 검사를 mock으로 교체 (외부 API 호출 방지)
import { UrlSafetyService } from '../src/url-safety/url-safety.service';

// * JWT Guard mock 교체용
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../src/auth/guards/optional-jwt-auth.guard';

describe('ShortUrls API (e2e)', () => {
  let app: INestApplication<App>;

  // * Prisma shortUrl / click 모델 mock
  const prisma = {
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    shortUrl: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    click: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  const urlSafetyService = {
    assertSafeUrl: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(UrlSafetyService)
      .useValue(urlSafetyService)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => {
            getRequest: () => {
              headers: { authorization?: string };
              user?: { userId: string; email: string };
            };
          };
        }) => {
          const request = context.switchToHttp().getRequest();
          // * Authorization 헤더가 없으면 실제 JWT Guard처럼 401
          if (!request.headers.authorization) {
            throw new UnauthorizedException();
          }
          request.user = { userId: 'user-1', email: 'user@example.com' };
          return true;
        },
      })
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();

    // * main.ts와 동일한 ValidationPipe / Filter 적용
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
    urlSafetyService.assertSafeUrl.mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation(
      async (operations: Promise<unknown>[]) => Promise.all(operations),
    );
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /short-urls', () => {
    const createShortUrlDto = {
      originalUrl: 'https://example.com/very/long/path',
      title: '예제',
    };

    it('비로그인 단축 URL 생성 테스트', async () => {
      prisma.shortUrl.create.mockImplementation(
        ({
          data,
        }: {
          data: { shortCode: string; originalUrl: string; title?: string };
        }) =>
          Promise.resolve({
            id: 'short-1',
            shortCode: data.shortCode,
            originalUrl: data.originalUrl,
            title: data.title ?? null,
            createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
          }),
      );

      const response = await request(app.getHttpServer())
        .post('/short-urls')
        .send(createShortUrlDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: 'short-1',
        originalUrl: createShortUrlDto.originalUrl,
        title: createShortUrlDto.title,
        shortCode: expect.any(String),
        shortUrl: expect.stringMatching(/^http:\/\/localhost:3000\//),
      });
      expect(prisma.shortUrl.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            originalUrl: createShortUrlDto.originalUrl,
            title: createShortUrlDto.title,
          }),
        }),
      );
      // * 비로그인 생성이므로 userId를 넣지 않음
      expect(prisma.shortUrl.create.mock.calls[0][0].data).not.toHaveProperty(
        'userId',
      );
    });

    it('잘못된 URL일 경우 400 반환 테스트', async () => {
      const response = await request(app.getHttpServer())
        .post('/short-urls')
        .send({
          originalUrl: 'not-a-url',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(prisma.shortUrl.create).not.toHaveBeenCalled();
    });

    it('안전 검사 실패 시 400 반환 테스트', async () => {
      urlSafetyService.assertSafeUrl.mockRejectedValue(
        new BadRequestException(
          '로컬 또는 사설 네트워크 주소는 단축할 수 없습니다.',
        ),
      );

      const response = await request(app.getHttpServer())
        .post('/short-urls')
        .send({
          originalUrl: 'http://127.0.0.1/admin',
        })
        .expect(400);

      expect(response.body.message).toContain('사설 네트워크');
      expect(prisma.shortUrl.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /short-urls', () => {
    it('토큰 없이 요청하면 401 반환 테스트', async () => {
      const response = await request(app.getHttpServer())
        .get('/short-urls')
        .expect(401);

      expect(response.body.statusCode).toBe(401);
      expect(prisma.shortUrl.findMany).not.toHaveBeenCalled();
    });

    it('로그인한 사용자의 단축 URL 목록 반환', async () => {
      prisma.shortUrl.findMany.mockResolvedValue([
        {
          id: 'short-1',
          shortCode: 'abc2345',
          originalUrl: 'https://example.com',
          title: '예제',
          isActive: true,
          expiresAt: null,
          clickCount: 5n,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/short-urls')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(prisma.shortUrl.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(response.body).toEqual([
        {
          id: 'short-1',
          shortCode: 'abc2345',
          shortUrl: 'http://localhost:3000/abc2345',
          originalUrl: 'https://example.com',
          title: '예제',
          isActive: true,
          expiresAt: null,
          clickCount: '5',
          createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
          updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        },
      ]);
    });
  });

  describe('GET /:shortCode', () => {
    it('원본 URL로 302 리다이렉트 클릭 기록 테스트', async () => {
      prisma.shortUrl.findUnique.mockResolvedValue({
        id: 'short-1',
        shortCode: 'abc2345',
        originalUrl: 'https://example.com/destination',
        isActive: true,
        expiresAt: null,
      });
      prisma.click.create.mockResolvedValue({ id: 'click-1' });
      prisma.shortUrl.update.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .get('/abc2345')
        .set('User-Agent', 'e2e-agent')
        .set('Referer', 'https://google.com')
        .expect(302);

      expect(response.headers.location).toBe('https://example.com/destination');
      expect(prisma.click.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          shortUrlId: 'short-1',
          userAgent: 'e2e-agent',
          referer: 'https://google.com',
        }),
      });
      expect(prisma.shortUrl.update).toHaveBeenCalledWith({
        where: { id: 'short-1' },
        data: {
          clickCount: { increment: 1 },
        },
      });
    });

    it('없는 shortCode일 경우 404 반환 테스트', async () => {
      prisma.shortUrl.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/missing')
        .expect(404);

      expect(response.body.statusCode).toBe(404);
      expect(prisma.click.create).not.toHaveBeenCalled();
    });

    it('만료된 shortCode일 경우 410 반환 테스트', async () => {
      prisma.shortUrl.findUnique.mockResolvedValue({
        id: 'short-1',
        shortCode: 'expired',
        originalUrl: 'https://example.com/destination',
        isActive: true,
        expiresAt: new Date('2020-01-01T00:00:00.000Z'),
      });

      const response = await request(app.getHttpServer())
        .get('/expired')
        .expect(410);

      expect(response.body.statusCode).toBe(410);
      expect(prisma.click.create).not.toHaveBeenCalled();
    });
  });
});
