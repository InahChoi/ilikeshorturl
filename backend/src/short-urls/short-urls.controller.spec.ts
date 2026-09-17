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
    it('ShortUrlsService.findAllByUserId에 userId 전달', async () => {
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

  describe('POST /short-urls', () => {
    it('비로그인 생성 시 userId 없이 create를 호출', async () => {
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

    it('로그인 생성 시 userId를 create에 전달', async () => {
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
