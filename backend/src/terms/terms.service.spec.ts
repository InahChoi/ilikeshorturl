// * NestJS 테스트 모듈 기능
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

// * 약관 타입 enum
import { TermType } from '../generated/prisma/enums';

// * PrismaService mock을 주입하기 위한 토큰
import { PrismaService } from '../prisma/prisma.service';

// * 테스트 대상 Service
import { TermsService } from './terms.service';

describe('TermsService', () => {
  let service: TermsService;

  // * Prisma term 모델 mock
  const prisma = {
    term: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TermsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<TermsService>(TermsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('활성 약관 목록을 반환한다', async () => {
      const terms = [
        {
          id: 'term-1',
          type: TermType.TERMS_OF_SERVICE,
          title: '서비스 이용약관',
          content: '내용',
          version: '1.0',
          publishedAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      prisma.term.findMany.mockResolvedValue(terms);

      await expect(service.findAll()).resolves.toEqual(terms);
      expect(prisma.term.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });
  });

  describe('findLatestByType', () => {
    it('타입별 최신 약관을 반환한다', async () => {
      const term = {
        id: 'term-1',
        type: TermType.PRIVACY_POLICY,
        title: '개인정보처리방침',
        content: '내용',
        version: '1.0',
        publishedAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.term.findFirst.mockResolvedValue(term);

      await expect(
        service.findLatestByType(TermType.PRIVACY_POLICY),
      ).resolves.toEqual(term);
    });

    it('약관이 없으면 NotFoundException을 던진다', async () => {
      prisma.term.findFirst.mockResolvedValue(null);

      await expect(
        service.findLatestByType(TermType.TERMS_OF_SERVICE),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
