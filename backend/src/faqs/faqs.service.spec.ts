// * NestJS 테스트 모듈 기능
import { Test, TestingModule } from '@nestjs/testing';

// * PrismaService mock을 주입하기 위한 토큰
import { PrismaService } from '../prisma/prisma.service';

// * 테스트 대상 Service
import { FaqsService } from './faqs.service';

describe('FaqsService', () => {
  let service: FaqsService;

  // * Prisma faq 모델 mock
  const prisma = {
    faq: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaqsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<FaqsService>(FaqsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('활성 FAQ 목록을 반환한다', async () => {
      const faqs = [
        {
          id: 'faq-1',
          question: '단축 URL은 무료인가요?',
          answer: '네, 기본 기능은 무료입니다.',
          category: '일반',
          sortOrder: 1,
          updatedAt: new Date(),
        },
      ];
      prisma.faq.findMany.mockResolvedValue(faqs);

      await expect(service.findAll()).resolves.toEqual(faqs);
      expect(prisma.faq.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it('category가 있으면 필터링한다', async () => {
      prisma.faq.findMany.mockResolvedValue([]);

      await service.findAll('계정');

      expect(prisma.faq.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isActive: true,
            category: '계정',
          },
        }),
      );
    });
  });
});
