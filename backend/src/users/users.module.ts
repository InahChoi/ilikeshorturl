// * NestJS에서 Module을 만들기 위한 기능
import { Module } from '@nestjs/common';

// * 사용자 관련 Controller
import { UsersController } from './users.controller';

// * 사용자를 처리하는 Service
import { UsersService } from './users.service';

@Module({
  // * UsersController를 UsersModule에서 사용할 수 있도록 등록
  controllers: [UsersController],

  // * UsersService를 UsersModule에서 사용할 수 있도록 등록
  providers: [UsersService],

  // * 다른 Module에서도 UsersService를 사용할 수 있도록 공개
  exports: [UsersService],
})
export class UsersModule {}
