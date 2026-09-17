// * NestJS 테스트 모듈 기능
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

// * 약관 타입 enum
import { TermType } from '../generated/prisma/enums';

// * 테스트 대상 Controller
import { TermsController } from './terms.controller';

// * Controller가 호출하는 Service mock
import { TermsService } from './terms.service';

describe('TermsController', () => {
  let controller: TermsController;

  // * TermsService mock
  const termsService = {
    findAll: jest.fn(),
    findLatestByType: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TermsController],
      providers: [
        {
          provide: TermsService,
          useValue: termsService,
        },
      ],
    }).compile();

    controller = module.get<TermsController>(TermsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /terms', () => {
    it('TermsService.findAll을 호출', async () => {
      const terms = [{ id: 'term-1', type: TermType.TERMS_OF_SERVICE }];
      termsService.findAll.mockResolvedValue(terms);

      await expect(controller.findAll()).resolves.toEqual(terms);
      expect(termsService.findAll).toHaveBeenCalled();
    });
  });

  describe('GET /terms/:type', () => {
    it('유효한 type이면 findLatestByType을 호출', async () => {
      const term = { id: 'term-1', type: TermType.PRIVACY_POLICY };
      termsService.findLatestByType.mockResolvedValue(term);

      await expect(
        controller.findLatestByType('privacy_policy'),
      ).resolves.toEqual(term);
      expect(termsService.findLatestByType).toHaveBeenCalledWith(
        TermType.PRIVACY_POLICY,
      );
    });

    it('잘못된 type이면 BadRequestException을 던짐', async () => {
      await expect(
        controller.findLatestByType('invalid'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(termsService.findLatestByType).not.toHaveBeenCalled();
    });
  });
});
