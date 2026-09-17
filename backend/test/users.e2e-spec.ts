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

describe('Users API (e2e)', () => {
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

  describe('GET /users', () => {
    it('사용자 목록을 반환한다', async () => {
      const users = [
        {
          id: 'user-1',
          email: 'user@example.com',
          name: '홍길동',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      prisma.user.findMany.mockResolvedValue(users);

      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(response.body).toEqual(users);
    });
  });

  describe('POST /users/signup', () => {
    const createUserDto = {
      email: 'user@example.com',
      password: 'password123',
      name: '홍길동',
    };

    it('회원가입에 성공하면 201/200과 사용자 정보를 반환한다', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: createUserDto.email,
        name: createUserDto.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await request(app.getHttpServer())
        .post('/users/signup')
        .send(createUserDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: 'user-1',
        email: createUserDto.email,
        name: createUserDto.name,
      });
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('이미 사용 중인 이메일이면 409를 반환한다', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: createUserDto.email,
      });

      const response = await request(app.getHttpServer())
        .post('/users/signup')
        .send(createUserDto)
        .expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        message: '이미 사용 중인 이메일입니다.',
      });
    });

    it('비밀번호가 짧으면 400을 반환한다', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/signup')
        .send({
          email: 'user@example.com',
          password: 'short',
          name: '홍길동',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });
});
