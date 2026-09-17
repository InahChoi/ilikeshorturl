// * NestJS에서 Module을 만들기 위한 기능
import { Module } from '@nestjs/common';

// * 약관 관련 Controller
import { TermsController } from './terms.controller';

// * 약관을 처리하는 Service
import { TermsService } from './terms.service';

@Module({
  // * TermsController를 TermsModule에서 사용할 수 있도록 등록
  controllers: [TermsController],

  // * TermsService를 TermsModule에서 사용할 수 있도록 등록
  providers: [TermsService],

  // * 다른 Module에서도 TermsService를 사용할 수 있도록 공개
  exports: [TermsService],
})
export class TermsModule {}
