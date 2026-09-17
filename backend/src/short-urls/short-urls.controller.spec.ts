// * NestJS 테스트 모듈 기능
import { Test, TestingModule } from '@nestjs/testing';

// * 테스트 대상 Controller
import { ShortUrlsController } from './short-urls.controller';

// * Controller가 호출하는 Service mock
import { ShortUrlsService } from './short-urls.service';

describe('ShortUrlsController', () => {
  let controller: ShortUrlsController;

  // * ShortUrlsService mock
  const shortUrlsService = {
    create: jest.fn(),
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
    }).compile();

    controller = module.get<ShortUrlsController>(ShortUrlsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /short-urls', () => {
    it('ShortUrlsService.create에 DTO를 전달한다', async () => {
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
      expect(shortUrlsService.create).toHaveBeenCalledWith(createShortUrlDto);
    });
  });
});
