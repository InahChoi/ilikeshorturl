// * NestJS 테스트 모듈 기능
import { GoneException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

// * Prisma UNIQUE 에러 시뮬레이션용
import { Prisma } from '../generated/prisma/client';

// * PrismaService mock을 주입하기 위한 토큰
import { PrismaService } from '../prisma/prisma.service';

// * URL 안전 검사 Service mock
import { UrlSafetyService } from '../url-safety/url-safety.service';

// * 테스트 대상 Service
import { ShortUrlsService } from './short-urls.service';

// * shortCode 생성 유틸 mock
import { generateShortCode } from './utils/generate-short-code.util';

jest.mock('./utils/generate-short-code.util', () => ({
  generateShortCode: jest.fn(),
}));

describe('ShortUrlsService', () => {
  let service: ShortUrlsService;

  // * Prisma / Config mock
  const prisma = {
    shortUrl: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    click: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const configService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };
  const urlSafetyService = {
    assertSafeUrl: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShortUrlsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: UrlSafetyService,
          useValue: urlSafetyService,
        },
      ],
    }).compile();

    service = module.get<ShortUrlsService>(ShortUrlsService);
    jest.clearAllMocks();
    configService.get.mockReturnValue('http://localhost:3000');
    urlSafetyService.assertSafeUrl.mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation(
      async (operations: Promise<unknown>[]) => Promise.all(operations),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createShortUrlDto = {
      originalUrl: 'https://example.com/very/long/path',
      title: '예제',
    };

    it('로그인 없이 단축 URL을 생성', async () => {
      (generateShortCode as jest.Mock).mockReturnValue('abc2345');
      prisma.shortUrl.create.mockResolvedValue({
        id: 'short-1',
        shortCode: 'abc2345',
        originalUrl: createShortUrlDto.originalUrl,
        title: createShortUrlDto.title,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      const result = await service.create(createShortUrlDto);

      expect(urlSafetyService.assertSafeUrl).toHaveBeenCalledWith(
        createShortUrlDto.originalUrl,
      );

      expect(prisma.shortUrl.create).toHaveBeenCalledWith({
        data: {
          shortCode: 'abc2345',
          originalUrl: createShortUrlDto.originalUrl,
          title: createShortUrlDto.title,
        },
        select: {
          id: true,
          shortCode: true,
          originalUrl: true,
          title: true,
          createdAt: true,
        },
      });
      expect(result).toEqual({
        id: 'short-1',
        shortCode: 'abc2345',
        shortUrl: 'http://localhost:3000/abc2345',
        originalUrl: createShortUrlDto.originalUrl,
        title: createShortUrlDto.title,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });
    });

    it('shortCode가 충돌하면 재시도', async () => {
      (generateShortCode as jest.Mock)
        .mockReturnValueOnce('dupcode')
        .mockReturnValueOnce('newcode');

      const conflictError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: ['short_code'] },
        },
      );

      prisma.shortUrl.create
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce({
          id: 'short-2',
          shortCode: 'newcode',
          originalUrl: createShortUrlDto.originalUrl,
          title: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        });

      const result = await service.create({
        originalUrl: createShortUrlDto.originalUrl,
      });

      expect(prisma.shortUrl.create).toHaveBeenCalledTimes(2);
      expect(result.shortCode).toBe('newcode');
      expect(result.shortUrl).toBe('http://localhost:3000/newcode');
    });

    it('로그인 사용자로 생성하면 userId를 저장', async () => {
      (generateShortCode as jest.Mock).mockReturnValue('abc2345');
      prisma.shortUrl.create.mockResolvedValue({
        id: 'short-1',
        shortCode: 'abc2345',
        originalUrl: createShortUrlDto.originalUrl,
        title: createShortUrlDto.title,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      await service.create(createShortUrlDto, 'user-1');

      expect(prisma.shortUrl.create).toHaveBeenCalledWith({
        data: {
          shortCode: 'abc2345',
          originalUrl: createShortUrlDto.originalUrl,
          title: createShortUrlDto.title,
          userId: 'user-1',
        },
        select: {
          id: true,
          shortCode: true,
          originalUrl: true,
          title: true,
          createdAt: true,
        },
      });
    });
  });

  describe('findAllByUserId', () => {
    it('해당 사용자의 단축 URL 목록을 반환한다', async () => {
      prisma.shortUrl.findMany.mockResolvedValue([
        {
          id: 'short-1',
          shortCode: 'abc2345',
          originalUrl: 'https://example.com',
          title: '예제',
          isActive: true,
          expiresAt: null,
          clickCount: 12n,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);

      const result = await service.findAllByUserId('user-1');

      expect(prisma.shortUrl.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
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
      expect(result).toEqual([
        {
          id: 'short-1',
          shortCode: 'abc2345',
          shortUrl: 'http://localhost:3000/abc2345',
          originalUrl: 'https://example.com',
          title: '예제',
          isActive: true,
          expiresAt: null,
          clickCount: '12',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);
    });
  });

  describe('resolveAndTrack', () => {
    const clickMeta = {
      ip: '127.0.0.1',
      userAgent: 'jest-agent',
      referer: 'https://google.com',
    };

    const activeShortUrl = {
      id: 'short-1',
      shortCode: 'abc2345',
      originalUrl: 'https://example.com/destination',
      isActive: true,
      expiresAt: null,
    };

    it('클릭을 기록하고 원본 URL을 반환', async () => {
      prisma.shortUrl.findUnique.mockResolvedValue(activeShortUrl);
      prisma.click.create.mockResolvedValue({ id: 'click-1' });
      prisma.shortUrl.update.mockResolvedValue({
        ...activeShortUrl,
        clickCount: 1n,
      });

      await expect(
        service.resolveAndTrack(activeShortUrl.shortCode, clickMeta),
      ).resolves.toBe(activeShortUrl.originalUrl);

      expect(prisma.click.create).toHaveBeenCalledWith({
        data: {
          shortUrlId: activeShortUrl.id,
          ip: clickMeta.ip,
          userAgent: clickMeta.userAgent,
          referer: clickMeta.referer,
        },
      });
      expect(prisma.shortUrl.update).toHaveBeenCalledWith({
        where: { id: activeShortUrl.id },
        data: {
          clickCount: { increment: 1 },
        },
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('없는 shortCode면 NotFoundException을 던짐', async () => {
      prisma.shortUrl.findUnique.mockResolvedValue(null);

      await expect(
        service.resolveAndTrack('missing', clickMeta),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('비활성 shortCode면 NotFoundException을 던짐', async () => {
      prisma.shortUrl.findUnique.mockResolvedValue({
        ...activeShortUrl,
        isActive: false,
      });

      await expect(
        service.resolveAndTrack(activeShortUrl.shortCode, clickMeta),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('만료된 shortCode면 GoneException을 던짐', async () => {
      prisma.shortUrl.findUnique.mockResolvedValue({
        ...activeShortUrl,
        expiresAt: new Date('2020-01-01T00:00:00.000Z'),
      });

      await expect(
        service.resolveAndTrack(activeShortUrl.shortCode, clickMeta),
      ).rejects.toBeInstanceOf(GoneException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
