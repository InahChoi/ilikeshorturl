// * NestJS 테스트 모듈 기능
import { Test, TestingModule } from '@nestjs/testing';

// * JWT Guard mock 교체용
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

// * 테스트 대상 Controller
import { ShortUrlsController } from './short-urls.controller';

// * Controller가 호출하는 Service mock
import { ShortUrlsService } from './short-urls.service';

describe('ShortUrlsController', () => {
  let controller: ShortUrlsController;

  // * ShortUrlsService mock
  const shortUrlsService = {
    create: jest.fn(),
    findAllByUserId: jest.fn(),
    findOneByUserId: jest.fn(),
    updateByUserId: jest.fn(),
    deleteByUserId: jest.fn(),
    getStatsByUserId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShortUrlsController],
      providers: [
        {
          provide: ShortUrlsService,
          useValue: shortUrlsService,
        },
      ],
    })
      // * Guard는 단위 테스트에서 실제 JWT 검증을 하지 않음
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ShortUrlsController>(ShortUrlsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /short-urls', () => {
    it('ShortUrlsService.findAllByUserId에 userId를 전달한다', async () => {
      const user = { userId: 'user-1', email: 'user@example.com' };
      const list = [
        {
          id: 'short-1',
          shortCode: 'abc2345',
          shortUrl: 'http://localhost:3000/abc2345',
          clickCount: '3',
        },
      ];
      shortUrlsService.findAllByUserId.mockResolvedValue(list);

      await expect(controller.findMine(user)).resolves.toEqual(list);
      expect(shortUrlsService.findAllByUserId).toHaveBeenCalledWith('user-1');
    });
  });

  describe('GET /short-urls/:id', () => {
    it('ShortUrlsService.findOneByUserId에 id와 userId를 전달한다', async () => {
      const user = { userId: 'user-1', email: 'user@example.com' };
      const item = { id: 'short-1', shortCode: 'abc2345' };
      shortUrlsService.findOneByUserId.mockResolvedValue(item);

      await expect(controller.findOne('short-1', user)).resolves.toEqual(item);
      expect(shortUrlsService.findOneByUserId).toHaveBeenCalledWith(
        'short-1',
        'user-1',
      );
    });
  });

  describe('GET /short-urls/:id/stats', () => {
    it('ShortUrlsService.getStatsByUserId에 id, userId, days를 전달한다', async () => {
      const user = { userId: 'user-1', email: 'user@example.com' };
      const stats = { shortUrlId: 'short-1', totalClicks: 3 };
      shortUrlsService.getStatsByUserId.mockResolvedValue(stats);

      await expect(
        controller.getStats('short-1', { days: 7 }, user),
      ).resolves.toEqual(stats);
      expect(shortUrlsService.getStatsByUserId).toHaveBeenCalledWith(
        'short-1',
        'user-1',
        7,
      );
    });
  });

  describe('PATCH /short-urls/:id', () => {
    it('ShortUrlsService.updateByUserId에 id, userId, DTO를 전달한다', async () => {
      const user = { userId: 'user-1', email: 'user@example.com' };
      const dto = { title: '새 제목', isActive: false };
      const updated = { id: 'short-1', title: '새 제목', isActive: false };
      shortUrlsService.updateByUserId.mockResolvedValue(updated);

      await expect(controller.update('short-1', dto, user)).resolves.toEqual(
        updated,
      );
      expect(shortUrlsService.updateByUserId).toHaveBeenCalledWith(
        'short-1',
        'user-1',
        dto,
      );
    });
  });

  describe('DELETE /short-urls/:id', () => {
    it('ShortUrlsService.deleteByUserId에 id와 userId를 전달한다', async () => {
      const user = { userId: 'user-1', email: 'user@example.com' };
      shortUrlsService.deleteByUserId.mockResolvedValue(undefined);

      await expect(controller.remove('short-1', user)).resolves.toBeUndefined();
      expect(shortUrlsService.deleteByUserId).toHaveBeenCalledWith(
        'short-1',
        'user-1',
      );
    });
  });

  describe('POST /short-urls', () => {
    it('비로그인 생성 시 userId 없이 create를 호출한다', async () => {
      const createShortUrlDto = {
        originalUrl: 'https://example.com/path',
        title: '예제',
      };
      const created = {
        id: 'short-1',
        shortCode: 'abc2345',
        shortUrl: 'http://localhost:3000/abc2345',
        originalUrl: createShortUrlDto.originalUrl,
        title: createShortUrlDto.title,
        createdAt: new Date(),
      };
      shortUrlsService.create.mockResolvedValue(created);

      await expect(controller.create(createShortUrlDto)).resolves.toEqual(
        created,
      );
      expect(shortUrlsService.create).toHaveBeenCalledWith(
        createShortUrlDto,
        undefined,
      );
    });

    it('로그인 생성 시 userId를 create에 전달한다', async () => {
      const createShortUrlDto = {
        originalUrl: 'https://example.com/path',
      };
      const user = { userId: 'user-1', email: 'user@example.com' };
      shortUrlsService.create.mockResolvedValue({ id: 'short-1' });

      await controller.create(createShortUrlDto, user);

      expect(shortUrlsService.create).toHaveBeenCalledWith(
        createShortUrlDto,
        'user-1',
      );
    });
  });
});
