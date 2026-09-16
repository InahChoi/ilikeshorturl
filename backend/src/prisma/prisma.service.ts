// * NestJS에서 Service를 만들고 서버 시작/종료 시점을 사용할 수 있게 함
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

// * .env 파일에 있는 환경변수를 읽어옴
import 'dotenv/config';

// * PostgreSQL과 Prisma를 연결해주는 Adapter
import { PrismaPg } from '@prisma/adapter-pg';

// * Prisma가 생성한 PrismaClient를 가져옴
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
// * PrismaClient의 DB 기능을 그대로 사용
// * 서버가 시작될 때와 종료될 때 실행할 기능을 사용
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // * .env에서 PostgreSQL 연결 주소를 가져옴
    const connectionString = process.env.DATABASE_URL;

    // * DB 연결 주소가 없으면 서버 시작을 막고 에러를 알려줌
    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined');
    }

    // * PostgreSQL과 연결하기 위한 Adapter를 만듦
    const adapter = new PrismaPg({
      connectionString,
    });

    // * PrismaClient에 PostgreSQL Adapter를 연결
    super({ adapter });
  }

  // * NestJS 서버가 시작되면 DB에 연결
  async onModuleInit() {
    await this.$connect();
  }

  // * NestJS 서버가 종료되면 DB 연결을 끊음
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
