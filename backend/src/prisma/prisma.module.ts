import { Global, Module } from '@nestjs/common';

// * PrismaService import
import { PrismaService } from './prisma.service';

// * DB 모듈을 다른 모듈에서도 사용할 수 있게 설정
@Global()
@Module({
  // * PrismaService를 NestJS에 등록
  providers: [PrismaService],

  // * 다른 곳에서도 PrismaService를 사용할 수 있도록 설정
  exports: [PrismaService],
})
export class PrismaModule {}
