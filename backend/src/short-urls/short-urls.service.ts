// * NestJS에서 Service를 만들기 위한 기능
import { GoneException, Injectable, NotFoundException } from '@nestjs/common';

// * ConfigService로 APP_BASE_URL에 접근
import { ConfigService } from '@nestjs/config';

// * 애플리케이션 설정 타입
import { AppConfig } from '../config/configuration';

// * Prisma UNIQUE 제약 위반 에러 타입
import { Prisma } from '../generated/prisma/client';

// * PostgreSQL DB에 접근하기 위한 PrismaService
import { PrismaService } from '../prisma/prisma.service';

// * 단축 전 URL 안전 검사
import { UrlSafetyService } from '../url-safety/url-safety.service';

// * 단축 URL 생성 요청 body 형식
import { CreateShortUrlDto } from './dto/create-short-url.dto';

// * 클릭 메타데이터 형식
import { ClickMeta } from './interfaces/click-meta.interface';

// * 대시보드 목록 응답 형식
import { ShortUrlListItem } from './interfaces/short-url-list-item.interface';

// * shortCode 생성 유틸
import { generateShortCode } from './utils/generate-short-code.util';

// * shortCode 충돌 시 재시도 횟수
const SHORT_CODE_MAX_RETRIES = 5;

@Injectable()
export class ShortUrlsService {
  constructor(
    // * ShortUrlsService에서 PrismaService를 사용할 수 있도록 연결
    private readonly prisma: PrismaService,

    // * shortUrl 전체 주소를 만들기 위한 base URL
    private readonly configService: ConfigService<AppConfig, true>,

    // * 단축 전 URL 안전 검사
    private readonly urlSafetyService: UrlSafetyService,
  ) {}

  // * 단축 URL 생성 (로그인 시 userId 연결, 비로그인이면 null)
  async create(createShortUrlDto: CreateShortUrlDto, userId?: string) {
    // * 악성/사설/신규 도메인 등 위험 URL은 생성 전에 차단
    await this.urlSafetyService.assertSafeUrl(createShortUrlDto.originalUrl);

    const shortUrl = await this.createWithUniqueShortCode(
      createShortUrlDto,
      userId,
    );

    // * 응답에 바로 쓸 수 있는 단축 주소 포함
    return {
      id: shortUrl.id,
      shortCode: shortUrl.shortCode,
      shortUrl: this.buildShortUrl(shortUrl.shortCode),
      originalUrl: shortUrl.originalUrl,
      title: shortUrl.title,
      createdAt: shortUrl.createdAt,
    };
  }

  // * 로그인한 사용자의 단축 URL 목록 조회 (대시보드용)
  async findAllByUserId(userId: string): Promise<ShortUrlListItem[]> {
    const shortUrls = await this.prisma.shortUrl.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        shortCode: true,
        originalUrl: true,
        title: true,
        isActive: true,
        expiresAt: true,
        clickCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // * BigInt clickCount를 JSON 친화적인 string으로 변환하고 shortUrl 포함
    return shortUrls.map((shortUrl) => ({
      id: shortUrl.id,
      shortCode: shortUrl.shortCode,
      shortUrl: this.buildShortUrl(shortUrl.shortCode),
      originalUrl: shortUrl.originalUrl,
      title: shortUrl.title,
      isActive: shortUrl.isActive,
      expiresAt: shortUrl.expiresAt,
      clickCount: shortUrl.clickCount.toString(),
      createdAt: shortUrl.createdAt,
      updatedAt: shortUrl.updatedAt,
    }));
  }

  // * shortCode로 원본 URL을 찾고 클릭을 기록한 뒤 리다이렉트 대상 URL을 반환
  async resolveAndTrack(shortCode: string, clickMeta: ClickMeta) {
    // * shortCode로 단축 URL 조회
    const shortUrl = await this.prisma.shortUrl.findUnique({
      where: { shortCode },
    });

    // * 없거나 비활성화된 코드는 404
    if (!shortUrl || !shortUrl.isActive) {
      throw new NotFoundException('단축 URL을 찾을 수 없습니다.');
    }

    // * 만료된 코드는 410 Gone
    if (shortUrl.expiresAt && shortUrl.expiresAt.getTime() <= Date.now()) {
      throw new GoneException('만료된 단축 URL입니다.');
    }

    // * 클릭 기록 + clickCount 증가를 한 트랜잭션으로 처리
    await this.prisma.$transaction([
      this.prisma.click.create({
        data: {
          shortUrlId: shortUrl.id,
          ip: clickMeta.ip,
          userAgent: clickMeta.userAgent,
          referer: clickMeta.referer,
        },
      }),
      this.prisma.shortUrl.update({
        where: { id: shortUrl.id },
        data: {
          clickCount: { increment: 1 },
        },
      }),
    ]);

    return shortUrl.originalUrl;
  }

  // * shortCode 충돌이 나면 재생성하여 저장
  private async createWithUniqueShortCode(
    createShortUrlDto: CreateShortUrlDto,
    userId?: string,
  ) {
    for (let attempt = 0; attempt < SHORT_CODE_MAX_RETRIES; attempt += 1) {
      const shortCode = generateShortCode();

      try {
        // * 로그인 사용자는 userId를 연결하고, 비로그인이면 null
        return await this.prisma.shortUrl.create({
          data: {
            shortCode,
            originalUrl: createShortUrlDto.originalUrl,
            title: createShortUrlDto.title,
            ...(userId ? { userId } : {}),
          },
          select: {
            id: true,
            shortCode: true,
            originalUrl: true,
            title: true,
            createdAt: true,
          },
        });
      } catch (error) {
        // * shortCode UNIQUE 충돌이면 재시도, 그 외는 Exception Filter로 전달
        const isShortCodeConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          Array.isArray(error.meta?.target) &&
          error.meta.target.includes('short_code');

        if (!isShortCodeConflict || attempt === SHORT_CODE_MAX_RETRIES - 1) {
          throw error;
        }
      }
    }

    // * 이론상 도달하지 않음 (루프에서 throw)
    throw new Error('단축 코드 생성에 실패했습니다.');
  }

  // * shortCode를 공개용 단축 URL로 조합
  private buildShortUrl(shortCode: string): string {
    const baseUrl = this.configService.get('app.baseUrl', { infer: true });
    return `${baseUrl.replace(/\/$/, '')}/${shortCode}`;
  }
}
