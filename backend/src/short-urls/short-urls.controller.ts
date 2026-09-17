// * HTTP 요청을 처리하는 Controller 기능
import { Body, Controller, Post } from '@nestjs/common';

// * 단축 URL 생성 요청 body 형식
import { CreateShortUrlDto } from './dto/create-short-url.dto';

// * 단축 URL 관련 DB 작업을 담당하는 Service
import { ShortUrlsService } from './short-urls.service';

@Controller('short-urls')
export class ShortUrlsController {
  constructor(
    // * Controller에서 ShortUrlsService를 사용할 수 있도록 연결
    private readonly shortUrlsService: ShortUrlsService,
  ) {}

  @Post()
  async create(@Body() createShortUrlDto: CreateShortUrlDto) {
    // * POST /short-urls — 로그인 없이 단축 URL 생성
    return this.shortUrlsService.create(createShortUrlDto);
  }
}
