// * NestJS 테스트 모듈 기능
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

// * Express Request mock용 타입
import { Request } from 'express';

// * 테스트 대상 Controller
import { RedirectController } from './redirect.controller';

// * Controller가 호출하는 Service mock
import { ShortUrlsService } from './short-urls.service';

describe('RedirectController', () => {
  let controller: RedirectController;

  // * ShortUrlsService mock
  const shortUrlsService = {
    resolveAndTrack: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RedirectController],
      providers: [
        {
          provide: ShortUrlsService,
          useValue: shortUrlsService,
        },
      ],
    }).compile();

    controller = module.get<RedirectController>(RedirectController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /:shortCode', () => {
    it('클릭 메타와 함께 resolveAndTrack을 호출하고 302 리다이렉트 정보를 반환한다', async () => {
      shortUrlsService.resolveAndTrack.mockResolvedValue(
        'https://example.com/destination',
      );

      const request = {
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'jest-agent',
          referer: 'https://google.com',
          'x-forwarded-for': '203.0.113.10, 10.0.0.1',
        },
      } as unknown as Request;

      await expect(controller.redirect('abc2345', request)).resolves.toEqual({
        url: 'https://example.com/destination',
        statusCode: 302,
      });

      expect(shortUrlsService.resolveAndTrack).toHaveBeenCalledWith('abc2345', {
        ip: '203.0.113.10',
        userAgent: 'jest-agent',
        referer: 'https://google.com',
      });
    });

    it('예약된 경로면 NotFoundException을 던진다', async () => {
      const request = {
        ip: '127.0.0.1',
        headers: {},
      } as unknown as Request;

      await expect(
        controller.redirect('terms', request),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(shortUrlsService.resolveAndTrack).not.toHaveBeenCalled();
    });
  });
});
