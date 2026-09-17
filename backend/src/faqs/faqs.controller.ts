// * HTTP 요청을 처리하는 Controller 기능
import { Controller, Get, Query } from '@nestjs/common';

// * FAQ 관련 DB 작업을 담당하는 Service
import { FaqsService } from './faqs.service';

@Controller('faqs')
export class FaqsController {
  constructor(
    // * Controller에서 FaqsService를 사용할 수 있도록 연결
    private readonly faqsService: FaqsService,
  ) {}

  @Get()
  async findAll(@Query('category') category?: string) {
    // * GET /faqs — 활성화된 FAQ 목록 조회 (category 쿼리 선택)
    return await this.faqsService.findAll(category);
  }
}
