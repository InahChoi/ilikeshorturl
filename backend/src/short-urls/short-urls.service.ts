// * NestJS에서 Service를 만들기 위한 기능
import {
  BadRequestException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

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

// * 단축 URL 수정 요청 body 형식
import { UpdateShortUrlDto } from './dto/update-short-url.dto';

// * 클릭 메타데이터 형식
import { ClickMeta } from './interfaces/click-meta.interface';

// * 대시보드 목록/상세 응답 형식
import { ShortUrlListItem } from './interfaces/short-url-list-item.interface';

// * 클릭 통계 응답 형식
import {
  DailyClickCount,
  NamedClickCount,
  ShortUrlStats,
} from './interfaces/short-url-stats.interface';

// * shortCode 생성 유틸
import { generateShortCode } from './utils/generate-short-code.util';

// * shortCode 충돌 시 재시도 횟수
const SHORT_CODE_MAX_RETRIES = 5;

// * 통계 조회 기본/최대 일수
const STATS_DEFAULT_DAYS = 30;
const STATS_MAX_DAYS = 90;

// * referer / userAgent 상위 N개
const STATS_TOP_LIMIT = 10;

// * 대시보드 조회에 공통으로 쓰는 select
const DASHBOARD_SHORT_URL_SELECT = {
  id: true,
  shortCode: true,
  originalUrl: true,
  title: true,
  isActive: true,
  expiresAt: true,
  clickCount: true,
  createdAt: true,
  updatedAt: true,
} as const;

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
      select: DASHBOARD_SHORT_URL_SELECT,
    });

    return shortUrls.map((shortUrl) => this.toDashboardItem(shortUrl));
  }

  // * 로그인한 사용자의 단축 URL 상세 조회
  async findOneByUserId(id: string, userId: string): Promise<ShortUrlListItem> {
    const shortUrl = await this.prisma.shortUrl.findFirst({
      where: { id, userId },
      select: DASHBOARD_SHORT_URL_SELECT,
    });

    if (!shortUrl) {
      throw new NotFoundException('단축 URL을 찾을 수 없습니다.');
    }

    return this.toDashboardItem(shortUrl);
  }

  // * 로그인한 사용자의 단축 URL 수정 (title, expiresAt, isActive)
  async updateByUserId(
    id: string,
    userId: string,
    updateShortUrlDto: UpdateShortUrlDto,
  ): Promise<ShortUrlListItem> {
    // * 소유권 확인 (없으면 404 — 타인 리소스 존재 여부도 노출하지 않음)
    await this.findOwnedOrFail(id, userId);

    if (
      updateShortUrlDto.title === undefined &&
      updateShortUrlDto.expiresAt === undefined &&
      updateShortUrlDto.isActive === undefined
    ) {
      throw new BadRequestException('수정할 필드가 없습니다.');
    }

    const data: Prisma.ShortUrlUpdateInput = {};

    if (updateShortUrlDto.title !== undefined) {
      data.title = updateShortUrlDto.title;
    }

    if (updateShortUrlDto.expiresAt !== undefined) {
      data.expiresAt =
        updateShortUrlDto.expiresAt === null
          ? null
          : new Date(updateShortUrlDto.expiresAt);
    }

    if (updateShortUrlDto.isActive !== undefined) {
      data.isActive = updateShortUrlDto.isActive;
    }

    const shortUrl = await this.prisma.shortUrl.update({
      where: { id },
      data,
      select: DASHBOARD_SHORT_URL_SELECT,
    });

    return this.toDashboardItem(shortUrl);
  }

  // * 로그인한 사용자의 단축 URL 삭제 (clicks는 DB Cascade)
  async deleteByUserId(id: string, userId: string): Promise<void> {
    const result = await this.prisma.shortUrl.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      throw new NotFoundException('단축 URL을 찾을 수 없습니다.');
    }
  }

  // * 로그인한 사용자의 단축 URL 클릭 통계 (일별·referer·UA)
  async getStatsByUserId(
    id: string,
    userId: string,
    days = STATS_DEFAULT_DAYS,
  ): Promise<ShortUrlStats> {
    await this.findOwnedOrFail(id, userId);

    const safeDays = Math.min(Math.max(days, 1), STATS_MAX_DAYS);
    const to = new Date();
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - (safeDays - 1));
    from.setUTCHours(0, 0, 0, 0);

    const clicks = await this.prisma.click.findMany({
      where: {
        shortUrlId: id,
        clickedAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        clickedAt: true,
        referer: true,
        userAgent: true,
      },
      orderBy: { clickedAt: 'asc' },
    });

    return {
      shortUrlId: id,
      days: safeDays,
      from,
      to,
      totalClicks: clicks.length,
      daily: this.buildDailyCounts(clicks, from, to),
      topReferers: this.buildTopCounts(
        clicks.map((click) => click.referer),
        STATS_TOP_LIMIT,
      ),
      topUserAgents: this.buildTopCounts(
        clicks.map((click) => click.userAgent),
        STATS_TOP_LIMIT,
      ),
    };
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

  // * 소유한 단축 URL이 없으면 404
  private async findOwnedOrFail(id: string, userId: string) {
    const shortUrl = await this.prisma.shortUrl.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!shortUrl) {
      throw new NotFoundException('단축 URL을 찾을 수 없습니다.');
    }

    return shortUrl;
  }

  // * 기간 내 일별 클릭 수를 UTC 날짜 기준으로 집계
  private buildDailyCounts(
    clicks: Array<{ clickedAt: Date }>,
    from: Date,
    to: Date,
  ): DailyClickCount[] {
    const counts = new Map<string, number>();
    const dayMs = 24 * 60 * 60 * 1000;
    const fromDay = Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate(),
    );
    const toDay = Date.UTC(
      to.getUTCFullYear(),
      to.getUTCMonth(),
      to.getUTCDate(),
    );

    for (let time = fromDay; time <= toDay; time += dayMs) {
      counts.set(this.toUtcDateKey(new Date(time)), 0);
    }

    for (const click of clicks) {
      const key = this.toUtcDateKey(click.clickedAt);
      if (counts.has(key)) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    return Array.from(counts.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  }

  // * referer / userAgent 상위 집계 (null은 직접 유입/미상으로 포함)
  private buildTopCounts(
    values: Array<string | null | undefined>,
    limit: number,
  ): NamedClickCount[] {
    const counts = new Map<string | null, number>();

    for (const value of values) {
      const key = value ?? null;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort(
        (a, b) => b.count - a.count || this.compareNullable(a.value, b.value),
      )
      .slice(0, limit);
  }

  // * UTC YYYY-MM-DD 키 생성
  private toUtcDateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  // * null 안전 문자열 비교 (정렬 안정성)
  private compareNullable(a: string | null, b: string | null): number {
    if (a === b) {
      return 0;
    }
    if (a === null) {
      return 1;
    }
    if (b === null) {
      return -1;
    }
    return a.localeCompare(b);
  }

  // * DB 행을 대시보드 응답 형식으로 변환
  private toDashboardItem(shortUrl: {
    id: string;
    shortCode: string;
    originalUrl: string;
    title: string | null;
    isActive: boolean;
    expiresAt: Date | null;
    clickCount: bigint;
    createdAt: Date;
    updatedAt: Date;
  }): ShortUrlListItem {
    return {
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
    };
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
