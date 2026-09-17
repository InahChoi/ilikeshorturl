// * NestJS e2e 테스트 모듈 기능
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

// * 루트 모듈
import { AppModule } from './../src/app.module';

// * PrismaService를 mock으로 교체 (앱 부팅 시 실제 DB 연결 방지)
import { PrismaService } from './../src/prisma/prisma.service';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        user: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('애플리케이션이 정상적으로 부팅된다', async () => {
    // * AppController가 없으므로 /users로 헬스 체크
    await request(app.getHttpServer()).get('/users').expect(200);
  });
});
