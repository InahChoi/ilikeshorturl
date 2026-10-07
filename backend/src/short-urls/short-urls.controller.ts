// * HTTP 요청을 처리하는 Controller 기능
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

// * JWT에서 추출한 현재 사용자 주입
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// * JWT 필수 Guard (대시보드 API)
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// * JWT 선택 Guard (로그인 시 userId 연결)
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

// * JWT 검증 후 request.user 형식
import type { AuthUser } from '../auth/interfaces/auth-user.interface';

// * 단축 URL 생성 요청 body 형식
import { CreateShortUrlDto } from './dto/create-short-url.dto';

// * 단축 URL 수정 요청 body 형식
import { UpdateShortUrlDto } from './dto/update-short-url.dto';

// * 클릭 통계 조회 쿼리
import { ShortUrlStatsQueryDto } from './dto/short-url-stats-query.dto';

// * 대시보드 목록/상세 응답 형식
import type { ShortUrlListItem } from './interfaces/short-url-list-item.interface';

// * 클릭 통계 응답 형식
import type { ShortUrlStats } from './interfaces/short-url-stats.interface';

// * 단축 URL 관련 DB 작업을 담당하는 Service
import { ShortUrlsService } from './short-urls.service';

@Controller('short-urls')
export class ShortUrlsController {
  constructor(
    // * Controller에서 ShortUrlsService를 사용할 수 있도록 연결
    private readonly shortUrlsService: ShortUrlsService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findMine(@CurrentUser() user: AuthUser): Promise<ShortUrlListItem[]> {
    // * GET /short-urls — 로그인한 사용자의 단축 URL 목록 (대시보드)
    return await this.shortUrlsService.findAllByUserId(user.userId);
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  async getStats(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ShortUrlStatsQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ShortUrlStats> {
    // * GET /short-urls/:id/stats — 클릭 일별·referer·UA 집계
    return await this.shortUrlsService.getStatsByUserId(
      id,
      user.userId,
      query.days,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ShortUrlListItem> {
    // * GET /short-urls/:id — 내 단축 URL 상세
    return await this.shortUrlsService.findOneByUserId(id, user.userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateShortUrlDto: UpdateShortUrlDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ShortUrlListItem> {
    // * PATCH /short-urls/:id — title, expiresAt, isActive 수정
    return await this.shortUrlsService.updateByUserId(
      id,
      user.userId,
      updateShortUrlDto,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    // * DELETE /short-urls/:id — 내 단축 URL 삭제
    await this.shortUrlsService.deleteByUserId(id, user.userId);
  }

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  async create(
    @Body() createShortUrlDto: CreateShortUrlDto,
    @CurrentUser() user?: AuthUser,
  ) {
    // * POST /short-urls — 단축 URL 생성 (로그인 시 userId 연결)
    return await this.shortUrlsService.create(createShortUrlDto, user?.userId);
  }
}
