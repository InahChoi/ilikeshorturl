// * NestJS에서 Module을 만들기 위한 기능
import { Module } from '@nestjs/common';

// * JWT 인증을 ShortUrls API에서 사용
import { AuthModule } from '../auth/auth.module';

// * URL 안전 검사 모듈
import { UrlSafetyModule } from '../url-safety/url-safety.module';

// * GET /:shortCode 리다이렉트 Controller
import { RedirectController } from './redirect.controller';

// * 단축 URL 관련 Controller
import { ShortUrlsController } from './short-urls.controller';

// * 단축 URL을 처리하는 Service
import { ShortUrlsService } from './short-urls.service';

@Module({
  // * UrlSafetyService / JWT Guard를 ShortUrls에서 사용
  imports: [UrlSafetyModule, AuthModule],

  // * ShortUrlsController / RedirectController 등록
  controllers: [ShortUrlsController, RedirectController],

  // * ShortUrlsService를 ShortUrlsModule에서 사용할 수 있도록 등록
  providers: [ShortUrlsService],

  // * 다른 Module에서도 ShortUrlsService를 사용할 수 있도록 공개
  exports: [ShortUrlsService],
})
export class ShortUrlsModule {}
