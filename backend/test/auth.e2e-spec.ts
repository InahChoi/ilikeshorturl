// * NestJS e2e 테스트 모듈 기능
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
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

describe('Auth API (e2e)', () => {
  let app: INestApplication<App>;

  // * Prisma user 모델 mock
  const prisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
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
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    const loginDto = {
      email: 'user@example.com',
      password: 'password123',
    };

    it('로그인에 성공하면 accessToken과 user를 반환한다', async () => {
      const passwordHash = await bcrypt.hash(loginDto.password, 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: loginDto.email,
        name: '홍길동',
        passwordHash,
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(201);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        user: {
          id: 'user-1',
          email: loginDto.email,
          name: '홍길동',
        },
      });
      expect(response.body.accessToken.length).toBeGreaterThan(10);
    });

    it('비밀번호가 틀리면 401을 반환한다', async () => {
      const passwordHash = await bcrypt.hash('other-password', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: loginDto.email,
        name: '홍길동',
        passwordHash,
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    });

    it('사용자가 없으면 401을 반환한다', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });
  });
});
