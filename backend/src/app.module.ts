// * NestJS에서 Module을 만들기 위한 기능
import { Module } from '@nestjs/common';

// * DB를 사용할 수 있게 해주는 PrismaModule
import { PrismaModule } from './prisma/prisma.module';

// * 사용자 기능을 담당하는 UsersModule
import { UsersModule } from './users/users.module';

@Module({
  // * 애플리케이션에서 PrismaModule을 사용
  imports: [PrismaModule, UsersModule],

  // * Controller
  controllers: [],

  // * Provider
  providers: [],
})
export class AppModule {}
