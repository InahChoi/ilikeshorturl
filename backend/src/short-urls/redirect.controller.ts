// * HTTP 요청을 처리하는 Controller 기능
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Redirect,
  Req,
} from '@nestjs/common';

// * Express Request 타입
import * as express from 'express';

// * 단축 URL 관련 DB 작업을 담당하는 Service
import { ShortUrlsService } from './short-urls.service';

// * 루트 경로와 충돌하면 안 되는 예약어
const RESERVED_SHORT_CODES = new Set([
  'users',
  'auth',
  'short-urls',
  'terms',
  'faqs',
]);

@Controller()
export class RedirectController {
  constructor(
    // * Controller에서 ShortUrlsService를 사용할 수 있도록 연결
    private readonly shortUrlsService: ShortUrlsService,
  ) {}

  @Get(':shortCode')
  @Redirect()
  async redirect(
    @Param('shortCode') shortCode: string,
    @Req() request: express.Request,
  ) {
    // * API 경로와 겹치는 shortCode는 리다이렉트 대상으로 보지 않음
    if (RESERVED_SHORT_CODES.has(shortCode.toLowerCase())) {
      throw new NotFoundException('단축 URL을 찾을 수 없습니다.');
    }

    // * GET /:shortCode — 원본 URL로 리다이렉트하면서 클릭을 기록
    const originalUrl = await this.shortUrlsService.resolveAndTrack(shortCode, {
      ip: this.extractIp(request),
      userAgent: request.headers['user-agent'],
      referer: this.extractReferer(request),
    });

    // * NestJS @Redirect()가 사용할 302 응답
    return {
      url: originalUrl,
      statusCode: 302,
    };
  }

  // * 프록시 환경을 고려해 클라이언트 IP를 추출
  private extractIp(request: express.Request): string | undefined {
    const forwardedFor = request.headers['x-forwarded-for'];

    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
      return forwardedFor.split(',')[0]?.trim();
    }

    return request.ip;
  }

  // * Referer 헤더를 문자열로 정규화
  private extractReferer(request: express.Request): string | undefined {
    const referer = request.headers.referer ?? request.headers.referrer;

    if (Array.isArray(referer)) {
      return referer[0];
    }

    return referer;
  }
}
