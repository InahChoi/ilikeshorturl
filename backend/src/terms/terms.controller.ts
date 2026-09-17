// * HTTP 요청을 처리하는 Controller 기능
import { BadRequestException, Controller, Get, Param } from '@nestjs/common';

// * 약관 타입 enum
import { TermType } from '../generated/prisma/enums';

// * 약관 관련 DB 작업을 담당하는 Service
import { TermsService } from './terms.service';

@Controller('terms')
export class TermsController {
  constructor(
    // * Controller에서 TermsService를 사용할 수 있도록 연결
    private readonly termsService: TermsService,
  ) {}

  @Get()
  async findAll() {
    // * GET /terms — 활성화된 약관 목록 조회
    return this.termsService.findAll();
  }

  @Get(':type')
  async findLatestByType(@Param('type') type: string) {
    // * GET /terms/:type — 타입별 최신 활성 약관 조회
    return this.termsService.findLatestByType(this.parseTermType(type));
  }

  // * path param을 TermType enum으로 변환
  private parseTermType(type: string): TermType {
    const normalized = type.toUpperCase();

    if (
      normalized === TermType.TERMS_OF_SERVICE ||
      normalized === TermType.PRIVACY_POLICY
    ) {
      return normalized;
    }

    throw new BadRequestException(
      'type은 TERMS_OF_SERVICE 또는 PRIVACY_POLICY 여야 합니다.',
    );
  }
}
