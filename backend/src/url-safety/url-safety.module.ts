// * NestJS에서 Module을 만들기 위한 기능
import { Module } from '@nestjs/common';

// * URL 안전 검사를 담당하는 Service
import { UrlSafetyService } from './url-safety.service';

@Module({
  // * UrlSafetyService를 UrlSafetyModule에서 사용할 수 있도록 등록
  providers: [UrlSafetyService],

  // * 다른 Module에서도 UrlSafetyService를 사용할 수 있도록 공개
  exports: [UrlSafetyService],
})
export class UrlSafetyModule {}
